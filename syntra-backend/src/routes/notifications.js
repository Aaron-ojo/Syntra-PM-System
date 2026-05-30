import express from "express";
import pool from "../config/db.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// GET /api/notifications - Get all notifications for current user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT id, type, title, content, data, is_read as read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId],
    );

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
    });
  }
});

// GET /api/notifications/unread-count - Get unread count
router.get("/unread-count", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT COUNT(*) as count
       FROM notifications
       WHERE user_id = $1 AND is_read = false`,
      [userId],
    );

    res.json({
      success: true,
      unreadCount: parseInt(result.rows[0].count),
    });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch unread count",
    });
  }
});

// PATCH /api/notifications/:id/read - Mark single notification as read
router.patch("/:id/read", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `UPDATE notifications 
       SET is_read = true, read_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark notification as read",
    });
  }
});

// PATCH /api/notifications/read-all - Mark all as read
router.patch("/read-all", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `UPDATE notifications 
       SET is_read = true, read_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND is_read = false
       RETURNING id`,
      [userId],
    );

    res.json({
      success: true,
      message: "All notifications marked as read",
      markedCount: result.rows.length,
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark notifications as read",
    });
  }
});

// DELETE /api/notifications/:id - Delete a notification
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `DELETE FROM notifications 
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete notification",
    });
  }
});

// DELETE /api/notifications/read/all - Delete all read notifications
router.delete("/read/all", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `DELETE FROM notifications 
       WHERE user_id = $1 AND is_read = true
       RETURNING id`,
      [userId],
    );

    res.json({
      success: true,
      message: "All read notifications deleted",
      deletedCount: result.rows.length,
    });
  } catch (error) {
    console.error("Error deleting read notifications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete read notifications",
    });
  }
});

export default router;
