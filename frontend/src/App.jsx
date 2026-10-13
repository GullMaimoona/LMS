
import { useCallback, useEffect, useState } from "react";
import "./App.css";

const API_BASE = `${(import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "")}/api`;
const BSCS_COURSES = [
  { code: "CS-101", name: "Programming Fundamentals" },
  { code: "CS-102", name: "Discrete Mathematics" },
  { code: "CS-201", name: "Object-Oriented Programming" },
  { code: "CS-202", name: "Data Structures and Algorithms" },
  { code: "CS-203", name: "Computer Organization and Assembly Language" },
  { code: "CS-301", name: "Database Systems" },
  { code: "CS-302", name: "Operating Systems" },
  { code: "CS-303", name: "Computer Networks" },
  { code: "CS-304", name: "Software Engineering" },
  { code: "CS-401", name: "Theory of Automata" },
  { code: "CS-402", name: "Compiler Construction" },
  { code: "CS-403", name: "Artificial Intelligence" },
  { code: "CS-404", name: "Information Security" },
];
const getLocalDate = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
};

function StudentPortalSection({ section, user, profile, loading, attendanceRecords, attendanceLoading, grades, gradeLoading, courses, courseLoading, assignments, assignmentLoading, profileForm, setProfileForm, onSaveProfile, onSubmitAssignment }) {
  const presentCount = attendanceRecords.filter((item) => item.status === "present").length;
  const attendanceRate = attendanceRecords.length
    ? Math.round((presentCount / attendanceRecords.length) * 100)
    : 0;

  if (section === "profile") {
    return (
      <section className="student-profile-card">
        {loading ? <p>Loading your profile...</p> : profile ? (
          <>
            <div className="profile-avatar">{profile.firstName?.[0]}{profile.lastName?.[0]}</div>
            <div className="profile-heading">
              <span className="welcome-label">STUDENT PROFILE</span>
              <h2>{profile.firstName} {profile.lastName}</h2>
            </div>
            <form className="student-profile-edit" onSubmit={onSaveProfile}>
              <label>First name<input required value={profileForm.firstName} onChange={(event) => setProfileForm({ ...profileForm, firstName: event.target.value })} /></label>
              <label>Last name<input required value={profileForm.lastName} onChange={(event) => setProfileForm({ ...profileForm, lastName: event.target.value })} /></label>
              <label>Email<input value={profile.email} readOnly /></label>
              <label>Phone<input required value={profileForm.phone} onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })} /></label>
              <div><span>Courses</span><strong>{profile.courses?.length ? profile.courses.map((course) => course.name).join(", ") : profile.courseId?.name || profile.course}</strong></div>
              <button className="submit-button" type="submit">Save profile</button>
            </form>
          </>
        ) : <p>Your profile will appear here once an administrator adds your student record.</p>}
      </section>
    );
  }

  if (section === "courses") {
    return <CourseCards courses={courses} loading={courseLoading} student />;
  }

  if (section === "assignments") return <StudentAssignments assignments={assignments} loading={assignmentLoading} onSubmit={onSubmitAssignment} />;

  if (section === "attendance") {
    return (
      <StudentAttendanceTable records={attendanceRecords} loading={attendanceLoading} />
    );
  }

  if (section === "results") {
    return <StudentResultsTable grades={grades} loading={gradeLoading} />;
  }

  return (
    <>
      <section className="student-welcome-card">
        <div>
          <span className="welcome-label">YOUR STUDENT SPACE</span>
          <h2>Welcome back, {user.name.split(" ")[0]}.</h2>
          <p>Check your course and attendance progress from your student portal.</p>
        </div>
        <div className="student-course-summary">
          <span>MY COURSE</span>
          <strong>{profile?.course || "Not assigned yet"}</strong>
        </div>
      </section>
      <div className="student-summary-grid">
        <article><span>Attendance rate</span><strong>{attendanceRecords.length ? `${attendanceRate}%` : "—"}</strong><small>{attendanceRecords.length ? `${presentCount} present days` : "No records yet"}</small></article>
        <article><span>Course</span><strong>{profile?.course || "—"}</strong><small>{profile ? "Currently assigned" : "Contact your administrator"}</small></article>
        <article><span>Attendance entries</span><strong>{attendanceRecords.length}</strong><small>Recorded days</small></article>
      </div>
    </>
  );
}

function StudentAssignments({ assignments, loading, onSubmit }) {
  return <section className="student-attendance-card"><div className="section-title-row"><div><span className="welcome-label course-work-label">COURSE WORK</span><h2>Assignments</h2></div><span className="attendance-total assignment-count">{assignments.length} assignments</span></div>
    {loading ? <p className="empty-state">Loading assignments...</p> : assignments.length ? <div className="assignment-list">{assignments.map((assignment) => <article className="assignment-card" key={assignment._id}>
      <div><h3>{assignment.title}</h3><p>{assignment.course?.name} ({assignment.course?.code})</p><p>{assignment.description || "No extra instructions provided."}</p><small>{assignment.dueDate ? `Due ${new Date(assignment.dueDate).toLocaleDateString()}` : "No due date"}</small></div>
      <form onSubmit={(event) => { event.preventDefault(); onSubmit(assignment._id, event.currentTarget.elements.answer.value); }}><textarea name="answer" required defaultValue={assignment.mySubmission?.answer || ""} placeholder="Write your answer here"/><button className="submit-button" type="submit">{assignment.mySubmission ? "Update submission" : "Submit assignment"}</button>{assignment.mySubmission && <small>Submitted {new Date(assignment.mySubmission.submittedAt).toLocaleString()}</small>}</form>
    </article>)}</div> : <p className="empty-state">No assignments have been posted for your course yet.</p>}
  </section>;
}

function TeacherAssignments({ courses, students, assignments, loading, form, setForm, onSave }) {
  const courseStudents = students.filter((student) => {
    const course = courses.find((item) => item._id === form.courseId);
    return course && ([...(student.courses || []), student.courseId].filter(Boolean).some((item) => String(item?._id || item) === String(course._id)) || student.course === course.code || student.course === course.name);
  });
  return <section className="student-attendance-card teacher-assignments-panel"><div className="section-title-row"><div><span className="welcome-label course-work-label">COURSE WORK</span><h2>Assignments</h2></div></div>
    <form className="student-editor assignment-editor" onSubmit={onSave}><div className="student-fields"><label>Assignment title<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })}/></label><label>Course<select required value={form.courseId} onChange={(event) => setForm({ ...form, courseId: event.target.value, studentId: "" })}><option value="">Select a course</option>{courses.map((course) => <option key={course._id} value={course._id}>{course.name} ({course.code})</option>)}</select></label><label>Assign to student<select value={form.studentId} disabled={!form.courseId} onChange={(event) => setForm({ ...form, studentId: event.target.value })}><option value="">All students in this course</option>{courseStudents.map((student) => <option key={student._id} value={student._id}>{student.firstName} {student.lastName} · {student.email}</option>)}</select></label><label>Due date<input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })}/></label><label className="course-field">Instructions<textarea rows="3" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })}/></label></div><button className="submit-button" type="submit" disabled={!courses.length}>Post assignment</button></form>
    {loading ? <p className="empty-state">Loading assignments...</p> : assignments.length ? <div className="assignment-list">{assignments.map((assignment) => <article className="assignment-card" key={assignment._id}><div><h3>{assignment.title}</h3><p>{assignment.course?.name} ({assignment.course?.code}){assignment.targetStudent ? ` · For ${assignment.targetStudent.firstName} ${assignment.targetStudent.lastName}` : " · All course students"}</p><p>{assignment.description || "No extra instructions."}</p><small>{assignment.dueDate ? `Due ${new Date(assignment.dueDate).toLocaleDateString()}` : "No due date"}</small></div><div><strong>{assignment.submissions?.length || 0} submissions</strong>{assignment.submissions?.map((submission) => <p key={submission._id}>{submission.student?.firstName} {submission.student?.lastName}: {submission.answer}</p>)}</div></article>)}</div> : <p className="empty-state">No assignments posted yet.</p>}
  </section>;
}

