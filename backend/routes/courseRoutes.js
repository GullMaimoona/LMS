const express = require("express");
const router = express.Router();

const Course = require("../models/Course");
const Student = require("../models/Student");
const User = require("../models/User");
const Assignment = require("../models/Assignment");
const { protect, allowRoles } = require("../middleware/authMiddleware");

const BSCS_COURSES = new Map([
  ["CS-101", "Programming Fundamentals"],
  ["CS-102", "Discrete Mathematics"],
  ["CS-201", "Object-Oriented Programming"],
  ["CS-202", "Data Structures and Algorithms"],
  ["CS-203", "Computer Organization and Assembly Language"],
  ["CS-301", "Database Systems"],
  ["CS-302", "Operating Systems"],
  ["CS-303", "Computer Networks"],
  ["CS-304", "Software Engineering"],
  ["CS-401", "Theory of Automata"],
  ["CS-402", "Compiler Construction"],
  ["CS-403", "Artificial Intelligence"],
  ["CS-404", "Information Security"],
]);

const getCourseValues = async (body) => {
  const code = String(body.code || "").trim().toUpperCase();
  const name = String(body.name || BSCS_COURSES.get(code) || "").trim();
  const teacherId = body.teacherId || null;
  if (!/^CS-\d{3,4}$/.test(code) || !name) return { error: "Enter a course name and a BSCS course code such as CS-501" };

  let teacher = null;
  if (teacherId) {
    teacher = await User.findOne({ _id: teacherId, role: "teacher" });
    if (!teacher) return { error: "Select a valid teacher account" };
  }

  return { values: { name, code, description: String(body.description || "").trim(), teacher: teacher?._id || null } };
};

router.get("/teachers", protect, allowRoles("admin"), async (_req, res) => {
  try {
    const teachers = await User.find({ role: "teacher" }).select("name email").sort({ name: 1 });
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ message: "Could not load teachers" });
  }
});

router.get("/", protect, async (req, res) => {
  try {
    let courses;
    if (req.user.role === "admin") {
      courses = await Course.find().populate("teacher", "name email").sort({ name: 1 });
    } else if (req.user.role === "teacher") {
      courses = await Course.find({ teacher: req.user.id }).populate("teacher", "name email").sort({ name: 1 });
    } else {
      const student = await Student.findOne({ email: req.user.email?.toLowerCase() });
      if (!student) return res.json([]);
      const courseFilter = [{ code: student.course }, { name: student.course }];
      if (student.courseId) courseFilter.unshift({ _id: student.courseId });
      if (student.courses?.length) courseFilter.unshift({ _id: { $in: student.courses } });
      courses = await Course.find({ $or: courseFilter }).populate("teacher", "name email").sort({ name: 1 });
    }
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: "Could not load courses" });
  }
});

router.post("/catalog", protect, allowRoles("admin"), async (_req, res) => {
  try {
    let added = 0;
    for (const [code, name] of BSCS_COURSES) {
      const result = await Course.updateOne(
        { code },
        { $setOnInsert: { code, name, description: "", teacher: null } },
        { upsert: true }
      );
      if (result.upsertedCount) added += 1;
    }
    res.json({ added, total: BSCS_COURSES.size, message: added ? `${added} BSCS subjects added to the catalog` : "The BSCS catalog is already in place" });
  } catch (error) {
    res.status(400).json({ message: "Could not add the BSCS course catalog" });
  }
});

router.post("/", protect, allowRoles("admin"), async (req, res) => {
  try {
    const { values, error } = await getCourseValues(req.body || {});
    if (error) return res.status(400).json({ message: error });
    const course = await Course.create(values);
    res.status(201).json(course);
  } catch (error) {
    res.status(400).json({ message: error.code === 11000 ? "Course code already exists" : error.message });
  }
});

