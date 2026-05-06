// ============================================
// IMPORT DEPENDENCIES
// ============================================
// express - for creating route handlers
// pool - database connection from our config
// authMiddleware - verifies JWT token and attaches user to req.user
// ============================================
import express from "express";
import pool from "../config/db.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// ============================================
// HELPER FUNCTION: Create a notification
// This can be imported and used by other files (comments, tasks, etc.)
// ============================================
export async function createNotification(
  userId,
  type,
  title,
  content,
  data = {},
) {
  try {
    const result = await pool.query(
      `INSERT INTO notifications (user_id, type, title, content, data)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, type, title, content, data, is_read, created_at`,
      [userId, type, title, content, JSON.stringify(data)],
    );
    return result.rows[0];
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
}

// ============================================
// ENDPOINT 1: GET USER'S NOTIFICATIONS
// GET /api/notifications
// ============================================
// WHAT THIS DOES:
// - Returns all notifications for the logged-in user
// - Sorted by newest first
// - Can be filtered by read/unread status
// - Supports pagination (limit and offset)
// ============================================
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // STEP 1: Get query parameters for pagination and filtering
    // - limit: number of notifications per page (default 20)
    // - offset: number to skip (for pagination)
    // - is_read: filter by read status (true/false/all)
    const { limit = 20, offset = 0, is_read } = req.query;

    // STEP 2: Build the query with optional filters
    let query = `
      SELECT id, type, title, content, data, is_read, created_at
      FROM notifications
      WHERE user_id = $1
    `;

    const queryParams = [userId];
    let paramCounter = 2;

    // Add filter for read/unread if provided
    if (is_read === "true") {
      query += ` AND is_read = true`;
    } else if (is_read === "false") {
      query += ` AND is_read = false`;
    }

    // Add sorting and pagination
    query += ` ORDER BY created_at DESC LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
    queryParams.push(limit, offset);

    // STEP 3: Execute the query
    const result = await pool.query(query, queryParams);

    // STEP 4: Get total count for pagination info
    let countQuery = `SELECT COUNT(*) FROM notifications WHERE user_id = $1`;
    if (is_read === "true") {
      countQuery += ` AND is_read = true`;
    } else if (is_read === "false") {
      countQuery += ` AND is_read = false`;
    }

    const countResult = await pool.query(countQuery, [userId]);
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: offset + result.rows.length < totalCount,
      },
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
    });
  }
});

// ============================================
// ENDPOINT 2: GET UNREAD NOTIFICATION COUNT
// GET /api/notifications/unread-count
// ============================================
// WHAT THIS DOES:
// - Returns the number of unread notifications
// - Useful for showing a badge on the frontend (e.g., 🔔 3)
// - Lightweight endpoint for frequent polling
// ============================================
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

// ============================================
// ENDPOINT 3: MARK A SINGLE NOTIFICATION AS READ
// PATCH /api/notifications/:id/read
// ============================================
// WHAT THIS DOES:
// - Marks a specific notification as read
// - Sets is_read = true and records read_at timestamp
// - User can only mark their own notifications
// ============================================
router.patch("/:id/read", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // STEP 1: Verify the notification belongs to the user
    const checkResult = await pool.query(
      `SELECT id FROM notifications WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    // STEP 2: Mark as read
    const result = await pool.query(
      `UPDATE notifications 
       SET is_read = true, read_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, is_read, read_at`,
      [id],
    );

    res.json({
      success: true,
      message: "Notification marked as read",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark notification as read",
    });
  }
});

// ============================================
// ENDPOINT 4: MARK ALL NOTIFICATIONS AS READ
// PATCH /api/notifications/read-all
// ============================================
// WHAT THIS DOES:
// - Marks ALL notifications for the user as read
// - Useful for "Mark all as read" button in UI
// - Returns the count of notifications marked
// ============================================
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

// ============================================
// ENDPOINT 5: DELETE A NOTIFICATION
// DELETE /api/notifications/:id
// ============================================
// WHAT THIS DOES:
// - Deletes a specific notification
// - User can only delete their own notifications
// - Useful for clearing notifications individually
// ============================================
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // STEP 1: Verify the notification belongs to the user
    const checkResult = await pool.query(
      `SELECT id FROM notifications WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    // STEP 2: Delete the notification
    await pool.query(`DELETE FROM notifications WHERE id = $1`, [id]);

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

// ============================================
// ENDPOINT 6: DELETE ALL READ NOTIFICATIONS
// DELETE /api/notifications/read/all
// ============================================
// WHAT THIS DOES:
// - Deletes all read notifications for the user
// - Keeps unread notifications intact
// - Good for cleaning up old notifications
// ============================================
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