function StudentResultsTable({ grades, loading }) {
  return (
    <section className="student-attendance-card">
      <div className="section-title-row">
        <div><span className="welcome-label">ACADEMIC RESULTS</span><h2>Your results</h2></div>
        <span className="attendance-total">{grades.length} assessments</span>
      </div>
      {loading ? <p className="empty-state">Loading results...</p> : grades.length ? (
        <div className="student-table-scroll">
          <table className="student-table">
            <thead><tr><th>Assessment</th><th>Course</th><th>Score</th><th>Percentage</th></tr></thead>
            <tbody>{grades.map((grade) => (
              <tr key={grade._id}>
                <td><strong>{grade.title}</strong></td>
                <td>{grade.course}</td>
                <td>{grade.score} / {grade.maxScore}</td>
                <td><span className="course-pill">{Math.round((grade.score / grade.maxScore) * 100)}%</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : <p className="empty-state">Your teacher's results will appear here.</p>}
    </section>
  );
}

function StudentAttendanceTable({ records, loading }) {
  const presentCount = records.filter((record) => record.status === "present").length;
  const rate = records.length ? Math.round((presentCount / records.length) * 100) : 0;

  return (
    <section className="student-attendance-card">
      <div className="section-title-row">
        <div><span className="welcome-label">ATTENDANCE SUMMARY</span><h2>{records.length ? `${rate}% attendance` : "No attendance records yet"}</h2></div>
        <span className="attendance-total">{records.length} recorded days</span>
      </div>
      {loading ? <p className="empty-state">Loading attendance history...</p> : records.length ? (
        <div className="student-table-scroll">
          <table className="student-table">
            <thead><tr><th>Date</th><th>Status</th></tr></thead>
            <tbody>{records.map((record) => (
              <tr key={record._id}><td>{record.date}</td><td><span className={`attendance-status status-${record.status}`}>{record.status}</span></td></tr>
            ))}</tbody>
          </table>
        </div>
      ) : <p className="empty-state">Your teacher's attendance records will show here.</p>}
    </section>
  );
}

function CourseCards({ courses, loading, student = false }) {
  return (
    <section className="course-card-grid">
      {loading ? <p className="empty-state">Loading courses...</p> : courses.length ? courses.map((course) => (
        <article className="managed-course-card" key={course._id}>
          <div className="managed-course-top"><span className="course-code-badge">{course.code}</span>{student && <span className="course-pill">Enrolled</span>}</div>
          <h2>{course.name}</h2>
          <p>{course.description || "Course information will be updated by your administrator."}</p>
        </article>
      )) : <p className="empty-state">{student ? "No course has been assigned to your student profile yet." : "No courses have been assigned to you yet."}</p>}
    </section>
  );
}

function TeacherOverview({ user, students, courses, grades, loading, onNavigate }) {
  return (
    <div className="teacher-home">
      <section className="teacher-home-hero">
        <div><span>TEACHER DASHBOARD</span><h2>Welcome back, {user.name.split(" ")[0]}.</h2><p>Your classes, students, and assessment work are ready in one place.</p></div>
        <div className="teacher-home-actions"><button onClick={() => onNavigate("attendance")}>Mark attendance</button><button onClick={() => onNavigate("results")}>Add a result</button></div>
      </section>
      <div className="teacher-metrics">
        <article><span>My courses</span><strong>{loading ? "—" : courses.length}</strong><small>Assigned classes</small></article>
        <article><span>My students</span><strong>{loading ? "—" : students.length}</strong><small>Across your courses</small></article>
        <article><span>Assessments</span><strong>{grades.length}</strong><small>Results recorded</small></article>
      </div>
      {!loading && (!courses.length || !students.length) && <div className="workspace-message">{!courses.length ? "No courses are assigned to your teacher account yet. Ask the administrator to assign a course." : "No students are enrolled in your assigned courses yet. The administrator needs to assign students to one of your courses."}</div>}
      <section className="teacher-home-courses">
        <div className="teacher-home-section-title"><div><span>YOUR TEACHING</span><h2>Assigned courses</h2></div><button onClick={() => onNavigate("courses")}>View all courses</button></div>
        <CourseCards courses={courses.slice(0, 3)} loading={loading} />
      </section>
    </div>
  );
}

function TeacherRosterPanel({ students, courses, loading }) {
  return <section className="student-table-card"><div className="section-title-row"><div><span className="welcome-label">YOUR CLASSES</span><h2>Student records</h2></div><span className="attendance-total">{loading ? "…" : students.length} students</span></div>
    {loading ? <p className="empty-state">Loading your students...</p> : students.length ? <div className="student-table-scroll"><table className="student-table"><thead><tr><th>Student</th><th>Email</th><th>Phone</th><th>Courses</th></tr></thead><tbody>{students.map((student) => <tr key={student._id}><td><strong>{student.firstName} {student.lastName}</strong></td><td>{student.email}</td><td>{student.phone}</td><td>{student.courses?.length ? student.courses.map((course) => course.code).join(", ") : student.courseId?.code || student.course}</td></tr>)}</tbody></table></div> : <p className="empty-state">{courses.length ? "No students are enrolled in your courses yet. Ask the administrator to assign students to your course." : "No courses are assigned to your account yet. Ask the administrator to assign a course first."}</p>}
  </section>;
}

function AdminCoursesPanel({ courses, teachers, students, studentsLoading, loading, form, setForm, formOpen, editingId, enrollmentCourse, enrollmentStudentIds, setEnrollmentStudentIds, courseDeleteToast, onOpenEnrollment, onCloseEnrollment, onSaveEnrollment, onOpen, onCancel, onSave, onEdit, onDelete }) {
  return (
    <section className="admin-courses-panel">
      <div className="section-title-row results-heading-row">
        <div><span className="welcome-label">ACADEMIC RESOURCES</span><h2>Courses and teachers</h2></div>
        <div className="course-panel-actions"><button className="submit-button add-student-button" onClick={onOpen}>Add course <span>+</span></button></div>
      </div>
      {formOpen && (
        <form className="student-editor" onSubmit={onSave}>
          <div className="editor-heading"><h2>{editingId ? "Edit course assignment" : "Add course"}</h2><button type="button" className="editor-close" onClick={onCancel} aria-label="Close form">×</button></div>
          <div className="student-fields course-admin-fields">
            {editingId ? <label>Assigned teacher<select value={form.teacherId} onChange={(event) => setForm({ ...form, teacherId: event.target.value })}><option value="">Unassign teacher</option>{teachers.map((teacher) => <option key={teacher._id} value={teacher._id}>{teacher.name} · {teacher.email}</option>)}</select></label> : <>
              <label>Course name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Add courses" /></label>
              <label>Course code<input required pattern="CS-[0-9]{3,4}" title="Use a BSCS course code such as CS-501" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} placeholder="Add course code" /></label>
            </>}
          </div>
          <div className="editor-actions"><button type="button" className="cancel-button" onClick={onCancel}>Cancel</button><button className="submit-button" type="submit">{editingId ? "Save teacher assignment" : "Add course"}</button></div>
        </form>
      )}
      {enrollmentCourse && (
        <form className="student-editor enrollment-editor" onSubmit={onSaveEnrollment}>
          <div className="editor-heading"><div><h2>Assign students to {enrollmentCourse.name}</h2><p>Select students to add them to this course. Their other courses will stay assigned.</p></div><button type="button" className="editor-close" onClick={onCloseEnrollment} aria-label="Close student assignment">×</button></div>
          {studentsLoading ? <p className="empty-state">Loading student accounts...</p> : students.length ? <div className="enrollment-student-list">{students.map((student) => <label key={student._id}><input type="checkbox" checked={enrollmentStudentIds.includes(student._id)} onChange={(event) => setEnrollmentStudentIds(event.target.checked ? [...enrollmentStudentIds, student._id] : enrollmentStudentIds.filter((id) => id !== student._id))}/><span><strong>{student.firstName} {student.lastName}</strong><small>{student.email} · Current courses: {student.courses?.length ? student.courses.map((item) => item.name).join(", ") : student.courseId?.name || student.course}</small></span></label>)}</div> : <p className="empty-state">No student accounts are available to assign.</p>}
          <div className="editor-actions"><button type="button" className="cancel-button" onClick={onCloseEnrollment}>Cancel</button><button className="submit-button" type="submit" disabled={studentsLoading}>Save student assignments ({enrollmentStudentIds.length})</button></div>
        </form>
      )}
      {courseDeleteToast && <div className="course-delete-toast" role="status">✓ {courseDeleteToast}</div>}
      {loading ? <p className="empty-state">Loading courses...</p> : courses.length ? (
        <div className="student-table-card student-table-scroll">
          <table className="student-table">
            <thead><tr><th>Course</th><th>Code</th><th>Actions</th></tr></thead>
            <tbody>{courses.map((course) => (
              <tr key={course._id}><td><strong>{course.name}</strong></td><td><span className="course-pill">{course.code}</span></td><td><div className="row-actions"><button onClick={() => onOpenEnrollment(course)}>Assign students</button><button onClick={() => onEdit(course)}>{course.teacher ? "Edit assignment" : "Assign teacher"}</button><button className="delete-action" onClick={() => onDelete(course)}>Delete</button></div></td></tr>
            ))}</tbody>
          </table>
        </div>
      ) : <p className="empty-state course-empty-state">No courses yet. Create a course and assign a teacher.</p>}
    </section>
  );
}

function AdminOverview({ students, teachers, courses, loading }) {
  return (
    <>
      <div className="student-summary-grid admin-summary-grid">
        <article><span>Total students</span><strong>{loading ? "—" : students.length}</strong><small>Student records</small></article>
        <article><span>Total teachers</span><strong>{teachers.length}</strong><small>Registered teacher accounts</small></article>
        <article><span>Total courses</span><strong>{courses.length}</strong><small>Courses in the catalog</small></article>
      </div>
      <section className="admin-courses-panel">
        <div className="section-title-row"><div><span className="welcome-label">TEACHING TEAM</span><h2>Teachers and assigned courses</h2></div></div>
        {teachers.length ? (
          <div className="student-table-card student-table-scroll">
            <table className="student-table">
              <thead><tr><th>Teacher</th><th>Email</th><th>Assigned courses</th></tr></thead>
              <tbody>{teachers.map((teacher) => {
                const assigned = courses.filter((course) => course.teacher?._id === teacher._id);
                return <tr key={teacher._id}><td><strong>{teacher.name}</strong></td><td>{teacher.email}</td><td>{assigned.length ? assigned.map((course) => `${course.name} (${course.code})`).join(", ") : <span className="empty-assignment">No courses assigned</span>}</td></tr>;
              })}</tbody>
            </table>
          </div>
        ) : <p className="empty-state">No teacher accounts yet. Teachers can register from the login page.</p>}
      </section>
    </>
  );
}

function AdminTeachersPanel({ teachers, courses, form, setForm, formOpen, editingId, onOpen, onCancel, onSave, onEdit, onDelete }) {
  return (
    <section className="admin-courses-panel">
      <div className="section-title-row"><div><span className="welcome-label">TEACHING TEAM</span><h2>Teacher accounts</h2></div><button className="submit-button add-student-button" onClick={onOpen}>Add teacher <span>+</span></button></div>
      {formOpen && (
        <form className="student-editor teacher-editor" onSubmit={onSave}>
          <div className="editor-heading"><h2>{editingId ? "Edit teacher" : "Add a teacher"}</h2><button type="button" className="editor-close" onClick={onCancel} aria-label="Close form">×</button></div>
          <div className="student-fields">
            <label>Full name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label>Email<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
            <label className="course-field">{editingId ? "New password (optional)" : "Password"}<input type="password" minLength="8" required={!editingId} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder={editingId ? "Leave blank to keep current password" : "At least 8 characters"} /></label>
          </div>
          <div className="editor-actions"><button type="button" className="cancel-button" onClick={onCancel}>Cancel</button><button className="submit-button" type="submit">{editingId ? "Save changes" : "Create teacher"}</button></div>
        </form>
      )}
      <div className="section-title-row teacher-count-row"><span className="attendance-total">{teachers.length} teachers</span></div>
      {teachers.length ? (
        <div className="student-table-card student-table-scroll">
          <table className="student-table"><thead><tr><th>Teacher</th><th>Email</th><th>Courses</th><th>Actions</th></tr></thead>
            <tbody>{teachers.map((teacher) => {
              const assigned = courses.filter((course) => course.teacher?._id === teacher._id);
              return <tr key={teacher._id}><td><strong>{teacher.name}</strong></td><td>{teacher.email}</td><td>{assigned.length ? assigned.map((course) => <span className="course-pill" key={course._id}>{course.code}</span>) : <span className="empty-assignment">No courses assigned</span>}</td><td><div className="row-actions"><button onClick={() => onEdit(teacher)}>Edit</button><button className="delete-action" onClick={() => onDelete(teacher)}>Delete</button></div></td></tr>;
            })}</tbody>
          </table>
        </div>
      ) : <p className="empty-state">No teacher accounts yet. Add a teacher to get started.</p>}
    </section>
  );
}

function TeacherAttendancePanel({ students, date, onDateChange, drafts, onDraftChange, onSave, onSaveAll, loading, attendanceLoading }) {
  return (
    <section className="teacher-attendance-panel">
      <div className="section-title-row">
        <div><span className="welcome-label">CLASS RECORD</span><h2>Mark attendance</h2></div>
        <div className="attendance-toolbar-actions">
          <label className="attendance-date">Date<input type="date" value={date} onChange={(event) => onDateChange(event.target.value)} /></label>
          <button className="attendance-save attendance-save-all" onClick={onSaveAll} disabled={loading || attendanceLoading || !students.length}>Save attendance</button>
        </div>
      </div>
      <div className="student-table-card">
        {loading ? <p className="empty-state">Loading students...</p> : students.length ? (
          <div className="student-table-scroll">
            <table className="student-table">
              <thead><tr><th>Student</th><th>Course</th><th>Today's status</th><th>Action</th></tr></thead>
              <tbody>{students.map((student) => (
                <tr key={student._id}>
                  <td><strong>{student.firstName} {student.lastName}</strong></td>
                  <td>{student.course}</td>
                  <td><select className="attendance-select" value={drafts[student._id] || "present"} onChange={(event) => onDraftChange(student._id, event.target.value)}><option value="present">Present</option><option value="absent">Absent</option><option value="late">Late</option></select></td>
                  <td><button className="attendance-save" onClick={() => onSave(student)}>Save</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <p className="empty-state">Add student records before taking attendance.</p>}
      </div>
    </section>
  );
}

function TeacherResultsPanel({ students, courses, grades, loading, form, setForm, formOpen, editingId, onOpen, onCancel, onSave, onEdit, onDelete }) {
  return (
    <section className="teacher-results-panel">
      <div className="section-title-row results-heading-row">
        <div><span className="welcome-label">ASSESSMENT BOOK</span><h2>Manage student results</h2></div>
        <button className="submit-button add-student-button" onClick={onOpen}>Add result <span>+</span></button>
      </div>
      {formOpen && (
        <form className="student-editor grade-editor" onSubmit={onSave}>
          <div className="editor-heading">
            <h2>{editingId ? "Edit result" : "Add a result"}</h2>
            <button type="button" className="editor-close" onClick={onCancel} aria-label="Close form">×</button>
          </div>
          <div className="student-fields grade-fields">
            <label>Course<select required value={form.courseId || ""} onChange={(event) => { const course = courses.find((item) => item._id === event.target.value); setForm({ ...form, courseId: event.target.value, course: course?.code || "", studentId: "" }); }}><option value="">Select course</option>{courses.map((course) => <option key={course._id} value={course._id}>{course.name} ({course.code})</option>)}</select></label>
            <label>Student<select required value={form.studentId} disabled={!form.courseId} onChange={(event) => onStudentChange(event, students, form, setForm)}><option value="">{form.courseId ? "Select student" : "Select a course first"}</option>{students.filter((student) => { const course = courses.find((item) => item._id === form.courseId); return course && ([...(student.courses || []), student.courseId].filter(Boolean).some((id) => String(id?._id || id) === String(course._id)) || student.course === course.code || student.course === course.name); }).map((student) => <option key={student._id} value={student._id}>{student.firstName} {student.lastName}</option>)}</select></label>
            <label>Assessment name<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Midterm exam" /></label>
            <label>Score earned<input required type="number" min="0" step="any" value={form.score} onChange={(event) => setForm({ ...form, score: event.target.value })} /></label>
            <label>Maximum score<input required type="number" min="1" step="any" value={form.maxScore} onChange={(event) => setForm({ ...form, maxScore: event.target.value })} /></label>
          </div>
          <div className="editor-actions"><button type="button" className="cancel-button" onClick={onCancel}>Cancel</button><button className="submit-button" type="submit">{editingId ? "Save changes" : "Save result"}</button></div>
        </form>
      )}
      <section className="student-table-card">
        {loading ? <p className="empty-state">Loading results...</p> : grades.length ? (
          <div className="student-table-scroll">
            <table className="student-table">
              <thead><tr><th>Student</th><th>Assessment</th><th>Course</th><th>Score</th><th>Actions</th></tr></thead>
              <tbody>{grades.map((grade) => (
                <tr key={grade._id}>
                  <td><strong>{grade.student?.firstName} {grade.student?.lastName}</strong></td><td>{grade.title}</td><td>{grade.course}</td><td>{grade.score} / {grade.maxScore}</td>
                  <td><div className="row-actions"><button onClick={() => onEdit(grade)}>Edit</button><button className="delete-action" onClick={() => onDelete(grade)}>Delete</button></div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <p className="empty-state">No results have been entered yet.</p>}
      </section>
    </section>
  );
}

function onStudentChange(event, students, form, setForm) {
  const selected = students.find((student) => student._id === event.target.value);
  setForm({ ...form, studentId: event.target.value, course: form.course || selected?.course || "", courseId: form.courseId || selected?.courseId?._id || "" });
}

function RoleDashboard({ user, onLogout }) {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [teacherForm, setTeacherForm] = useState({ name: "", email: "", password: "" });
  const [teacherFormOpen, setTeacherFormOpen] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState("");
  const [courseLoading, setCourseLoading] = useState(true);
  const [courseFormOpen, setCourseFormOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState("");
  const [courseForm, setCourseForm] = useState({ name: "", code: "", description: "", teacherId: "" });
  const [enrollmentCourse, setEnrollmentCourse] = useState(null);
  const [enrollmentStudentIds, setEnrollmentStudentIds] = useState([]);
  const [profile, setProfile] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [assignmentLoading, setAssignmentLoading] = useState(true);
  const [assignmentForm, setAssignmentForm] = useState({ title: "", description: "", courseId: "", studentId: "", dueDate: "" });
  const [profileForm, setProfileForm] = useState({ firstName: "", lastName: "", phone: "" });
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [grades, setGrades] = useState([]);
  const [gradeLoading, setGradeLoading] = useState(true);
  const [gradeFormOpen, setGradeFormOpen] = useState(false);
  const [editingGradeId, setEditingGradeId] = useState("");
  const [gradeForm, setGradeForm] = useState({ studentId: "", title: "", course: "", courseId: "", score: "", maxScore: "100" });
  const [attendanceDate, setAttendanceDate] = useState(getLocalDate());
  const [attendanceDrafts, setAttendanceDrafts] = useState({});
  const [activeSection, setActiveSection] = useState(
    "overview"
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [courseDeleteToast, setCourseDeleteToast] = useState("");
  const [popupMessage, setPopupMessage] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    course: "",
    courseId: "",
  });
  const token = localStorage.getItem("lmsToken");
  const isAdmin = user.role === "admin";
  const isTeacher = user.role === "teacher";

  useEffect(() => {
    if (!courseDeleteToast) return undefined;
    const timeoutId = window.setTimeout(() => setCourseDeleteToast(""), 4500);
    return () => window.clearTimeout(timeoutId);
  }, [courseDeleteToast]);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const endpoint = user.role === "student" ? "/students/me" : "/students";
      if (user.role === "admin") {
        const syncResponse = await fetch(`${API_BASE}/students/sync-accounts`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        const syncData = await syncResponse.json();
        if (!syncResponse.ok) throw new Error(syncData.message || "Could not sync student accounts");
      }
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not load data");
      if (user.role === "student") {
        setProfile(data);
        setProfileForm({ firstName: data.firstName || "", lastName: data.lastName || "", phone: data.phone || "" });
      }
      else setStudents(data);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [token, user.role]);

  const loadAttendance = useCallback(async () => {
    if (user.role === "admin") return;
    setAttendanceLoading(true);
    try {
      const endpoint = user.role === "student"
        ? "/attendance/mine"
        : `/attendance?date=${attendanceDate}`;
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not load attendance");
      setAttendanceRecords(data);
      if (user.role === "teacher") {
        setAttendanceDrafts(Object.fromEntries(data.map((item) => [item.student?._id, item.status])));
      }
    } catch (attendanceError) {
      setError(attendanceError.message);
    } finally {
      setAttendanceLoading(false);
    }
  }, [attendanceDate, token, user.role]);

  const loadGrades = useCallback(async () => {
    if (user.role === "admin") return;
    setGradeLoading(true);
    try {
      const endpoint = user.role === "student" ? "/grades/mine" : "/grades";
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not load results");
      setGrades(data);
    } catch (gradeError) {
      setError(gradeError.message);
    } finally {
      setGradeLoading(false);
    }
  }, [token, user.role]);

  const loadCourses = useCallback(async () => {
    setCourseLoading(true);
    try {
      const response = await fetch(`${API_BASE}/courses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not load courses");
      setCourses(data);
      if (user.role === "admin") {
        const teacherResponse = await fetch(`${API_BASE}/teachers`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const teacherData = await teacherResponse.json();
        if (!teacherResponse.ok) throw new Error(teacherData.message || "Could not load teachers");
        setTeachers(teacherData);
      }
    } catch (courseError) {
      setError(courseError.message);
    } finally {
      setCourseLoading(false);
    }
  }, [token, user.role]);

  const loadAssignments = useCallback(async () => {
    if (user.role !== "student" && user.role !== "teacher") return;
    setAssignmentLoading(true);
    try {
      const response = await fetch(`${API_BASE}/assignments${user.role === "student" ? "/mine" : ""}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not load assignments");
      setAssignments(data);
    } catch (assignmentError) { setError(assignmentError.message); }
    finally { setAssignmentLoading(false); }
  }, [token, user.role]);

  const saveProfile = async (event) => {
    event.preventDefault(); setError(""); setNotice("");
    try {
      const response = await fetch(`${API_BASE}/students/me`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(profileForm) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not update profile");
      setProfile(data); setProfileForm({ firstName: data.firstName, lastName: data.lastName, phone: data.phone });
      setNotice("Profile updated successfully.");
    } catch (profileError) { setError(profileError.message); }
  };

  const submitAssignment = async (assignmentId, answer) => {
    setError(""); setNotice("");
    try {
      const response = await fetch(`${API_BASE}/assignments/${assignmentId}/submit`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ answer }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not submit assignment");
      setNotice(data.message); await loadAssignments();
    } catch (submitError) { setError(submitError.message); }
  };

  const createAssignment = async (event) => {
    event.preventDefault(); setError(""); setNotice("");
    try {
      const response = await fetch(`${API_BASE}/assignments`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(assignmentForm) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not create assignment");
      setAssignmentForm({ title: "", description: "", courseId: "", studentId: "", dueDate: "" });
      setNotice("Assignment posted successfully."); await loadAssignments();
    } catch (assignmentError) { setError(assignmentError.message); }
  };

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  useEffect(() => {
    loadGrades();
  }, [loadGrades]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  useEffect(() => { loadAssignments(); }, [loadAssignments]);

  const resetForm = () => {
    setForm({ firstName: "", lastName: "", email: "", phone: "", course: "", courseId: "" });
    setEditingId("");
    setFormOpen(false);
  };

  const beginEdit = (student) => {
    loadCourses();
    setForm({
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      phone: student.phone,
      course: student.course,
      courseId: student.courseId?._id || "",
    });
    setEditingId(student._id);
    setFormOpen(true);
    setNotice("");
  };

  const saveStudent = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        `${API_BASE}/students${editingId ? `/${editingId}` : ""}`,
        {
          method: editingId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(form),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not save student");
      resetForm();
      setNotice(editingId || response.status === 200 ? "Student updated." : "Student added.");
      await loadWorkspace();
    } catch (saveError) {
      setError(saveError.message);
    }
  };

  const deleteStudent = async (student) => {
    if (!window.confirm(`Delete ${student.firstName} ${student.lastName}?`)) return;
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API_BASE}/students/${student._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not delete student");
      setNotice("Student deleted.");
      await loadWorkspace();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  const saveAttendance = async (student) => {
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API_BASE}/attendance`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          studentId: student._id,
          date: attendanceDate,
          status: attendanceDrafts[student._id] || "present",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not save attendance");
      setNotice(`Attendance saved for ${student.firstName} ${student.lastName}.`);
      setPopupMessage(`Attendance saved for ${student.firstName} ${student.lastName}.`);
      await loadAttendance();
    } catch (attendanceError) {
      setError(attendanceError.message);
    }
  };

  const saveAllAttendance = async () => {
    if (!students.length) return;
    setError("");
    setNotice("");
    try {
      const responses = await Promise.all(students.map((student) =>
        fetch(`${API_BASE}/attendance`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            studentId: student._id,
            date: attendanceDate,
            status: attendanceDrafts[student._id] || "present",
          }),
        })
      ));
      const results = await Promise.all(responses.map((response) => response.json()));
      const failed = responses.findIndex((response) => !response.ok);
      if (failed >= 0) throw new Error(results[failed].message || "Could not save all attendance records");
      setNotice(`Attendance saved for ${students.length} students.`);
      setPopupMessage(`Attendance saved for ${students.length} students.`);
      await loadAttendance();
    } catch (attendanceError) {
      setError(attendanceError.message);
    }
  };

  const resetGradeForm = () => {
    setGradeForm({ studentId: "", title: "", course: "", courseId: "", score: "", maxScore: "100" });
    setEditingGradeId("");
    setGradeFormOpen(false);
  };

  const saveGrade = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API_BASE}/grades${editingGradeId ? `/${editingGradeId}` : ""}`, {
        method: editingGradeId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(gradeForm),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not save result");
      setNotice(editingGradeId ? "Result updated." : "Result added.");
      setPopupMessage(editingGradeId ? "Result updated successfully." : "Result saved successfully.");
      resetGradeForm();
      await loadGrades();
    } catch (gradeError) {
      setError(gradeError.message);
    }
  };

  const editGrade = (grade) => {
    setGradeForm({
      studentId: grade.student?._id || "",
      title: grade.title,
      course: grade.course,
      courseId: grade.courseId?._id || grade.courseId || courses.find((course) => course.code === grade.course)?._id || "",
      score: String(grade.score),
      maxScore: String(grade.maxScore),
    });
    setEditingGradeId(grade._id);
    setGradeFormOpen(true);
  };

  const deleteGrade = async (grade) => {
    if (!window.confirm(`Delete the result for ${grade.title}?`)) return;
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API_BASE}/grades/${grade._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not delete result");
      setNotice("Result deleted.");
      await loadGrades();
    } catch (gradeError) {
      setError(gradeError.message);
    }
  };

  const resetCourseForm = () => {
    setCourseForm({ name: "", code: "", description: "", teacherId: "" });
    setEditingCourseId("");
    setCourseFormOpen(false);
  };

  const editCourse = (course) => {
    setCourseForm({
      name: course.name,
      code: course.code,
      description: course.description || "",
      teacherId: course.teacher?._id || "",
    });
    setEditingCourseId(course._id);
    setCourseFormOpen(true);
  };

  const saveCourse = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API_BASE}/courses${editingCourseId ? `/${editingCourseId}` : ""}`, {
        method: editingCourseId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(courseForm),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not save course");
      setNotice(editingCourseId ? "Course assignment updated." : "Course added successfully.");
      resetCourseForm();
      await loadCourses();
    } catch (courseError) {
      setError(courseError.message);
    }
  };

  const openEnrollment = (course) => {
    setEnrollmentCourse(course);
    setEnrollmentStudentIds(students.filter((student) => [...(student.courses || []), student.courseId].filter(Boolean).some((item) => String(item?._id || item) === String(course._id)) || student.course === course.code || student.course === course.name).map((student) => student._id));
  };

  const saveEnrollment = async (event) => {
    event.preventDefault(); setError(""); setNotice("");
    try {
      const response = await fetch(`${API_BASE}/courses/${enrollmentCourse._id}/students`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ studentIds: enrollmentStudentIds }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not assign students");
      setNotice(data.message); setEnrollmentCourse(null); setEnrollmentStudentIds([]);
      await loadWorkspace();
    } catch (enrollmentError) { setError(enrollmentError.message); }
  };


  const deleteCourse = async (course) => {
    if (!window.confirm(`Delete course ${course.code}? Its assignments will be deleted. Students will stay enrolled in any of their other courses.`)) return;
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API_BASE}/courses/${course._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not delete course");
      const studentNote = data.unassignedStudents ? ` ${data.unassignedStudents} student${data.unassignedStudents === 1 ? " was" : "s were"} moved to Unassigned.` : "";
      setCourseDeleteToast(`${course.code} course deleted successfully.${studentNote}`);
      await loadWorkspace();
      await loadCourses();
    } catch (courseError) {
      setError(courseError.message);
    }
  };

  const resetTeacherForm = () => {
    setTeacherForm({ name: "", email: "", password: "" });
    setEditingTeacherId("");
    setTeacherFormOpen(false);
  };

  const editTeacher = (teacher) => {
    setTeacherForm({ name: teacher.name, email: teacher.email, password: "" });
    setEditingTeacherId(teacher._id);
    setTeacherFormOpen(true);
    setNotice("");
  };

  const saveTeacher = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API_BASE}/teachers${editingTeacherId ? `/${editingTeacherId}` : ""}`, {
        method: editingTeacherId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(teacherForm),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not save teacher");
      setNotice(editingTeacherId ? "Teacher updated." : "Teacher account created.");
      if (!editingTeacherId) window.alert("Teacher created successfully.");
      resetTeacherForm();
      await loadCourses();
    } catch (teacherError) {
      setError(teacherError.message);
    }
  };

  const deleteTeacher = async (teacher) => {
    if (!window.confirm(`Delete teacher account for ${teacher.name}?`)) return;
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API_BASE}/teachers/${teacher._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not delete teacher");
      setNotice("Teacher deleted.");
      await loadCourses();
    } catch (teacherError) {
      setError(teacherError.message);
    }
  };

  const visibleStudents = students.filter((student) =>
    `${student.firstName} ${student.lastName} ${student.email} ${student.course}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );
  const roleLinks = isAdmin
    ? [{ id: "overview", label: "Overview" }, { id: "students", label: "Students" }, { id: "teachers", label: "Teachers" }, { id: "courses", label: "Courses" }]
    : isTeacher
      ? [{ id: "overview", label: "Overview" }, { id: "courses", label: "My courses" }, { id: "roster", label: "Student records" }, { id: "attendance", label: "Attendance" }, { id: "assignments", label: "Assignments" }, { id: "results", label: "Results" }]
      : [
          { id: "overview", label: "Overview" },
          { id: "courses", label: "My Courses" },
          { id: "assignments", label: "Assignments" },
          { id: "results", label: "Results" },
          { id: "profile", label: "Profile" },
        ];

  return (
    <div className={`dashboard-page${isAdmin ? " dashboard-admin" : isTeacher ? " dashboard-teacher" : " dashboard-student"}`}>
      <nav className="topbar">
        <div className="brand">
          <div className="brand-mark">U</div>
          <span>Uni<span className="brand-light">Learn</span></span>
        </div>
        <div className="topbar-user">
          <span className="topbar-user-name">{user.name}</span>
          <span className={`role-chip role-${user.role}`}>{user.role}</span>
          <button className="logout-button" onClick={onLogout}>Log out</button>
        </div>
      </nav>

      <main className="dashboard-content">
        <div className="dashboard-kicker">
          {isAdmin ? "ADMIN CONTROL PANEL" : isTeacher ? "TEACHER WORKSPACE" : "STUDENT PORTAL"}
        </div>
        <h1>
          {isAdmin
            ? activeSection === "courses" ? "Course management" : activeSection === "teachers" ? "Teacher management" : activeSection === "overview" ? `Welcome, ${user.name.split(" ")[0]}.` : "Student management"
            : isTeacher
              ? activeSection === "overview" ? `Welcome, ${user.name.split(" ")[0]}.` : activeSection === "attendance" ? "Attendance" : activeSection === "results" ? "Results" : activeSection === "assignments" ? "Assignments" : activeSection === "courses" ? "My courses" : "Student records"
              : activeSection === "overview" ? `Welcome, ${user.name.split(" ")[0]}.`
                : roleLinks.find((link) => link.id === activeSection)?.label || "Student portal"}
        </h1>
        <p className={`dashboard-description${isTeacher && activeSection === "roster" ? " student-records-description" : ""}`}>
          {isAdmin
            ? activeSection === "courses" ? "Create courses, assign teachers, and enroll students from the student section." : activeSection === "teachers" ? "Review teacher accounts and their course assignments." : activeSection === "overview" ? "Monitor students, teachers, and courses across your learning system." : "Manage student records and assign each student to a course."
            : isTeacher
              ? activeSection === "attendance"
                ? "Record daily attendance for students in your roster."
                : activeSection === "results"
                  ? "Add and manage assessments for students in your assigned courses."
                  : activeSection === "assignments"
                    ? "Post assignments and review student submissions for your courses."
                  : activeSection === "courses"
                    ? "Review the courses assigned to you and the students enrolled in each one."
                    : activeSection === "overview"
                      ? "Your teaching overview, assigned classes, and quick actions."
                      : "Browse the students enrolled in your assigned courses."
              : activeSection === "attendance"
                ? "Review the attendance records entered by your teacher."
                : activeSection === "results"
                  ? "Review your scores and assessment results."
                : activeSection === "courses"
                  ? "View the courses assigned to your student profile."
                  : activeSection === "assignments"
                    ? "View course assignments and submit your answers."
                  : activeSection === "profile"
                    ? "Update your personal information and review your course."
                    : "Your learning overview, courses, assignments, and results in one place."}
        </p>

        {error && <div className="workspace-message error-message" role="status">{error}</div>}
        {notice && <div className="workspace-message success-message" role="status">{notice}</div>}

        <nav className="role-navigation" aria-label={`${user.role} sections`}>
          {roleLinks.map((link) => (
            <button
              key={link.id}
              className={activeSection === link.id ? "role-nav-item active" : "role-nav-item"}
              onClick={() => setActiveSection(link.id)}
            >
              {link.label}
            </button>
          ))}
        </nav>

        {isAdmin && activeSection === "overview" ? (
          <AdminOverview students={students} teachers={teachers} courses={courses} loading={loading || courseLoading} />
        ) : isAdmin && activeSection === "teachers" ? (
          <AdminTeachersPanel
            teachers={teachers}
            courses={courses}
            form={teacherForm}
            setForm={setTeacherForm}
            formOpen={teacherFormOpen}
            editingId={editingTeacherId}
            onOpen={() => { resetTeacherForm(); setTeacherFormOpen(true); }}
            onCancel={resetTeacherForm}
            onSave={saveTeacher}
            onEdit={editTeacher}
            onDelete={deleteTeacher}
          />
        ) : user.role === "student" ? (
          <StudentPortalSection
            section={activeSection}
            user={user}
            profile={profile}
            loading={loading}
            attendanceRecords={attendanceRecords}
            attendanceLoading={attendanceLoading}
            grades={grades}
            gradeLoading={gradeLoading}
            courses={courses}
            courseLoading={courseLoading}
            assignments={assignments}
            assignmentLoading={assignmentLoading}
            profileForm={profileForm}
            setProfileForm={setProfileForm}
            onSaveProfile={saveProfile}
            onSubmitAssignment={submitAssignment}
          />
        ) : isAdmin && activeSection === "courses" ? (
          <AdminCoursesPanel
            courses={courses}
            teachers={teachers}
            students={students}
            studentsLoading={loading}
            loading={courseLoading}
            form={courseForm}
            setForm={setCourseForm}
            enrollmentCourse={enrollmentCourse}
            enrollmentStudentIds={enrollmentStudentIds}
            setEnrollmentStudentIds={setEnrollmentStudentIds}
            onOpenEnrollment={openEnrollment}
            onCloseEnrollment={() => { setEnrollmentCourse(null); setEnrollmentStudentIds([]); }}
            onSaveEnrollment={saveEnrollment}
            courseDeleteToast={courseDeleteToast}
            formOpen={courseFormOpen}
            editingId={editingCourseId}
            onOpen={() => { resetCourseForm(); setCourseFormOpen(true); }}
            onCancel={resetCourseForm}
            onSave={saveCourse}
            onEdit={editCourse}
            onDelete={deleteCourse}
          />
        ) : isTeacher && activeSection === "overview" ? (
          <TeacherOverview user={user} students={students} courses={courses} grades={grades} loading={loading || courseLoading} onNavigate={setActiveSection} />
        ) : isTeacher && activeSection === "roster" ? (
          <TeacherRosterPanel students={students} courses={courses} loading={loading || courseLoading} />
        ) : isTeacher && activeSection === "attendance" ? (
          <TeacherAttendancePanel
            students={students}
            date={attendanceDate}
            onDateChange={setAttendanceDate}
            drafts={attendanceDrafts}
            onDraftChange={(studentId, status) => setAttendanceDrafts({ ...attendanceDrafts, [studentId]: status })}
            onSave={saveAttendance}
            onSaveAll={saveAllAttendance}
            loading={loading}
            attendanceLoading={attendanceLoading}
          />
        ) : isTeacher && activeSection === "results" ? (
          <TeacherResultsPanel
            students={students}
            courses={courses}
            grades={grades}
            loading={gradeLoading}
            form={gradeForm}
            setForm={setGradeForm}
            formOpen={gradeFormOpen}
            editingId={editingGradeId}
            onOpen={() => { resetGradeForm(); setGradeFormOpen(true); }}
            onCancel={resetGradeForm}
            onSave={saveGrade}
            onEdit={editGrade}
            onDelete={deleteGrade}
          />
        ) : isTeacher && activeSection === "assignments" ? (
          <TeacherAssignments courses={courses} students={students} assignments={assignments} loading={assignmentLoading} form={assignmentForm} setForm={setAssignmentForm} onSave={createAssignment} />
        ) : isTeacher && activeSection === "courses" ? (
          <CourseCards courses={courses} loading={courseLoading} />
        ) : (
          <>
            <section className="workspace-toolbar">
              <div className="workspace-count">
                <strong>{loading ? "—" : students.length}</strong>
                <span>student records</span>
              </div>
              <div className="workspace-actions">
                <input
                  className="student-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search students"
                  aria-label="Search students"
                />
                {isAdmin && <button className="submit-button add-student-button" onClick={() => { resetForm(); setFormOpen(true); loadCourses(); }}>Add student <span>+</span></button>}
              </div>
            </section>

            {isAdmin && formOpen && (
              <form className="student-editor student-record-editor" onSubmit={saveStudent}>
                <div className="editor-heading">
                  <h2>{editingId ? "Edit student" : "Add a student"}</h2>
                  <button type="button" className="editor-close" onClick={resetForm} aria-label="Close form">×</button>
                </div>
                <div className="student-fields">
                  <label>First name<input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></label>
                  <label>Last name<input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></label>
                  <label>Email<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
                  <label>Phone<input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
                  <label className="course-field">Course<select required disabled={courseLoading} value={form.courseId} onChange={(e) => { const course = courses.find((item) => item._id === e.target.value); setForm({ ...form, courseId: e.target.value, course: course?.code || "" }); }}><option value="">{courseLoading ? "Loading courses..." : "Select course"}</option>{courses.map((course) => <option key={course._id} value={course._id}>{course.name} ({course.code})</option>)}</select></label>
                </div>
                <div className="editor-actions">
                  <button type="button" className="cancel-button" onClick={resetForm}>Cancel</button>
                  <button className="submit-button" type="submit">{editingId ? "Save changes" : "Add student"}</button>
                </div>
              </form>
            )}

            <section className="student-table-card">
              {loading ? <p className="empty-state">Loading student records...</p> : visibleStudents.length ? (
                <div className="student-table-scroll">
                  <table className="student-table">
                    <thead><tr><th>Student</th><th>Email</th><th>Phone</th><th>Course</th>{isAdmin && <th>Actions</th>}</tr></thead>
                    <tbody>{visibleStudents.map((student) => (
                      <tr key={student._id}>
                        <td><strong>{student.firstName} {student.lastName}</strong></td>
        <td>{student.email}</td><td>{student.phone}</td><td><span className="course-pill">{student.courses?.length ? student.courses.map((course) => course.code).join(", ") : student.courseId?.code || student.course}</span></td>
                        {isAdmin && <td><div className="row-actions"><button onClick={() => beginEdit(student)}>Edit</button><button className="delete-action" onClick={() => deleteStudent(student)}>Delete</button></div></td>}
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              ) : <p className="empty-state">{search ? "No students match your search." : "No student records yet."}</p>}
            </section>
          </>
        )}
      </main>
      {popupMessage && (
        <div className="confirmation-overlay">
          <section className="confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="confirmation-title">
            <div className="confirmation-mark">✓</div>
            <h2 id="confirmation-title">Saved successfully</h2>
            <p>{popupMessage}</p>
            <button className="submit-button" onClick={() => setPopupMessage("")}>Done</button>
          </section>
        </div>
      )}
    </div>
  );
}

function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
  });
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("lmsToken");
    if (!token) {
      setCheckingSession(false);
      return;
    }

    fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          if (response.status === 401 || response.status === 404) localStorage.removeItem("lmsToken");
          throw new Error(data.message || "Could not restore your session");
        }
        setUser(data);
      })
      .catch(() => {
        if (localStorage.getItem("lmsToken")) {
          setMessage("Could not reconnect to your account. Check that the backend is running, then refresh.");
          setMessageType("error");
        }
      })
      .finally(() => setCheckingSession(false));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setMessageType("");
    setLoading(true);

    try {
      const endpoint = isLogin ? "login" : "register";

      const response = await fetch(
        `${API_BASE}/auth/${endpoint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong.");
      }

      if (isLogin) {
        localStorage.setItem("lmsToken", data.token);
        setUser(data.user);
        setMessage("");
      } else {
        setMessage("Account created successfully. You can now log in.");
        setMessageType("success");
        setIsLogin(true);
        setForm({
          name: "",
          email: form.email,
          password: "",
          role: "student",
        });
      }
    } catch (error) {
      setMessage(error.message);
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (loginMode) => {
    setIsLogin(loginMode);
    setMessage("");
    setMessageType("");
    if (!loginMode) setForm({ name: "", email: "", password: "", role: "student" });
  };

  const logout = () => {
    localStorage.removeItem("lmsToken");
    setUser(null);
    setMessage("");
    setMessageType("");
    setForm({ name: "", email: "", password: "", role: "student" });
  };

  if (checkingSession) return <main className="session-loading" aria-label="Restoring session">Loading your account...</main>;
  if (user) return <RoleDashboard user={user} onLogout={logout} />;

  return (
    <main className="auth-layout">
      <section className="hero-panel">
        <nav className="hero-nav">
          <div className="brand brand-white">
            <div className="brand-mark">U</div>
            <span>Uni<span className="brand-light">Learn</span></span>
          </div>
          <span className="portal-label">UNIVERSITY PORTAL</span>
        </nav>

        <div className="hero-content">
          <div className="hero-badge">
            <span className="live-dot"></span>
            YOUR FUTURE, YOUR JOURNEY
          </div>

          <h1>
            Learn without
            <br />
            <span>limits.</span>
          </h1>

          <p className="hero-description">
            One space for your courses, your ideas, and everything
            you're working towards. Welcome to a smarter way to learn.
          </p>

          <div className="learning-art" aria-hidden="true">
            <div className="art-orbit orbit-one"></div>
            <div className="art-orbit orbit-two"></div>
            <div className="art-spark spark-one">✦</div>
            <div className="art-spark spark-two">✧</div>

            <div className="art-book">
              <div className="book-spine"></div>
              <div className="book-page page-left">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div className="book-page page-right">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div className="book-cap">✦</div>
            </div>

            <div className="floating-note note-top">
              <span className="note-icon">✓</span>
              <span>
                <strong>Keep growing</strong>
                <small>One step at a time</small>
              </span>
            </div>

            <div className="floating-note note-bottom">
              <span className="note-icon note-purple">↗</span>
              <span>
                <strong>Future ready</strong>
                <small>Learn. Build. Achieve.</small>
              </span>
            </div>
          </div>
        </div>

        <footer className="hero-footer">
          <span>BUILT FOR CURIOUS MINDS</span>
          <span>LEARN · GROW · ACHIEVE</span>
        </footer>
      </section>

      <section className="form-panel">
        <div className="mobile-brand">
          <div className="brand">
            <div className="brand-mark">U</div>
            <span>Uni<span className="brand-light">Learn</span></span>
          </div>
        </div>

        <div className="auth-form-wrap">
          <div className="form-heading">
            <div className="form-eyebrow">
              {isLogin ? "WELCOME TO UNILEARN" : "START YOUR JOURNEY"}
            </div>
            <h2>{isLogin ? "Welcome back." : "Create your account."}</h2>
            <p>
              {isLogin
                ? "Enter your details to access your learning space."
                : "A few details and you're ready to get started."}
            </p>
          </div>

          <div className="auth-tabs">
            <button
              type="button"
              className={isLogin ? "auth-tab selected" : "auth-tab"}
              onClick={() => switchMode(true)}
            >
              Log in
            </button>
            <button
              type="button"
              className={!isLogin ? "auth-tab selected" : "auth-tab"}
              onClick={() => switchMode(false)}
            >
              Create account
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {!isLogin && (
              <>
                <label htmlFor="name">Full name</label>
                <input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  autoComplete="name"
                  required
                />

                <label htmlFor="role">I am a</label>
                <select
                  id="role"
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                </select>
              </>
            )}

            <label htmlFor="email">University email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder={isLogin ? "you@example.com" : undefined}
              autoComplete={isLogin ? "username" : "off"}
              required
            />

            <div className="password-label">
              <label htmlFor="password">Password</label>
              <button
                type="button"
                className="show-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={handleChange}
              placeholder={isLogin ? "Enter your password" : undefined}
              autoComplete={isLogin ? "current-password" : "off"}
              minLength={6}
              required
            />

            {message && (
              <div className={`form-message ${messageType === "success" ? "form-message-success" : "form-message-error"}`} role="status">
                {message}
              </div>
            )}

            <button
              className="submit-button"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : isLogin
                  ? "Log in to your account"
                  : "Create my account"}
              {!loading && <span>↗</span>}
            </button>
          </form>

          <div className="form-divider">
            <span></span>
            <small>YOUR LEARNING JOURNEY STARTS HERE</small>
            <span></span>
          </div>

          <p className="form-bottom">
            Need help accessing your account?{" "}
            <a href="mailto:support@example.com">Contact support</a>
          </p>
        </div>

        <footer className="form-footer">
          <span>© 2026 UniLearn LMS</span>
          <span>Designed for learning.</span>
        </footer>
      </section>
    </main>
  );
}

export default App;
