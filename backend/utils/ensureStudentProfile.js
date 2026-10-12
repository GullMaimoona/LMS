const Student = require("../models/Student");

const ensureStudentProfile = async (user) => {
  if (!user || user.role !== "student") return null;

  const nameParts = String(user.name || "").trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts.shift() || "Student";
  const lastName = nameParts.join(" ") || "Student";

  return Student.findOneAndUpdate(
    { email: user.email.toLowerCase() },
    {
      $setOnInsert: {
        firstName,
        lastName,
        phone: "Not provided",
        course: "Unassigned",
      },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
};

module.exports = ensureStudentProfile;
