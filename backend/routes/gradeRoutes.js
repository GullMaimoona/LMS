const express = require("express");
const router = express.Router();

const Grade = require("../models/Grade");
const Student = require("../models/Student");
const Course = require("../models/Course");
const { protect, allowRoles } = require("../middleware/authMiddleware");

const isEnrolledInCourse = (student, course) =>
  [...(student.courses || []), student.courseId].filter(Boolean).some((id) => String(id) === String(course._id)) ||
  student.course === course.code || student.course === course.name;

const parseGrade = (body = {}) => {
  const score = Number(body.score);
  const maxScore = Number(body.maxScore);
  if (
    !body.studentId ||
    !String(body.title || "").trim() ||
    !String(body.course || "").trim() ||
    !Number.isFinite(score) ||
    !Number.isFinite(maxScore) ||
    maxScore <= 0 ||
    score < 0 ||
    score > maxScore
  ) return null;

  return {
    student: body.studentId,
    title: String(body.title).trim(),
    course: String(body.course).trim(),
    courseId: body.courseId || null,
    score,
    maxScore,
  };
};

router.get("/mine", protect, allowRoles("student"), async (req, res) => {
  try {
    const student = await Student.findOne({ email: req.user.email?.toLowerCase() });
    if (!student) return res.json([]);

    const grades = await Grade.find({ student: student._id }).sort({ createdAt: -1 });
    res.json(grades);
  } catch (error) {
    res.status(500).json({ message: "Could not load your results" });
  }
});

router.get("/", protect, allowRoles("admin", "teacher"), async (req, res) => {
  try {
    let query = {};
    if (req.user.role === "teacher") {
      const courses = await Course.find({ teacher: req.user.id }).select("_id code name");
      const roster = await Student.find({ $or: [
        { courses: { $in: courses.map((course) => course._id) } },
        { courseId: { $in: courses.map((course) => course._id) } },
        { course: { $in: courses.flatMap((course) => [course.code, course.name]) } },
      ] }).select("_id");
      query = { student: { $in: roster.map((student) => student._id) } };
    }
    const grades = await Grade.find(query)
      .populate("student", "firstName lastName email course")
      .populate("courseId", "name code")
      .sort({ createdAt: -1 });
    res.json(grades);
  } catch (error) {
    res.status(500).json({ message: "Could not load results" });
  }
});

router.post("/", protect, allowRoles("teacher"), async (req, res) => {
  const values = parseGrade(req.body);
  if (!values) return res.status(400).json({ message: "Enter a student, assessment, course, and a valid score" });

  try {
    const student = await Student.findById(values.student);
    if (!student) return res.status(404).json({ message: "Student not found" });
    const course = await Course.findOne({ _id: values.courseId, teacher: req.user.id });
    if (!course || !isEnrolledInCourse(student, course)) {
      return res.status(403).json({ message: "Select a course and student assigned to you" });
    }
    values.course = course.code;

    const grade = await Grade.create({ ...values, gradedBy: req.user.id });
    res.status(201).json(grade);
  } catch (error) {
    res.status(400).json({ message: "Could not save result" });
  }
});

router.put("/:id", protect, allowRoles("teacher"), async (req, res) => {
  const values = parseGrade(req.body);
  if (!values) return res.status(400).json({ message: "Enter a student, assessment, course, and a valid score" });

  try {
    const student = await Student.findById(values.student);
    if (!student) return res.status(404).json({ message: "Student not found" });
    const course = await Course.findOne({ _id: values.courseId, teacher: req.user.id });
    if (!course || !isEnrolledInCourse(student, course)) {
      return res.status(403).json({ message: "Select a course and student assigned to you" });
    }
    values.course = course.code;

    const grade = await Grade.findOneAndUpdate(
      { _id: req.params.id, gradedBy: req.user.id },
      { ...values, gradedBy: req.user.id },
      { new: true, runValidators: true }
    );
    if (!grade) return res.status(404).json({ message: "Result not found" });
    res.json(grade);
  } catch (error) {
    res.status(400).json({ message: "Could not update result" });
  }
});

router.delete("/:id", protect, allowRoles("teacher"), async (req, res) => {
  try {
    const grade = await Grade.findOneAndDelete({ _id: req.params.id, gradedBy: req.user.id });
    if (!grade) return res.status(404).json({ message: "Result not found" });
    res.json({ message: "Result deleted" });
  } catch (error) {
    res.status(400).json({ message: "Could not delete result" });
  }
});

module.exports = router;
