import express from "express";
import pool from "../config/db.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

router.get("/", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `select id, email, role, is_active,created_at from users order by created_at desc `,
    );
    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching users. Please try again later.",
    });
  }
});

export default router;
