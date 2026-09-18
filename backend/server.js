require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const classroomRoutes = require('./routes/classroomRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// --- Core middleware ---
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim());

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true, // required so the httpOnly refresh-token cookie is sent/received
  })
);
app.use(express.json());
app.use(cookieParser());

// --- Health check ---
app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok' }));

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/classrooms', classroomRoutes);

// --- 404 + error handling (must be last) ---
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Gurukul API listening on http://localhost:${PORT}`);
  });
}

start();

module.exports = app;
