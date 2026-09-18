const mongoose = require('mongoose');

/**
 * Connects to MongoDB using the URI in MONGO_URI.
 * Exits the process on failure so the app never runs against a broken DB.
 */
async function connectDB() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error('MONGO_URI is not set. Copy .env.example to .env and fill it in.');
    }

    const conn = await mongoose.connect(uri);
    console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    console.error(`MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }
}

module.exports = connectDB;
