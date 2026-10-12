require("dotenv").config();
const bcrypt = require("bcryptjs");
const connectDB = require("../db");
const User = require("../models/User");

const createAdmin = async () => {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

  if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("Set ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD first.");
  }

  if (ADMIN_PASSWORD.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters long.");
  }

  await connectDB();
  const email = ADMIN_EMAIL.toLowerCase().trim();
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    if (existingUser.role === "admin") {
      console.log(`Admin account already exists for ${email}.`);
      return;
    }
    throw new Error(`An account already exists for ${email}; no role was changed.`);
  }

  const password = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await User.create({ name: ADMIN_NAME.trim(), email, password, role: "admin" });
  console.log(`Admin account created for ${email}.`);
};

createAdmin()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    const mongoose = require("mongoose");
    await mongoose.disconnect();
  });