router.put("/:id/students", protect, allowRoles("admin"), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });
    const studentIds = Array.isArray(req.body?.studentIds) ? [...new Set(req.body.studentIds.map(String))] : null;
    if (!studentIds) return res.status(400).json({ message: "Choose the students to enroll in this course" });

    const selectedStudents = await Student.find({ _id: { $in: studentIds } });
    if (selectedStudents.length !== studentIds.length) return res.status(400).json({ message: "One or more selected students were not found" });

    const existingMembers = await Student.find({ $or: [
      { courses: course._id },
      { courseId: course._id },
      { course: { $in: [course.code, course.name] } },
    ] });
    const selectedSet = new Set(studentIds);
    const otherCourseIds = new Set();
    for (const student of [...existingMembers, ...selectedStudents]) {
      const ids = [...(student.courses || []), ...(student.courseId ? [student.courseId] : [])];
      for (const id of ids) otherCourseIds.add(String(id));
      if (!student.courseId && student.course && student.course !== "Unassigned") {
        const legacyCourse = await Course.findOne({ $or: [{ code: student.course }, { name: student.course }] }).select("_id");
        if (legacyCourse) otherCourseIds.add(String(legacyCourse._id));
      }
    }
    otherCourseIds.delete(String(course._id));
    const otherCourses = await Course.find({ _id: { $in: [...otherCourseIds] } }).select("_id code");
    const otherCourseCodes = new Map(otherCourses.map((item) => [String(item._id), item.code]));

    await Promise.all(existingMembers.filter((student) => !selectedSet.has(String(student._id))).map(async (student) => {
      const remaining = [...new Set([...(student.courses || []).map(String), ...(student.courseId ? [String(student.courseId)] : [])])].filter((id) => id !== String(course._id));
      const primary = remaining[0] || null;
      await Student.updateOne({ _id: student._id }, { $set: {
        courses: remaining,
        courseId: primary,
        course: primary ? (otherCourseCodes.get(primary) || student.course) : "Unassigned",
      } });
    }));

    await Promise.all(selectedStudents.map(async (student) => {
      const ids = [...new Set([...(student.courses || []).map(String), ...(student.courseId ? [String(student.courseId)] : [])])];
      if (!student.courseId && student.course && student.course !== "Unassigned") {
        const legacyCourse = await Course.findOne({ $or: [{ code: student.course }, { name: student.course }] }).select("_id");
        if (legacyCourse) ids.push(String(legacyCourse._id));
      }
      if (!ids.includes(String(course._id))) ids.push(String(course._id));
      const alreadyHadCourse = Boolean(student.courseId) || (student.course && student.course !== "Unassigned");
      await Student.updateOne({ _id: student._id }, { $set: {
        courses: [...new Set(ids)],
        ...(!alreadyHadCourse ? { courseId: course._id, course: course.code } : {}),
      } });
    }));
    res.json({ message: `${studentIds.length} student${studentIds.length === 1 ? "" : "s"} assigned to ${course.name}`, assigned: studentIds.length });
  } catch (error) {
    res.status(400).json({ message: error.message || "Could not assign students to this course" });
  }
});

router.put("/:id", protect, allowRoles("admin"), async (req, res) => {
  try {
    const { values, error } = await getCourseValues(req.body || {});
    if (error) return res.status(400).json({ message: error });
    const course = await Course.findByIdAndUpdate(req.params.id, values, { new: true, runValidators: true })
      .populate("teacher", "name email");
    if (!course) return res.status(404).json({ message: "Course not found" });
    res.json(course);
  } catch (error) {
    res.status(400).json({ message: error.code === 11000 ? "Course code already exists" : error.message });
  }
});

router.delete("/:id", protect, allowRoles("admin"), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const enrolledStudents = await Student.find({ $or: [
      { courses: course._id },
      { courseId: course._id },
      { course: { $in: [course.code, course.name] } },
    ] });
    for (const student of enrolledStudents) {
      const remainingIds = [...new Set([...(student.courses || []).map(String), ...(student.courseId ? [String(student.courseId)] : [])])]
        .filter((id) => id !== String(course._id));
      if (!remainingIds.length && !student.courseId && student.course && student.course !== "Unassigned" && ![course.code, course.name].includes(student.course)) {
        const legacy = await Course.findOne({ $or: [{ code: student.course }, { name: student.course }] }).select("_id");
        if (legacy) remainingIds.push(String(legacy._id));
      }
      const remainingCourses = await Course.find({ _id: { $in: remainingIds } }).select("_id code");
      const primaryId = remainingIds.includes(String(student.courseId)) ? String(student.courseId) : remainingIds[0] || null;
      const primary = remainingCourses.find((item) => String(item._id) === String(primaryId));
      await Student.updateOne({ _id: student._id }, { $set: {
        courses: remainingIds,
        courseId: primary?._id || null,
        course: primary?.code || "Unassigned",
      } });
    }
    const unassignedStudents = enrolledStudents.filter((student) => {
      const remaining = [...(student.courses || []).map(String), ...(student.courseId ? [String(student.courseId)] : [])].filter((id) => id !== String(course._id));
      return remaining.length === 0;
    }).length;
    const { deletedCount: deletedAssignments } = await Assignment.deleteMany({ course: course._id });
    await course.deleteOne();
    res.json({ message: "Course deleted", unassignedStudents, deletedAssignments });
  } catch (error) {
    res.status(400).json({ message: "Could not delete course" });
  }
});

module.exports = router;
