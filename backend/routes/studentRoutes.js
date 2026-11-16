
const express = require("express");
const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

// Validate student ID
const isValidId = (id) =>
  Number.isInteger(Number(id)) && Number(id) > 0;

// Get all students
router.get("/", async (req, res) => {
  try {
    const [students] = await pool.execute(`
      SELECT
        s.id,
        s.name,
        s.email,
        s.course_id AS courseId,
        c.name AS course,
        s.status
      FROM students s
      INNER JOIN courses c ON s.course_id = c.id
      ORDER BY s.id DESC
    `);

    res.json(students);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load students." });
  }
});

// Get single student by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ message: "Invalid student ID." });
    }

    const [students] = await pool.execute(`
      SELECT
        s.id,
        s.name,
        s.email,
        s.course_id AS courseId,
        c.name AS course,
        s.status
      FROM students s
      INNER JOIN courses c ON s.course_id = c.id
      WHERE s.id = ?
    `, [id]);

    if (students.length === 0) {
      return res.status(404).json({ message: "Student not found." });
    }

    res.json(students[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load student." });
  }
});

// Add student
router.post("/", async (req, res) => {
  try {
    const { name, email, courseId, status } = req.body;

    if (!name?.trim() || !email?.trim() || !courseId) {
      return res.status(400).json({
        message: "Name, email and course are required."
      });
    }

    if (!Number.isInteger(Number(courseId)) || Number(courseId) <= 0) {
      return res.status(400).json({ message: "Invalid course ID." });
    }

    if (!["Active", "Inactive"].includes(status)) {
      return res.status(400).json({
        message: "Invalid student status."
      });
    }

    const [duplicate] = await pool.execute(
      "SELECT id FROM students WHERE LOWER(email) = LOWER(?)",
      [email.trim()]
    );

    if (duplicate.length > 0) {
      return res.status(409).json({
        message: "This email address is already registered."
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO students (name, email, course_id, status)
       VALUES (?, ?, ?, ?)`,
      [name.trim(), email.trim().toLowerCase(), Number(courseId), status]
    );

    const [created] = await pool.execute(`
      SELECT s.id, s.name, s.email,
             s.course_id AS courseId,
             c.name AS course, s.status
      FROM students s
      INNER JOIN courses c ON s.course_id = c.id
      WHERE s.id = ?
    `, [result.insertId]);

    res.status(201).json(created[0]);
  } catch (error) {
    console.error(error);

    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({
        message: "Please select a valid course."
      });
    }

    res.status(500).json({ message: "Unable to add student." });
  }
});

// Update student
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, courseId, status } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({ message: "Invalid student ID." });
    }

    if (!name?.trim() || !email?.trim() || !courseId) {
      return res.status(400).json({
        message: "Name, email and course are required."
      });
    }

    if (!Number.isInteger(Number(courseId)) || Number(courseId) <= 0) {
      return res.status(400).json({ message: "Invalid course ID." });
    }

    if (!["Active", "Inactive"].includes(status)) {
      return res.status(400).json({
        message: "Invalid student status."
      });
    }

    const [existing] = await pool.execute(
      "SELECT id FROM students WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: "Student not found." });
    }

    const [duplicate] = await pool.execute(
      "SELECT id FROM students WHERE LOWER(email) = LOWER(?) AND id != ?",
      [email.trim(), id]
    );

    if (duplicate.length > 0) {
      return res.status(409).json({
        message: "This email address is already registered."
      });
    }

    await pool.execute(
      `UPDATE students
       SET name = ?, email = ?, course_id = ?, status = ?
       WHERE id = ?`,
      [name.trim(), email.trim().toLowerCase(), Number(courseId), status, id]
    );

    const [updated] = await pool.execute(`
      SELECT s.id, s.name, s.email,
             s.course_id AS courseId,
             c.name AS course, s.status
      FROM students s
      INNER JOIN courses c ON s.course_id = c.id
      WHERE s.id = ?
    `, [id]);

    res.json(updated[0]);
  } catch (error) {
    console.error(error);

    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({
        message: "Please select a valid course."
      });
    }

    res.status(500).json({ message: "Unable to update student." });
  }
});

// Delete student
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ message: "Invalid student ID." });
    }

    const [result] = await pool.execute(
      "DELETE FROM students WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Student not found." });
    }

    res.json({ message: "Student deleted successfully." });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Unable to delete student."
    });
  }
});

module.exports = router;
