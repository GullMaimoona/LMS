const authRoutes = require("./routes/authRoutes");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./db");
const studentRoutes = require("./routes/studentRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const gradeRoutes = require("./routes/gradeRoutes");
const courseRoutes = require("./routes/courseRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const assignmentRoutes = require("./routes/assignmentRoutes");


const app = express();

app.use(cors());
app.use(express.json());

// Vercel runs this Express app as a serverless function, so connect to MongoDB
// when a request arrives instead of starting a persistent listener at import.
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    next(error);
  }
});

// Home route
app.get("/", (req, res) => {
  res.send("Student Management API is running!");
});

// Student CRUD routes
app.use("/api/students", studentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/grades", gradeRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/auth", authRoutes);

// Keep the normal local development server while exporting the app for Vercel.
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
