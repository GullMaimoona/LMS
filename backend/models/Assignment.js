const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: "" },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  targetStudent: { type: mongoose.Schema.Types.ObjectId, ref: "Student", default: null },
  dueDate: { type: Date, default: null },
  submissions: [{
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    answer: { type: String, required: true, trim: true },
    submittedAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

module.exports = mongoose.model("Assignment", assignmentSchema);
