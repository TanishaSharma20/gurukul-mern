# Gurukul

A full-stack MERN learning platform, similar to Google Classroom. Teachers create
classrooms and upload materials; students request to join, and can only see materials
once a teacher approves them. Built with MongoDB, Express, React, and Node, secured
with JWT access + refresh tokens.

This implementation follows the design decisions laid out in `GURUKUL_RELATED_QUESTIONS.pdf`
end to end — not just the happy path, but the harder scenarios it raises (session
hijacking, revoked access, multi-device logout, etc). See **"How this maps to the
project questions"** near the bottom for exactly where each answer lives in the code.

## Tech stack

MongoDB · Express.js · React (Vite) · Node.js · Mongoose · JWT · REST API

## Project structure

```
gurukul/
  backend/            Express API
    config/db.js          MongoDB connection
    models/                User, Classroom, Material, RefreshToken
    middleware/            auth (protect/authorize), validation, rate limiting, errors
    controllers/            auth, classroom, material logic
    routes/                 authRoutes, classroomRoutes
    utils/                  token helpers, seed script
    server.js               app entry point
  frontend/           React app (Vite)
    src/
      api/                  axios instance + interceptor, token store, API calls
      context/AuthContext   current-user state, login/register/logout
      components/           Sidebar, AppShell, PrivateRoute, StatusBadge
      pages/                Login, Register, Dashboard, TeacherDashboard,
                             StudentDashboard, ClassroomDetail
```

## Features

- **Auth**: register/login with bcrypt-hashed passwords, JWT access tokens (15 min)
  + rotating JWT refresh tokens (7 days) in an httpOnly cookie.
- **RBAC**: two roles, `teacher` and `student`, enforced by an `authorize()` middleware
  on every route that needs it.
- **Classrooms**: teachers create/edit/delete classrooms; students browse all
  classrooms and request to join.
- **Approval flow**: join requests start `pending`; a teacher approves or rejects
  them; only `approved` students can see a classroom's materials.
- **Materials**: teachers upload materials (title, description, optional link);
  access is re-checked against the database on every request, not just the JWT,
  so revoking a student's access takes effect immediately.
- **Refresh token rotation**: every refresh issues a brand-new refresh token and
  invalidates the old one. If an old (already-rotated-away) token is ever
  presented again, the server treats that as theft and logs the user out
  everywhere.
- **Per-device sessions**: refresh tokens are stored per device, so a user can be
  logged in on a laptop and a phone independently, and either device can be
  revoked without touching the other (`GET/DELETE /api/auth/sessions`).
- **Rate limiting** on login, register, and refresh endpoints.
- **Input validation** on all write endpoints via `express-validator`.

## Getting started

### Prerequisites

- Node.js 18+
- A MongoDB database — either:
  - a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster, or
  - a local `mongod` (install via your OS package manager, or `docker run -p 27017:27017 mongo`)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and set `MONGO_URI` to your database connection string, and set
`JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` to two long random strings. You can
generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Then start the API:

```bash
npm run dev      # nodemon, restarts on file changes
# or
npm start
```

It listens on `http://localhost:5000` by default. Check `http://localhost:5000/api/health`
returns `{"status":"ok"}`.

Optional: seed a demo teacher, student, and classroom:

```bash
npm run seed
```

This creates:
- `teacher@gurukul.dev` / `password123`
- `student@gurukul.dev` / `password123`

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`. Register a teacher account and a student account (or
use the seeded demo accounts above) to try the full flow:

1. Log in as the teacher, create a classroom.
2. Log in as the student (a different browser or an incognito window works well,
   since each browser gets its own session cookie), browse classrooms, request to join.
3. Back as the teacher, approve the request.
4. Back as the student, open the classroom and see the materials.
5. As the teacher, add a material or remove the student's access, and see it
   reflected immediately.

## API overview

All routes are prefixed with `/api`.

| Method | Route | Who | Purpose |
|---|---|---|---|
| POST | `/auth/register` | anyone | create an account, starts a session |
| POST | `/auth/login` | anyone | log in, starts a session |
| POST | `/auth/refresh` | anyone (with a valid refresh cookie) | silently rotate to a new access token |
| POST | `/auth/logout` | anyone | end the current device's session |
| GET | `/auth/me` | authenticated | current user |
| GET | `/auth/sessions` | authenticated | list this user's active devices |
| DELETE | `/auth/sessions/:deviceId` | authenticated | force-logout one device |
| POST | `/classrooms` | teacher | create a classroom |
| GET | `/classrooms/mine` | teacher | classrooms you own |
| GET | `/classrooms` | authenticated | browse all classrooms |
| GET | `/classrooms/:id` | authenticated | classroom detail |
| PATCH | `/classrooms/:id` | teacher, owner | update name/description |
| DELETE | `/classrooms/:id` | teacher, owner | delete a classroom |
| POST | `/classrooms/:id/join` | student | request to join |
| GET | `/classrooms/:id/requests` | teacher, owner | list join requests |
| PUT | `/classrooms/:id/requests/:studentId` | teacher, owner | approve/reject a request |
| DELETE | `/classrooms/:id/students/:studentId` | teacher, owner | revoke a student's access |
| POST | `/classrooms/:id/materials` | teacher, owner | add a material |
| GET | `/classrooms/:id/materials` | approved student or owner | list materials |
| DELETE | `/classrooms/:classroomId/materials/:materialId` | teacher, owner | delete a material |

## How this maps to the project questions

| PDF question | Where it lives |
|---|---|
| Q9–11: JWT structure & how it's verified | `utils/generateTokens.js`, `middleware/auth.js` |
| Q13–14: RBAC & middleware chain | `middleware/auth.js` (`protect` then `authorize`) |
| Q16: student approval flow | `controllers/classroomController.js` (`requestToJoin`, `decideJoinRequest`) |
| Q17–18: access vs refresh token storage | `controllers/authController.js` (`issueSession`), `frontend/src/api/tokenStore.js` |
| Q19–21: Axios interceptor + `_retry` flag | `frontend/src/api/axios.js` |
| Q22–23: httpOnly cookie / XSS | `issueSession()` cookie options in `authController.js` |
| Q26: force-logout one device | `RefreshToken` model's `(user, deviceId)` index + `revokeSession` |
| Q28: revoked access takes effect immediately | `controllers/materialController.js` (`listMaterials` re-checks the DB, not the JWT) |
| Q29: refresh token theft detection via rotation | `controllers/authController.js` (`refresh` — hash mismatch triggers a full logout) |
| Q30: rate limiting, validation | `middleware/rateLimiters.js`, `middleware/validate.js` + route-level validators |

## Notes on production-hardening further

This project already implements refresh-token rotation, rate limiting, and input
validation. If deploying for real, also add: HTTPS everywhere (cookies are marked
`secure` automatically once `NODE_ENV=production`), a proper file-storage backend
for materials (S3/Cloudinary) instead of the `resourceUrl` text field, and — as Q30
suggests — two-factor authentication for teacher accounts given their elevated access.
