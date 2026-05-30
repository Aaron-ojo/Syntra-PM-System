import express from "express";
import pool from "../config/db.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

async function createNotification(
  userId,
  type,
  title,
  content,
  taskId,
  commentId,
) {
  console.log("🔔 Creating notification for user:", userId, "type:", type);
  try {
    const result = await pool.query(
      `INSERT INTO notifications (user_id, type, title, content, data)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        userId,
        type,
        title,
        content,
        JSON.stringify({ task_id: taskId, comment_id: commentId }),
      ],
    );
    console.log("✅ Notification created with ID:", result.rows[0].id);
  } catch (error) {
    console.error("❌ Error creating notification:", error);
  }
}

router.post("/", authMiddleware, async (req, res) => {
  try {
    const { content, task_id, parent_comment_id, attachments } = req.body;
    const userId = req.user.id;

    // STEP 2: Validate required fields
    if (!content || !task_id) {
      return res.status(400).json({
        success: false,
        message: "Comment content and task ID are required",
      });
    }

    const accessCheck = await pool.query(
      `SELECT t.id, t.assigned_to, t.created_by, p.team_id
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       JOIN teams te ON p.team_id = te.id
       JOIN team_members tm ON te.id = tm.team_id
       WHERE t.id = $1 AND tm.user_id = $2`,
      [task_id, userId],
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this task",
      });
    }

    const task = accessCheck.rows[0];

    if (parent_comment_id) {
      const parentCheck = await pool.query(
        `SELECT id, task_id FROM comments WHERE id = $1`,
        [parent_comment_id],
      );

      if (parentCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Parent comment not found",
        });
      }

      if (parentCheck.rows[0].task_id !== task_id) {
        return res.status(400).json({
          success: false,
          message: "Parent comment must belong to the same task",
        });
      }
    }

    // STEP 5: Insert the comment
    const result = await pool.query(
      `INSERT INTO comments (content, task_id, user_id, parent_comment_id, attachments)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, content, task_id, user_id, parent_comment_id, attachments, created_at`,
      [content, task_id, userId, parent_comment_id || null, attachments || []],
    );

    const newComment = result.rows[0];

    // STEP 6: Create notification for task assignee (if different from commenter)
    // Only notify if task is assigned to someone and that person isn't the commenter
    if (task.assigned_to && task.assigned_to !== userId) {
      await createNotification(
        task.assigned_to,
        "comment_added",
        "New comment on your task",
        `${req.user.full_name || "Someone"} commented on a task assigned to you`,
        task_id,
        newComment.id,
      );
    }

    // STEP 7: Also notify task creator if different from assignee AND commenter
    if (
      task.created_by &&
      task.created_by !== userId &&
      task.created_by !== task.assigned_to
    ) {
      await createNotification(
        task.created_by,
        "comment_added",
        "New comment on your task",
        `${req.user.full_name || "Someone"} commented on a task you created`,
        task_id,
        newComment.id,
      );
    }

    // STEP 8: Return success response
    res.status(201).json({
      success: true,
      message: "Comment added successfully",
      data: newComment,
    });
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add comment",
    });
  }
});

router.get("/task/:taskId", authMiddleware, async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;

    // STEP 1: Check if user has access to this task
    const accessCheck = await pool.query(
      `SELECT t.id
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       JOIN teams te ON p.team_id = te.id
       JOIN team_members tm ON te.id = tm.team_id
       WHERE t.id = $1 AND tm.user_id = $2`,
      [taskId, userId],
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this task",
      });
    }

    // STEP 2: Get all comments for this task with user information
    const result = await pool.query(
      `SELECT c.id, c.content, c.task_id, c.parent_comment_id, c.attachments, 
              c.is_edited, c.created_at, c.updated_at,
              u.id as user_id, u.full_name as user_name, u.avatar_url
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.task_id = $1
       ORDER BY c.created_at ASC`,
      [taskId],
    );

    // STEP 3: Organize comments into a nested structure (parent with replies)
    // First, separate top-level comments (no parent) from replies
    const allComments = result.rows;
    const commentMap = {};
    const topLevelComments = [];

    // Build a map of all comments by ID
    allComments.forEach((comment) => {
      commentMap[comment.id] = { ...comment, replies: [] };
    });

    // Organize: if comment has parent, put it in parent's replies array
    allComments.forEach((comment) => {
      if (comment.parent_comment_id && commentMap[comment.parent_comment_id]) {
        commentMap[comment.parent_comment_id].replies.push(
          commentMap[comment.id],
        );
      } else if (!comment.parent_comment_id) {
        topLevelComments.push(commentMap[comment.id]);
      }
    });

    res.json({
      success: true,
      count: allComments.length,
      data: topLevelComments,
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch comments",
    });
  }
});

router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    // STEP 1: Validate content is provided
    if (!content) {
      return res.status(400).json({
        success: false,
        message: "Comment content is required",
      });
    }

    // STEP 2: Check if comment exists and user is the author
    const commentCheck = await pool.query(
      `SELECT id, user_id FROM comments WHERE id = $1`,
      [id],
    );

    if (commentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    if (commentCheck.rows[0].user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own comments",
      });
    }

    // STEP 3: Update comment - set is_edited to true
    const result = await pool.query(
      `UPDATE comments 
       SET content = $1,
           is_edited = true
       WHERE id = $2
       RETURNING id, content, task_id, user_id, parent_comment_id, attachments, is_edited, created_at, updated_at`,
      [content, id],
    );

    res.json({
      success: true,
      message: "Comment updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating comment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update comment",
    });
  }
});

// ============================================
// ENDPOINT 4: DELETE A COMMENT
// DELETE /api/comments/:id
// ============================================
// WHAT THIS DOES:
// - Deletes a comment
// - Comment author OR team admin can delete
// - Cascades to replies (if any)
// ============================================
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // STEP 1: Get comment details to check permissions
    const commentCheck = await pool.query(
      `SELECT c.id, c.user_id, t.id as task_id, p.team_id
       FROM comments c
       JOIN tasks t ON c.task_id = t.id
       JOIN projects p ON t.project_id = p.id
       WHERE c.id = $1`,
      [id],
    );

    if (commentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    const comment = commentCheck.rows[0];
    const isAuthor = comment.user_id === userId;

    // Check if user is team admin
    const adminCheck = await pool.query(
      `SELECT role FROM team_members 
       WHERE team_id = $1 AND user_id = $2 AND role = 'admin'`,
      [comment.team_id, userId],
    );

    const isAdmin = adminCheck.rows.length > 0;

    // Only author or admin can delete
    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete this comment",
      });
    }

    // STEP 2: Delete the comment (CASCADE will delete all replies)
    await pool.query(`DELETE FROM comments WHERE id = $1`, [id]);

    res.json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete comment",
    });
  }
});

// ============================================
// ENDPOINT 5: REPLY TO A COMMENT
// POST /api/comments/:id/replies
// ============================================
// WHAT THIS DOES:
// - Convenience endpoint for replying to a comment
// - Automatically sets parent_comment_id
// - Same as POST /api/comments but with parent_comment_id pre-filled
// ============================================
router.post("/:id/replies", authMiddleware, async (req, res) => {
  try {
    const parentCommentId = req.params.id;
    const { content, task_id, attachments } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!content || !task_id) {
      return res.status(400).json({
        success: false,
        message: "Comment content and task ID are required",
      });
    }

    // Check if parent comment exists and belongs to the same task
    const parentCheck = await pool.query(
      `SELECT id, task_id FROM comments WHERE id = $1`,
      [parentCommentId],
    );

    if (parentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Parent comment not found",
      });
    }

    if (parentCheck.rows[0].task_id !== task_id) {
      return res.status(400).json({
        success: false,
        message: "Reply must belong to the same task as parent comment",
      });
    }

    // Check user has access to the task
    const accessCheck = await pool.query(
      `SELECT t.id, t.assigned_to, t.created_by
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       JOIN teams te ON p.team_id = te.id
       JOIN team_members tm ON te.id = tm.team_id
       WHERE t.id = $1 AND tm.user_id = $2`,
      [task_id, userId],
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this task",
      });
    }

    const task = accessCheck.rows[0];

    // Create reply comment
    const result = await pool.query(
      `INSERT INTO comments (content, task_id, user_id, parent_comment_id, attachments)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, content, task_id, user_id, parent_comment_id, attachments, created_at`,
      [content, task_id, userId, parentCommentId, attachments || []],
    );

    const newReply = result.rows[0];

    // Create notification for the parent comment author
    // Get parent comment author
    const parentComment = await pool.query(
      `SELECT user_id FROM comments WHERE id = $1`,
      [parentCommentId],
    );

    const parentAuthorId = parentComment.rows[0].user_id;

    if (parentAuthorId !== userId) {
      await createNotification(
        parentAuthorId,
        "comment_reply",
        "Someone replied to your comment",
        `${req.user.full_name || "Someone"} replied to your comment`,
        task_id,
        newReply.id,
      );
    }

    res.status(201).json({
      success: true,
      message: "Reply added successfully",
      data: newReply,
    });
  } catch (error) {
    console.error("Error adding reply:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add reply",
    });
  }
});

export default router;
