const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();

const User = require("../models/User");
const Course = require("../models/Course");
const { protect, allowRoles } = require("../middleware/authMiddleware");

router.use(protect, allowRoles("admin"));

router.get("/", async (_req, res) => {
  try {
    const teachers = await User.find({ role: "teacher" }).select("name email").sort({ name: 1 });
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ message: "Could not load teachers" });
  }
});

router.post("/", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (!name || !email || password.length < 8) {
    return res.status(400).json({ message: "Name, email, and a password of at least 8 characters are required" });
  }

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: "This email is already registered" });
    const hashedPassword = await bcrypt.hash(password, 10);
    const teacher = await User.create({ name, email, password: hashedPassword, role: "teacher" });
    res.status(201).json({ id: teacher._id, name: teacher.name, email: teacher.email });
  } catch (error) {
    res.status(400).json({ message: error.code === 11000 ? "This email is already registered" : "Could not create teacher" });
  }
});

router.put("/:id", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (!name || !email || (password && password.length < 8)) {
    return res.status(400).json({ message: "Name and email are required; a new password must be at least 8 characters" });
  }

  try {
    const teacher = await User.findOne({ _id: req.params.id, role: "teacher" });
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });
    const duplicate = await User.findOne({ email, _id: { $ne: teacher._id } });
    if (duplicate) return res.status(409).json({ message: "This email is already registered" });

    teacher.name = name;
    teacher.email = email;
    if (password) teacher.password = await bcrypt.hash(password, 10);
    await teacher.save();
    res.json({ id: teacher._id, name: teacher.name, email: teacher.email });
  } catch (error) {
    res.status(400).json({ message: error.code === 11000 ? "This email is already registered" : "Could not update teacher" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const teacher = await User.findOne({ _id: req.params.id, role: "teacher" });
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });
    const assignedCourses = await Course.countDocuments({ teacher: teacher._id });
    if (assignedCourses) return res.status(409).json({ message: "Reassign this teacher's courses before deleting the account" });
    await teacher.deleteOne();
    res.json({ message: "Teacher deleted" });
  } catch (error) {
    res.status(400).json({ message: "Could not delete teacher" });
  }
});

module.exports = router;
