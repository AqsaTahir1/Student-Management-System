const express = require("express");
const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

// Get all courses
router.get("/", async (req, res) => {
  try {
    const [courses] = await pool.execute(`
      SELECT
        c.id,
        c.name,
        c.description,
        COUNT(s.id) AS enrolledCount
      FROM courses c
      LEFT JOIN students s ON c.id = s.course_id
      GROUP BY c.id
      ORDER BY c.id DESC
    `);

    res.json(courses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load courses." });
  }
});

// Add course
router.post("/", async (req, res) => {
  try {
    const name = req.body.name?.trim();
    const description = req.body.description?.trim() || "";

    if (!name || name.length < 2) {
      return res.status(400).json({
        message: "Course name must contain at least 2 characters."
      });
    }

    const [existing] = await pool.execute(
      "SELECT id FROM courses WHERE LOWER(name) = LOWER(?)",
      [name]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        message: "This course already exists."
      });
    }

    const [result] = await pool.execute(
      "INSERT INTO courses (name, description) VALUES (?, ?)",
      [name, description]
    );

    res.status(201).json({
      id: result.insertId,
      name,
      description,
      enrolledCount: 0
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to add course." });
  }
});

// Update course
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const name = req.body.name?.trim();
    const description = req.body.description?.trim() || "";

    if (!name || name.length < 2) {
      return res.status(400).json({
        message: "Course name must contain at least 2 characters."
      });
    }

    const [existing] = await pool.execute(
      "SELECT id FROM courses WHERE LOWER(name) = LOWER(?) AND id != ?",
      [name, id]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        message: "This course already exists."
      });
    }

    const [result] = await pool.execute(
      "UPDATE courses SET name = ?, description = ? WHERE id = ?",
      [name, description, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Course not found." });
    }

    const [updated] = await pool.execute(
      `SELECT c.id, c.name, c.description, COUNT(s.id) AS enrolledCount
       FROM courses c
       LEFT JOIN students s ON c.id = s.course_id
       WHERE c.id = ?
       GROUP BY c.id`,
      [id]
    );

    res.json(updated[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to update course." });
  }
});

// Delete course
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [assigned] = await pool.execute(
      "SELECT COUNT(*) AS total FROM students WHERE course_id = ?",
      [id]
    );

    if (Number(assigned[0].total) > 0) {
      return res.status(400).json({
        message: "Cannot delete this course because students are assigned to it."
      });
    }

    const [result] = await pool.execute(
      "DELETE FROM courses WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Course not found." });
    }

    res.json({ message: "Course deleted successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to delete course." });
  }
});

module.exports = router;