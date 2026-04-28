import express from "express";
import pool from "../config/db.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// ============================================
// POST /api/projects - Create a new project
// ============================================
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name, description, team_id, priority, start_date, due_date } =
      req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!name || !team_id) {
      return res.status(400).json({
        success: false,
        message: "Project name and team ID are required",
      });
    }

    // Check if user is a member of the team
    const membershipCheck = await pool.query(`SELECT is_team_member($1, $2)`, [
      team_id,
      userId,
    ]);

    if (!membershipCheck.rows[0].is_team_member) {
      return res.status(403).json({
        success: false,
        message: "You must be a member of this team to create a project",
      });
    }

    // Create the project
    const result = await pool.query(
      `INSERT INTO projects (name, description, team_id, created_by, priority, start_date, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        name,
        description || null,
        team_id,
        userId,
        priority || "medium",
        start_date || null,
        due_date || null,
      ],
    );

    res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error creating project:", error);

    // Foreign key violation - team doesn't exist
    if (error.code === "23503") {
      return res.status(400).json({
        success: false,
        message: "Team does not exist",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create project",
    });
  }
});

// ============================================
// GET /api/projects - Get all projects for user
// ============================================
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT p.id, p.name, p.description, p.status, p.priority, 
              p.start_date, p.due_date, p.created_at,
              t.name as team_name,
              u.full_name as created_by_name
       FROM projects p
       JOIN teams t ON p.team_id = t.id
       JOIN team_members tm ON t.id = tm.team_id
       LEFT JOIN users u ON p.created_by = u.id
       WHERE tm.user_id = $1
       ORDER BY p.created_at DESC`,
      [userId],
    );

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch projects",
    });
  }
});

// ============================================
// GET /api/projects/:id - Get single project by ID
// ============================================
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // First, check if user has access to this project
    const accessCheck = await pool.query(
      `SELECT p.id, t.id as team_id
       FROM projects p
       JOIN teams t ON p.team_id = t.id
       JOIN team_members tm ON t.id = tm.team_id
       WHERE p.id = $1 AND tm.user_id = $2`,
      [id, userId],
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this project",
      });
    }

    // Get project details
    const result = await pool.query(
      `SELECT p.id, p.name, p.description, p.status, p.priority, 
              p.start_date, p.due_date, p.created_at, p.updated_at,
              t.name as team_name,
              u.full_name as created_by_name
       FROM projects p
       JOIN teams t ON p.team_id = t.id
       LEFT JOIN users u ON p.created_by = u.id
       WHERE p.id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch project",
    });
  }
});

// ============================================
// PUT /api/projects/:id - Update a project
// ============================================
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status, priority, start_date, due_date } =
      req.body;
    const userId = req.user.id;

    // Check if user has access and is the creator or admin
    const projectCheck = await pool.query(
      `SELECT p.created_by, t.id as team_id
       FROM projects p
       JOIN teams t ON p.team_id = t.id
       JOIN team_members tm ON t.id = tm.team_id
       WHERE p.id = $1 AND tm.user_id = $2`,
      [id, userId],
    );

    if (projectCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this project",
      });
    }

    const isCreator = projectCheck.rows[0].created_by === userId;

    // Check if user is team admin
    const adminCheck = await pool.query(
      `SELECT role FROM team_members 
       WHERE team_id = $1 AND user_id = $2 AND role = 'admin'`,
      [projectCheck.rows[0].team_id, userId],
    );

    const isAdmin = adminCheck.rows.length > 0;

    // Only creator or admin can update
    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message:
          "Only the project creator or team admin can update this project",
      });
    }

    // Update project using COALESCE for partial updates
    const result = await pool.query(
      `UPDATE projects 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           status = COALESCE($3, status),
           priority = COALESCE($4, priority),
           start_date = COALESCE($5, start_date),
           due_date = COALESCE($6, due_date)
       WHERE id = $7
       RETURNING *`,
      [name, description, status, priority, start_date, due_date, id],
    );

    res.json({
      success: true,
      message: "Project updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update project",
    });
  }
});

// ============================================
// DELETE /api/projects/:id - Delete a project
// ============================================
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user has access and is the creator or admin
    const projectCheck = await pool.query(
      `SELECT p.created_by, t.id as team_id
       FROM projects p
       JOIN teams t ON p.team_id = t.id
       JOIN team_members tm ON t.id = tm.team_id
       WHERE p.id = $1 AND tm.user_id = $2`,
      [id, userId],
    );

    if (projectCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this project",
      });
    }

    const isCreator = projectCheck.rows[0].created_by === userId;

    // Check if user is team admin
    const adminCheck = await pool.query(
      `SELECT role FROM team_members 
       WHERE team_id = $1 AND user_id = $2 AND role = 'admin'`,
      [projectCheck.rows[0].team_id, userId],
    );

    const isAdmin = adminCheck.rows.length > 0;

    // Only creator or admin can delete
    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message:
          "Only the project creator or team admin can delete this project",
      });
    }

    // Delete the project (cascade will delete tasks)
    await pool.query(`DELETE FROM projects WHERE id = $1`, [id]);

    res.json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete project",
    });
  }
});

export default router;
