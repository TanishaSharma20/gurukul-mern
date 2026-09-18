/**
 * Optional helper: creates one demo teacher, one demo student, and one
 * classroom so you have something to click around immediately.
 * Run with: npm run seed
 */
require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');
const Classroom = require('../models/Classroom');
const mongoose = require('mongoose');

async function seed() {
  await connectDB();

  await User.deleteMany({ email: { $in: ['teacher@gurukul.dev', 'student@gurukul.dev'] } });
  await Classroom.deleteMany({ name: 'Demo Classroom' });

  const teacher = await User.create({
    name: 'Demo Teacher',
    email: 'teacher@gurukul.dev',
    password: 'password123',
    role: 'teacher',
  });

  const student = await User.create({
    name: 'Demo Student',
    email: 'student@gurukul.dev',
    password: 'password123',
    role: 'student',
  });

  await Classroom.create({
    name: 'Demo Classroom',
    description: 'A sample classroom created by the seed script.',
    teacher: teacher._id,
  });

  console.log('Seed complete:');
  console.log('  Teacher login -> teacher@gurukul.dev / password123');
  console.log('  Student login -> student@gurukul.dev / password123');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
