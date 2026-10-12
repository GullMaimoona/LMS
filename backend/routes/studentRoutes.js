const express = require("express");
const router = express.Router();

const Student = require("../models/Student");
const Course = require("../models/Course");
const User = require("../models/User");
const ensureStudentProfile = require("../utils/ensureStudentProfile");
const { protect, allowRoles } = require("../middleware/authMiddleware");

const studentFields = ["firstName", "lastName", "email", "phone", "course", "courseId"];

const pickStudentFields = (body = {}) =>
  Object.fromEntries(
    studentFields
      .filter((field) => body[field] !== undefined)
      .map((field) => [field, body[field]])
  );

// Each student account can only retrieve the student record with its email.
router.get("/me", protect, allowRoles("student"), async (req, res) => {
  try {
    if (!req.user.email) {
      return res.status(401).json({ message: "Please log in again" });
    }

    const student = await Student.findOne({
      email: req.user.email.toLowerCase(),
    }).populate("courseId", "name code description teacher").populate("courses", "name code description teacher");

    if (!student) {
      return res.status(404).json({
        message: "Your student profile has not been added yet. Please contact your administrator.",
      });
    }

    res.json(student);
  } catch (error) {
    res.status(500).json({ message: "Could not load your student profile" });
  }
});

router.put("/me", protect, allowRoles("student"), async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body || {};
    if (!String(firstName || "").trim() || !String(lastName || "").trim() || !String(phone || "").trim()) {
      return res.status(400).json({ message: "Enter your first name, last name, and phone number" });
    }
    const student = await Student.findOneAndUpdate(
      { email: req.user.email.toLowerCase() },
      { firstName: String(firstName).trim(), lastName: String(lastName).trim(), phone: String(phone).trim() },
      { new: true, runValidators: true }
    ).populate("courseId", "name code description teacher").populate("courses", "name code description teacher");
    if (!student) return res.status(404).json({ message: "Student profile not found" });
    await User.findByIdAndUpdate(req.user.id, { name: `${student.firstName} ${student.lastName}` });
    res.json(student);
  } catch (error) {
    res.status(400).json({ message: "Could not update your profile" });
  }
});

// Backfill student profiles for accounts created before automatic profile setup.
router.post("/sync-accounts", protect, allowRoles("admin"), async (_req, res) => {
  try {
    const accounts = await User.find({ role: "student" }).select("name email role");
    await Promise.all(accounts.map((account) => ensureStudentProfile(account)));
    res.json({ message: "Student accounts synced" });
  } catch (error) {
    res.status(500).json({ message: "Could not sync student accounts" });
  }
});

// Administrators manage records; teachers can view the student roster.
router.get("/", protect, allowRoles("admin", "teacher"), async (req, res) => {
  try {
    let query = {};
    if (req.user.role === "teacher") {
      const courses = await Course.find({ teacher: req.user.id }).select("_id code name");
      if (!courses.length) return res.json([]);
      const legacyCourseNames = courses.flatMap((course) => [course.code, course.name]);
      query = {
        $or: [
          { courses: { $in: courses.map((course) => course._id) } },
          { courseId: { $in: courses.map((course) => course._id) } },
          { course: { $in: legacyCourseNames } },
        ],
      };
    }
    const students = await Student.find(query)
      .populate("courseId", "name code")
      .populate("courses", "name code")
      .sort({ lastName: 1, firstName: 1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: "Could not load students" });
  }
});

router.post("/", protect, allowRoles("admin"), async (req, res) => {
  try {
    const values = pickStudentFields(req.body);
    values.email = String(values.email || "").trim().toLowerCase();
    if (values.courseId) {
      const course = await Course.findById(values.courseId);
      if (!course) return res.status(400).json({ message: "Selected course was not found" });
      values.course = course.code;
    }
    const existingStudent = await Student.exists({ email: values.email });
    const update = { $set: values };
    if (values.courseId) update.$addToSet = { courses: values.courseId };
    const student = await Student.findOneAndUpdate(
      { email: values.email },
      update,
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.status(existingStudent ? 200 : 201).json(student);
  } catch (error) {
    res.status(400).json({ message: error.code === 11000 ? "A student with this email already exists. Select the existing student to update their course." : error.message });
  }
});

router.put("/:id", protect, allowRoles("admin"), async (req, res) => {
  try {
    const values = pickStudentFields(req.body);
    if (values.courseId) {
      const course = await Course.findById(values.courseId);
      if (!course) return res.status(400).json({ message: "Selected course was not found" });
      values.course = course.code;
    }
    const update = { $set: values };
    if (values.courseId) update.$addToSet = { courses: values.courseId };
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    );

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json(student);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete("/:id", protect, allowRoles("admin"), async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    await User.deleteOne({ email: student.email.toLowerCase(), role: "student" });
    await student.deleteOne();

    res.json({ message: "Student deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
