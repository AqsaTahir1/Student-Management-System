
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./App.css";

const API = "http://localhost:5000/api";

const emptyStudent = {
  name: "",
  email: "",
  courseId: "",
  status: "Active"
};

const emptyCourse = {
  name: "",
  description: ""
};

const api = axios.create({
  baseURL: API
});

function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem("studentMS_token") || ""
  );

  const [admin, setAdmin] = useState(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newStudent, setNewStudent] = useState(emptyStudent);
  const [errors, setErrors] = useState({});

  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [newCourse, setNewCourse] = useState(emptyCourse);
  const [courseError, setCourseError] = useState("");

  const [statusFilter, setStatusFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("default");
  const [currentPage, setCurrentPage] = useState(1);
  const [studentsPerPage, setStudentsPerPage] = useState(5);

  // Attach JWT token to protected API requests.
  useEffect(() => {
    if (token) {
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common.Authorization;
    }
  }, [token]);

  // Load admin profile and dashboard records after login.
  useEffect(() => {
    if (!token) return;

    async function loadDashboard() {
      setLoading(true);
      setPageError("");

      try {
        const [profileResponse, studentsResponse, coursesResponse] =
          await Promise.all([
            api.get("/auth/me"),
            api.get("/students"),
            api.get("/courses")
          ]);

        setAdmin(profileResponse.data.admin);
        setStudents(studentsResponse.data);
        setCourses(coursesResponse.data);
      } catch (error) {
        console.error(error);

        if (error.response?.status === 401) {
          logout();
        } else {
          setPageError(
            error.response?.data?.message ||
            "Unable to load dashboard. Check that the backend and database are running."
          );
        }
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [token]);

  function logout() {
    localStorage.removeItem("studentMS_token");
    setToken("");
    setAdmin(null);
    setStudents([]);
    setCourses([]);
    setLoginPassword("");
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const response = await api.post("/auth/login", {
        email: loginEmail,
        password: loginPassword
      });

      localStorage.setItem("studentMS_token", response.data.token);
      setToken(response.data.token);
      setAdmin(response.data.admin);
      setLoginPassword("");
    } catch (error) {
      setLoginError(
        error.response?.data?.message || "Unable to log in. Try again."
      );
    } finally {
      setLoginLoading(false);
    }
  }

  // Student statistics.
  const totalStudents = students.length;
  const activeStudents = students.filter(
    student => student.status === "Active"
  ).length;
  const inactiveStudents = students.filter(
    student => student.status === "Inactive"
  ).length;
  const totalCourses = courses.length;

  const activePercentage = totalStudents
    ? Math.round((activeStudents / totalStudents) * 100)
    : 0;

  const inactivePercentage = totalStudents
    ? Math.round((inactiveStudents / totalStudents) * 100)
    : 0;

  const courseStatistics = useMemo(() => {
    return courses.map(course => {
      const assigned = students.filter(
        student => Number(student.courseId) === Number(course.id)
      );

      return {
        ...course,
        total: assigned.length,
        active: assigned.filter(s => s.status === "Active").length,
        inactive: assigned.filter(s => s.status === "Inactive").length
      };
    });
  }, [courses, students]);

  const largestCourse = [...courseStatistics].sort(
    (a, b) => b.total - a.total
  )[0];

  const maximumCourseStudents = Math.max(
    ...courseStatistics.map(course => course.total),
    1
  );

  // Search, filter and sort.
  const filteredStudents = students.filter(student => {
    const search = searchTerm.toLowerCase();

    const matchesSearch =
      `${student.name} ${student.email} ${student.course}`
        .toLowerCase()
        .includes(search);

    const matchesStatus =
      statusFilter === "All" || student.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    switch (sortOption) {
      case "name-asc":
        return a.name.localeCompare(b.name);
      case "name-desc":
        return b.name.localeCompare(a.name);
      case "course-asc":
        return a.course.localeCompare(b.course);
      case "course-desc":
        return b.course.localeCompare(a.course);
      default:
        return a.id - b.id;
    }
  });

  const totalPages = Math.ceil(sortedStudents.length / studentsPerPage);
  const safeCurrentPage = Math.min(currentPage, Math.max(totalPages, 1));
  const startIndex = (safeCurrentPage - 1) * studentsPerPage;

  const paginatedStudents = sortedStudents.slice(
    startIndex,
    startIndex + studentsPerPage
  );

  // Student form helpers.
  function handleStudentChange(e) {
    const { name, value } = e.target;

    setNewStudent(previous => ({
      ...previous,
      [name]: value
    }));

    setErrors(previous => ({
      ...previous,
      [name]: ""
    }));
  }

  function validateStudentForm() {
    const nextErrors = {};
    const name = newStudent.name.trim();
    const email = newStudent.email.trim();

    if (!name) {
      nextErrors.name = "Student name is required.";
    } else if (name.length < 3) {
      nextErrors.name = "Name must contain at least 3 characters.";
    } else if (!/^[\p{L}][\p{L}\s'-]*$/u.test(name)) {
      nextErrors.name = "Enter a valid name.";
    }

    if (!email) {
      nextErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = "Enter a valid email address.";
    } else if (
      students.some(student =>
        student.email.toLowerCase() === email.toLowerCase() &&
        student.id !== editingId
      )
    ) {
      nextErrors.email = "This email is already registered.";
    }

    if (!newStudent.courseId) {
      nextErrors.courseId = "Please select a course.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function resetStudentForm() {
    setNewStudent(emptyStudent);
    setErrors({});
    setEditingId(null);
    setShowForm(false);
  }

  function openAddStudentForm() {
    if (courses.length === 0) {
      alert("Please add a course before adding a student.");
      return;
    }

    setNewStudent({
      ...emptyStudent,
      courseId: String(courses[0].id)
    });
    setEditingId(null);
    setErrors({});
    setShowForm(true);
    document.getElementById("students")?.scrollIntoView({
      behavior: "smooth"
    });
  }

  function handleEditStudent(student) {
    setNewStudent({
      name: student.name,
      email: student.email,
      courseId: String(student.courseId),
      status: student.status
    });

    setEditingId(student.id);
    setErrors({});
    setShowForm(true);
    document.getElementById("students")?.scrollIntoView({
      behavior: "smooth"
    });
  }

  async function handleStudentSubmit(e) {
    e.preventDefault();

    if (!validateStudentForm()) return;

    const payload = {
      name: newStudent.name.trim(),
      email: newStudent.email.trim(),
      courseId: Number(newStudent.courseId),
      status: newStudent.status
    };

    try {
      if (editingId !== null) {
        const response = await api.put(
          `/students/${editingId}`,
          payload
        );

        setStudents(previous =>
          previous.map(student =>
            student.id === editingId ? response.data : student
          )
        );
      } else {
        const response = await api.post("/students", payload);
        setStudents(previous => [...previous, response.data]);
      }

      setCurrentPage(1);
      resetStudentForm();
      setPageError("");
    } catch (error) {
      const message =
        error.response?.data?.message || "Unable to save student.";

      if (message.toLowerCase().includes("email")) {
        setErrors(previous => ({ ...previous, email: message }));
      } else {
        alert(message);
      }
    }
  }

  async function handleDeleteStudent(id) {
    if (!window.confirm("Are you sure you want to delete this student?")) {
      return;
    }

    try {
      await api.delete(`/students/${id}`);
      setStudents(previous => previous.filter(student => student.id !== id));
    } catch (error) {
      alert(error.response?.data?.message || "Unable to delete student.");
    }
  }

  // Course management.
  function openAddCourseForm() {
    setNewCourse(emptyCourse);
    setEditingCourse(null);
    setCourseError("");
    setShowCourseForm(true);
  }

  function handleEditCourse(course) {
    setNewCourse({
      name: course.name,
      description: course.description || ""
    });
    setEditingCourse(course.id);
    setCourseError("");
    setShowCourseForm(true);
  }

  function handleCourseChange(e) {
    setNewCourse(previous => ({
      ...previous,
      [e.target.name]: e.target.value
    }));
    setCourseError("");
  }

  function resetCourseForm() {
    setNewCourse(emptyCourse);
    setEditingCourse(null);
    setCourseError("");
    setShowCourseForm(false);
  }

  async function handleCourseSubmit(e) {
    e.preventDefault();

    const name = newCourse.name.trim();

    if (name.length < 2) {
      setCourseError("Course name must contain at least 2 characters.");
      return;
    }

    try {
      if (editingCourse !== null) {
        const response = await api.put(`/courses/${editingCourse}`, {
          name,
          description: newCourse.description
        });

        setCourses(previous =>
          previous.map(course =>
            course.id === editingCourse ? response.data : course
          )
        );

        // Refresh students so their displayed course names stay current.
        const studentsResponse = await api.get("/students");
        setStudents(studentsResponse.data);
      } else {
        const response = await api.post("/courses", {
          name,
          description: newCourse.description
        });

        setCourses(previous => [...previous, response.data]);
      }

      resetCourseForm();
      setPageError("");
    } catch (error) {
      setCourseError(
        error.response?.data?.message || "Unable to save course."
      );
    }
  }

  async function handleDeleteCourse(course) {
    if (!window.confirm(`Are you sure you want to delete ${course.name}?`)) {
      return;
    }

    try {
      await api.delete(`/courses/${course.id}`);
      setCourses(previous =>
        previous.filter(item => item.id !== course.id)
      );
    } catch (error) {
      alert(error.response?.data?.message || "Unable to delete course.");
    }
  }

  // Login screen.
  if (!token) {
    return (
      <div className="login-page">
        <form className="login-card" onSubmit={handleLogin}>
          <div className="login-logo">S</div>
          <h1>StudentMS</h1>
          <p className="login-subtitle">Admin Login</p>

          {loginError && (
            <p className="login-error">{loginError}</p>
          )}

          <label htmlFor="loginEmail">Email Address</label>
          <input
            id="loginEmail"
            type="email"
            placeholder="Enter admin email"
            value={loginEmail}
            onChange={e => setLoginEmail(e.target.value)}
            required
          />

          <label htmlFor="loginPassword">Password</label>
          <input
            id="loginPassword"
            type="password"
            placeholder="Enter password"
            value={loginPassword}
            onChange={e => setLoginPassword(e.target.value)}
            required
          />

          <button type="submit" disabled={loginLoading}>
            {loginLoading ? "Logging in..." : "Login"}
          </button>

          <small>Authorized administrators only.</small>
        </form>
      </div>
    );
  }

  if (loading) {
    return <div className="loading-screen">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">S</div>
          <h2>StudentMS</h2>
        </div>

        <p className="nav-heading">MAIN MENU</p>

        <nav className="sidebar-nav">
          <a className="nav-link active" href="#dashboard">▦ Dashboard</a>
          <a className="nav-link" href="#students">👨‍🎓 Students</a>
          <a className="nav-link" href="#courses">📚 Courses</a>
          <a className="nav-link" href="#analytics">📊 Analytics</a>
        </nav>

        <div className="sidebar-footer">
          <p>Student Management System</p>
          <small>Version 3.0</small>
        </div>
      </aside>

      <main className="main-content" id="dashboard">
        <header className="topbar">
          <div className="page-heading">
            <span className="welcome-label">OVERVIEW</span>
            <h1>Dashboard</h1>
            <p>Welcome to your student management system.</p>
          </div>

          <div className="admin-profile">
            <div className="profile-avatar">
              {(admin?.name || "A").charAt(0).toUpperCase()}
            </div>
            <div className="profile-details">
              <strong>{admin?.name || "Admin"}</strong>
              <small>Administrator</small>
            </div>
            <button className="logout-button" onClick={logout}>
              Logout
            </button>
          </div>
        </header>

        {pageError && <p className="page-error">{pageError}</p>}

        <section className="stats-container">
          <div className="stat-card">
            <div className="stat-top">
              <div className="stat-icon blue-icon">👨‍🎓</div>
              <span className="stat-label">All Records</span>
            </div>
            <h3>Total Students</h3>
            <h2>{totalStudents}</h2>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <div className="stat-icon green-icon">✓</div>
              <span className="stat-label">Currently Active</span>
            </div>
            <h3>Active Students</h3>
            <h2>{activeStudents}</h2>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <div className="stat-icon purple-icon">📚</div>
              <span className="stat-label">Available</span>
            </div>
            <h3>Total Courses</h3>
            <h2>{totalCourses}</h2>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <div className="stat-icon orange-icon">⏸</div>
              <span className="stat-label">Not Active</span>
            </div>
            <h3>Inactive Students</h3>
            <h2>{inactiveStudents}</h2>
          </div>
        </section>

        <section className="analytics-section" id="analytics">
          <div className="analytics-heading">
            <div>
              <h2>Dashboard Analytics</h2>
              <p>Overview of student enrollment and activity.</p>
            </div>
          </div>

          <div className="analytics-grid">
            <div className="analytics-card">
              <h3>Student Status</h3>
              <p className="chart-subtitle">
                Active and inactive student distribution
              </p>

              <div className="status-chart">
                <div className="status-chart-row">
                  <div className="chart-label">
                    <span>Active Students</span>
                    <strong>{activeStudents}</strong>
                  </div>
                  <div className="chart-track">
                    <div
                      className="chart-bar active-bar"
                      style={{ width: `${activePercentage}%` }}
                    />
                  </div>
                  <span className="chart-percentage">{activePercentage}%</span>
                </div>

                <div className="status-chart-row">
                  <div className="chart-label">
                    <span>Inactive Students</span>
                    <strong>{inactiveStudents}</strong>
                  </div>
                  <div className="chart-track">
                    <div
                      className="chart-bar inactive-bar"
                      style={{ width: `${inactivePercentage}%` }}
                    />
                  </div>
                  <span className="chart-percentage">{inactivePercentage}%</span>
                </div>
              </div>

              <div className="chart-total">
                Total Students: <strong>{totalStudents}</strong>
              </div>
            </div>

            <div className="analytics-card">
              <h3>Course Distribution</h3>
              <p className="chart-subtitle">
                Students enrolled in each course
              </p>

              {courseStatistics.length > 0 ? (
                <div className="course-chart">
                  {courseStatistics.map(course => (
                    <div className="course-chart-row" key={course.id}>
                      <div className="course-chart-heading">
                        <span>{course.name}</span>
                        <strong>{course.total}</strong>
                      </div>
                      <div className="chart-track">
                        <div
                          className="chart-bar course-bar"
                          style={{
                            width: `${(course.total / maximumCourseStudents) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="chart-empty">No courses available.</p>
              )}
            </div>
          </div>

          <div className="analytics-card course-summary">
            <h3>Enrollment Summary</h3>
            {largestCourse?.total > 0 ? (
              <p>
                Most popular course: <strong>{largestCourse.name}</strong> with{" "}
                <strong>{largestCourse.total}</strong> student(s).
              </p>
            ) : (
              <p>No student enrollments available yet.</p>
            )}
            <p>
              Total courses: <strong>{totalCourses}</strong> | Total
              enrollments: <strong>{totalStudents}</strong>
            </p>
          </div>
        </section>

        <section className="management-section" id="courses">
          <div className="section-heading">
            <div>
              <h2>Course Management</h2>
              <p>Add, update and manage available courses.</p>
            </div>
            <button className="add-button" onClick={openAddCourseForm}>
              <span>+</span> Add Course
            </button>
          </div>

          {showCourseForm && (
            <form className="course-form" onSubmit={handleCourseSubmit}>
              <div className="form-heading">
                <div>
                  <h3>{editingCourse !== null ? "Edit Course" : "Add New Course"}</h3>
                  <p>Enter the course information below.</p>
                </div>
                <button type="button" className="form-close" onClick={resetCourseForm}>×</button>
              </div>

              <label htmlFor="courseName">Course Name</label>
              <input
                id="courseName"
                name="name"
                value={newCourse.name}
                onChange={handleCourseChange}
                placeholder="Enter course name"
                required
              />

              {courseError && <p className="validation-error">{courseError}</p>}

              <label htmlFor="courseDescription">Description (Optional)</label>
              <textarea
                id="courseDescription"
                name="description"
                rows="3"
                value={newCourse.description}
                onChange={handleCourseChange}
                placeholder="Enter a short course description"
              />

              <div className="form-buttons">
                <button className="save-button" type="submit">
                  {editingCourse !== null ? "Update Course" : "Save Course"}
                </button>
                <button className="cancel-button" type="button" onClick={resetCourseForm}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="course-cards">
            {courses.length > 0 ? courses.map(course => (
              <div className="course-card" key={course.id}>
                <div className="course-card-top">
                  <div className="course-card-icon">📚</div>
                  <span className="course-count">{course.enrolledCount ?? 0} Students</span>
                </div>
                <h3>{course.name}</h3>
                <p>{course.description || "Manage students enrolled in this course."}</p>
                <div className="course-card-actions">
                  <button className="edit-button" onClick={() => handleEditCourse(course)}>Edit</button>
                  <button className="delete-button" onClick={() => handleDeleteCourse(course)}>Delete</button>
                </div>
              </div>
            )) : (
              <p className="empty-message">No courses available. Click Add Course to create one.</p>
            )}
          </div>
        </section>

        <section className="students-section" id="students">
          <div className="section-heading">
            <div>
              <h2>Student Records</h2>
              <p>Manage and organize your student information.</p>
            </div>
            <button className="add-button" onClick={openAddStudentForm}>
              <span>+</span> Add Student
            </button>
          </div>

          <div className="controls-container">
            <div className="search-wrapper">
              <span className="search-icon">⌕</span>
              <input
                className="search-input"
                placeholder="Search by name, email or course..."
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div className="filter-buttons">
              {["All", "Active", "Inactive"].map(filter => (
                <button
                  key={filter}
                  className={statusFilter === filter ? "filter-active" : ""}
                  onClick={() => {
                    setStatusFilter(filter);
                    setCurrentPage(1);
                  }}
                >
                  {filter === "All" ? "All Students" : filter}
                </button>
              ))}
            </div>

            <div className="sorting-container">
              <label htmlFor="sortStudents">Sort By:</label>
              <select
                id="sortStudents"
                className="sort-select"
                value={sortOption}
                onChange={e => {
                  setSortOption(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="default">Default Order</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="course-asc">Course (A-Z)</option>
                <option value="course-desc">Course (Z-A)</option>
              </select>
            </div>
          </div>

          {showForm && (
            <form className="student-form" onSubmit={handleStudentSubmit} noValidate>
              <div className="form-heading">
                <div>
                  <h3>{editingId !== null ? "Edit Student" : "Add New Student"}</h3>
                  <p>Enter the student details below.</p>
                </div>
                <button type="button" className="form-close" onClick={resetStudentForm}>×</button>
              </div>

              <label htmlFor="studentName">Student Name</label>
              <input
                id="studentName"
                name="name"
                value={newStudent.name}
                onChange={handleStudentChange}
                placeholder="Enter student name"
              />
              {errors.name && <p className="validation-error">{errors.name}</p>}

              <label htmlFor="studentEmail">Email Address</label>
              <input
                id="studentEmail"
                name="email"
                type="email"
                value={newStudent.email}
                onChange={handleStudentChange}
                placeholder="Enter email address"
              />
              {errors.email && <p className="validation-error">{errors.email}</p>}

              <label htmlFor="studentCourse">Course</label>
              <select
                id="studentCourse"
                name="courseId"
                value={newStudent.courseId}
                onChange={handleStudentChange}
              >
                <option value="">Select a course</option>
                {courses.map(course => (
                  <option value={course.id} key={course.id}>{course.name}</option>
                ))}
              </select>
              {errors.courseId && <p className="validation-error">{errors.courseId}</p>}

              <label htmlFor="studentStatus">Status</label>
              <select
                id="studentStatus"
                name="status"
                value={newStudent.status}
                onChange={handleStudentChange}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>

              <div className="form-buttons">
                <button type="submit" className="save-button">
                  {editingId !== null ? "Update Student" : "Save Student"}
                </button>
                <button type="button" className="cancel-button" onClick={resetStudentForm}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Student Name</th>
                  <th>Email Address</th>
                  <th>Course</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedStudents.length > 0 ? paginatedStudents.map((student, index) => (
                  <tr key={student.id}>
                    <td>{startIndex + index + 1}</td>
                    <td className="student-name">{student.name}</td>
                    <td>{student.email}</td>
                    <td>{student.course}</td>
                    <td>
                      <span className={`status ${student.status === "Active" ? "active-status" : "inactive-status"}`}>
                        {student.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="edit-button" onClick={() => handleEditStudent(student)}>Edit</button>
                        <button className="delete-button" onClick={() => handleDeleteStudent(student.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6" className="empty-message">
                      No students found. Try changing your search or filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {sortedStudents.length > 0 && (
            <div className="pagination-container">
              <div className="pagination-info">
                <span>
                  Showing {startIndex + 1} to{" "}
                  {Math.min(startIndex + studentsPerPage, sortedStudents.length)}{" "}
                  of {sortedStudents.length} students
                </span>
                <div className="page-size">
                  <label htmlFor="pageSize">Show:</label>
                  <select
                    id="pageSize"
                    value={studentsPerPage}
                    onChange={e => {
                      setStudentsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                  </select>
                </div>
              </div>

              <div className="pagination-buttons">
                <button
                  onClick={() => setCurrentPage(safeCurrentPage - 1)}
                  disabled={safeCurrentPage === 1}
                >
                  Previous
                </button>

                {Array.from({ length: totalPages }, (_, index) => index + 1).map(page => (
                  <button
                    key={page}
                    className={safeCurrentPage === page ? "page-active" : ""}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(safeCurrentPage + 1)}
                  disabled={safeCurrentPage === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>

        <footer className="dashboard-footer">
          <p>Student Management System © 2026</p>
          <p>Designed for better student management.</p>
        </footer>
      </main>
    </div>
  );
}

export default App;
