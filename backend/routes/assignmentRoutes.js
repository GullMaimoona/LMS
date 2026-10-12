const express = require("express");
const router = express.Router();
const Assignment = require("../models/Assignment");
const Course = require("../models/Course");
const Student = require("../models/Student");
const { protect, allowRoles } = require("../middleware/authMiddleware");

router.get("/mine", protect, allowRoles("student"), async (req, res) => {
  try {
    const student = await Student.findOne({ email: req.user.email?.toLowerCase() });
    if (!student) return res.json([]);
    const legacyCourseIds = student.course && student.course !== "Unassigned"
      ? await Course.find({ $or: [{ code: student.course }, { name: student.course }] }).distinct("_id")
      : [];
    const courseIds = [...new Set([...(student.courses || []).map(String), ...(student.courseId ? [String(student.courseId)] : []), ...legacyCourseIds.map(String)])];
    const assignments = await Assignment.find({ course: { $in: courseIds }, $or: [{ targetStudent: null }, { targetStudent: student._id }] }).populate("course", "name code").sort({ dueDate: 1, createdAt: -1 }).lean();
    res.json(assignments.map((assignment) => ({ ...assignment, mySubmission: assignment.submissions.find((submission) => String(submission.student) === String(student._id)) || null })));
  } catch (error) {
    res.status(500).json({ message: "Could not load assignments" });
  }
});

router.get("/", protect, allowRoles("teacher"), async (req, res) => {
  try {
    const assignments = await Assignment.find({ teacher: req.user.id }).populate("course", "name code").populate("targetStudent", "firstName lastName").populate("submissions.student", "firstName lastName email").sort({ createdAt: -1 });
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: "Could not load assignments" });
  }
});

router.post("/", protect, allowRoles("teacher"), async (req, res) => {
  try {
    const title = String(req.body?.title || "").trim();
    const course = await Course.findOne({ _id: req.body?.courseId, teacher: req.user.id });
    if (!title || !course) return res.status(400).json({ message: "Enter a title and choose one of your courses" });
    let targetStudent = null;
    if (req.body.studentId) {
      targetStudent = await Student.findById(req.body.studentId);
      const assigned = targetStudent && ([...(targetStudent.courses || []), targetStudent.courseId].filter(Boolean).some((id) => String(id) === String(course._id)) || [course.code, course.name].includes(targetStudent.course));
      if (!assigned) return res.status(400).json({ message: "Select a student enrolled in this course" });
    }
    const assignment = await Assignment.create({ title, description: String(req.body.description || "").trim(), course: course._id, teacher: req.user.id, targetStudent: targetStudent?._id || null, dueDate: req.body.dueDate || null });
    await assignment.populate(["course", "targetStudent"]);
    res.status(201).json(assignment);
  } catch (error) {
    res.status(400).json({ message: "Could not create assignment" });
  }
});

router.post("/:id/submit", protect, allowRoles("student"), async (req, res) => {
  try {
    const answer = String(req.body?.answer || "").trim();
    if (!answer) return res.status(400).json({ message: "Write your answer before submitting" });
    const student = await Student.findOne({ email: req.user.email?.toLowerCase() });
    if (!student) return res.status(404).json({ message: "Student profile not found" });
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });
    if (assignment.targetStudent && String(assignment.targetStudent) !== String(student._id)) return res.status(403).json({ message: "This assignment is assigned to another student" });
    const assigned = [...(student.courses || []), student.courseId].filter(Boolean).some((id) => String(id) === String(assignment.course));
    if (!assigned) {
      const course = await Course.findById(assignment.course);
      if (!course || ![course.code, course.name].includes(student.course)) return res.status(403).json({ message: "This assignment is not for your course" });
    }
    const existing = assignment.submissions.find((submission) => String(submission.student) === String(student._id));
    if (existing) { existing.answer = answer; existing.submittedAt = new Date(); }
    else assignment.submissions.push({ student: student._id, answer, submittedAt: new Date() });
    await assignment.save();
    res.json({ message: "Assignment submitted successfully", submittedAt: existing?.submittedAt || new Date() });
  } catch (error) {
    res.status(400).json({ message: "Could not submit assignment" });
  }
});

module.exports = router;
