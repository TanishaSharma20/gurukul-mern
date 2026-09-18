# Gurukul — MERN Learning Platform

A full-stack learning platform built with MongoDB, Express, React, and Node.js. Teachers can create classrooms and manage materials, while students request access and view course contents once approved. Features secure authentication with JWT access tokens and rotating httpOnly refresh cookies.

## Tech Stack
* **Frontend**: React (Vite), Axios, Tailwind CSS / Custom CSS
* **Backend**: Node.js, Express.js, REST API
* **Database & Auth**: MongoDB (Mongoose), JWT, Bcrypt

---

## Essential Features
* **Role-Based Access (RBAC)**: Enforces `teacher` and `student` roles across protected API routes.
* **Approval Workflow**: Students request classroom access; teachers approve or reject requests.
* **Instant Revocation**: Database checks occur on material access requests so revoking access takes effect immediately.
* **Per-Device Sessions & Rotation**: Refresh tokens rotate on every request to detect token theft and allow single-device logouts.

---

## Quick Start
```bash
# Backend
cd backend && npm install && npm run dev

# Frontend
cd frontend && npm install && npm run dev
```
## Application Walkthrough & Workflow

### 1. Authentication
| Login Page | Registration Page |
| :---: | :---: |
| ![Login Page](./screenshots/login_page.png) | ![Registration Page](./screenshots/registration_page.png) |

---

### 2. Dashboard Overview
| Student Dashboard | Teacher Dashboard View 1 | Teacher Dashboard View 2 |
| :---: | :---: | :---: |
| ![Student Dashboard](./screenshots/student_dashboard.png) | ![Teacher Dashboard 1](./screenshots/teacher's_dashboard1.png) | ![Teacher Dashboard 2](./screenshots/teacher_dashboard2.png) |

---

### 3. Student Join Request Flow
| Request to Join Classroom | Request Pending Status |
| :---: | :---: |
| ![Join Request](./screenshots/student_request_to_join_classroom.png) | ![Pending Status](./screenshots/student_request_status.png) |

---

### 4. Teacher Approval Flow
| Pending Join Requests | Request Approval Screen |
| :---: | :---: |
| ![Pending Requests](./screenshots/teacher_dashboard_after_student_request_to_join.png) | ![Approve Request](./screenshots/teacher_dashboard_request_to_approve.png) |

---

### 5. Access Granted Flow
| Approved Classroom View (Teacher) | Approved Status View (Student) |
| :---: | :---: |
| ![Approved Teacher View](./screenshots/teacher_dashboard_after_approving.png) | ![Approved Student View](./screenshots/student_dashboard_status_approved.png) |
