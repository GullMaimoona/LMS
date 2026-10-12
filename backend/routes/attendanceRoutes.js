const express = require("express");
const router = express.Router();

const Attendance = require("../models/Attendance");
const Student = require("../models/Student");
const Course = require("../models/Course");
const { protect, allowRoles } = require("../middleware/authMiddleware");

const isValidDate = (value) =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

router.get("/mine", protect, allowRoles("student"), async (req, res) => {
  try {
    const student = await Student.findOne({ email: req.user.email?.toLowerCase() });
    if (!student) return res.json([]);

    const records = await Attendance.find({ student: student._id })
      .sort({ date: -1 })
      .limit(100);
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: "Could not load attendance history" });
  }
});

router.get("/", protect, allowRoles("admin", "teacher"), async (req, res) => {
  const date = req.query.date;
  if (!isValidDate(date)) {
    return res.status(400).json({ message: "A date in YYYY-MM-DD format is required" });
  }

  try {
    let query = { date };
    if (req.user.role === "teacher") {
      const courses = await Course.find({ teacher: req.user.id }).select("_id code name");
      const roster = await Student.find({ $or: [
        { courses: { $in: courses.map((course) => course._id) } },
        { courseId: { $in: courses.map((course) => course._id) } },
        { course: { $in: courses.flatMap((course) => [course.code, course.name]) } },
      ] }).select("_id");
      query.student = { $in: roster.map((student) => student._id) };
    }
    const records = await Attendance.find(query)
      .populate("student", "firstName lastName email course")
      .sort({ createdAt: 1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: "Could not load attendance records" });
  }
});

router.put("/", protect, allowRoles("teacher"), async (req, res) => {
  const { studentId, date, status } = req.body;
  if (!studentId || !isValidDate(date) || !["present", "absent", "late"].includes(status)) {
    return res.status(400).json({ message: "Student, valid date, and attendance status are required" });
  }

  try {
    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: "Student not found" });
    const courses = await Course.find({ teacher: req.user.id }).select("_id code name");
    const belongsToTeacher = courses.some((course) =>
      [...(student.courses || []), student.courseId].filter(Boolean).some((id) => String(id) === String(course._id)) || student.course === course.code || student.course === course.name
    );
    if (!belongsToTeacher) return res.status(403).json({ message: "This student is not assigned to your courses" });

    const record = await Attendance.findOneAndUpdate(
      { student: studentId, date },
      { status, markedBy: req.user.id },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.json(record);
  } catch (error) {
    res.status(400).json({ message: "Could not save attendance" });
  }
});

module.exports = router;
