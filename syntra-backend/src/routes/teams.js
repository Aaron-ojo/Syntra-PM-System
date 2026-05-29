import express from "express";
import pool from "../config/db.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// ============================================
// POST /api/teams - Create a team
// ============================================
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.user.id;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Team name is required",
      });
    }

    const teamResult = await pool.query(
      `INSERT INTO teams (name, description, created_by)
       VALUES ($1, $2, $3)
       RETURNING id, name, description, created_by, created_at`,
      [name, description || null, userId],
    );

    const team = teamResult.rows[0];

    await pool.query(
      `INSERT INTO team_members (team_id, user_id, role)
       VALUES ($1, $2, $3)`,
      [team.id, userId, "admin"],
    );

    res.status(201).json({
      success: true,
      message: "Team created successfully",
      data: team,
    });
  } catch (error) {
    console.error("Error creating team:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create team",
    });
  }
});

// ============================================
// GET /api/teams - Get all teams for current user
// ============================================
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT teams.id, teams.name, teams.description, teams.created_by, 
              team_members.role, users.full_name as created_by_name
       FROM team_members
       JOIN teams ON team_members.team_id = teams.id
       JOIN users ON teams.created_by = users.id
       WHERE team_members.user_id = $1
       ORDER BY teams.created_at DESC`,
      [userId],
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching teams:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch teams",
    });
  }
});

// ============================================
// GET /api/teams/:id - Get single team with members
// ============================================
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const membershipCheck = await pool.query(`SELECT is_team_member($1, $2)`, [
      id,
      userId,
    ]);

    if (!membershipCheck.rows[0].is_team_member) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this team",
      });
    }

    const teamResult = await pool.query(
      `SELECT t.id, t.name, t.description, t.created_at,
              u.full_name as created_by_name
       FROM teams t
       LEFT JOIN users u ON t.created_by = u.id
       WHERE t.id = $1`,
      [id],
    );

    if (teamResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    const membersResult = await pool.query(
      `SELECT u.id, u.email, u.full_name, tm.role, tm.joined_at
       FROM team_members tm
       JOIN users u ON tm.user_id = u.id
       WHERE tm.team_id = $1
       ORDER BY tm.joined_at ASC`,
      [id],
    );

    const team = teamResult.rows[0];
    team.members = membersResult.rows;

    res.json({
      success: true,
      data: team,
    });
  } catch (error) {
    console.error("Error fetching team details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch team details",
    });
  }
});

// ============================================
// POST /api/teams/:id/members - Add member to team (admin only)
// ============================================
router.post("/:id/members", authMiddleware, async (req, res) => {
  try {
    const { id: teamId } = req.params;
    const { userId, role } = req.body;
    const currentUserId = req.user.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    // Check if current user is admin
    const adminCheck = await pool.query(
      `SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2`,
      [teamId, currentUserId],
    );

    if (adminCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this team",
      });
    }

    if (adminCheck.rows[0].role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only team admins can add members",
      });
    }

    // Check if user exists
    const userCheck = await pool.query(`SELECT id FROM users WHERE id = $1`, [
      userId,
    ]);

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user is already a member
    const memberCheck = await pool.query(
      `SELECT id FROM team_members WHERE team_id = $1 AND user_id = $2`,
      [teamId, userId],
    );

    if (memberCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "User is already a member of this team",
      });
    }

    // Add member
    const result = await pool.query(
      `INSERT INTO team_members (team_id, user_id, role)
       VALUES ($1, $2, $3) 
       RETURNING team_id, user_id, role, joined_at`,
      [teamId, userId, role || "member"],
    );

    res.status(201).json({
      success: true,
      message: "Member added successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error adding team member:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add user to team",
    });
  }
});

// ============================================
// PUT /api/teams/:id - Update team (admin only)
// ============================================
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id: teamId } = req.params;
    const { name, description } = req.body;
    const currentUserId = req.user.id;

    // Check if current user is admin
    const adminCheck = await pool.query(
      `SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2`,
      [teamId, currentUserId],
    );

    if (adminCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this team",
      });
    }

    if (adminCheck.rows[0].role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only team admins can update team details",
      });
    }

    // Update team
    const result = await pool.query(
      `UPDATE teams
       SET name = COALESCE($1, name), 
           description = COALESCE($2, description) 
       WHERE id = $3 
       RETURNING id, name, description, created_by, created_at`,
      [name, description, teamId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    res.json({
      success: true,
      message: "Team updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating team:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update team",
    });
  }
});

// ============================================
// DELETE /api/teams/:id/members/:userId - Remove member (admin only)
// ============================================
router.delete("/:id/members/:userId", authMiddleware, async (req, res) => {
  try {
    const { id: teamId, userId } = req.params;
    const currentUserId = req.user.id;

    // Prevent self-removal
    if (currentUserId === userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot remove yourself from the team",
      });
    }

    // Check if current user is admin
    const adminCheck = await pool.query(
      `SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2`,
      [teamId, currentUserId],
    );

    if (adminCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this team",
      });
    }

    if (adminCheck.rows[0].role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only team admins can remove members",
      });
    }

    // Remove member
    const result = await pool.query(
      `DELETE FROM team_members
       WHERE team_id = $1 AND user_id = $2
       RETURNING user_id`,
      [teamId, userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User is not a member of this team",
      });
    }

    res.json({
      success: true,
      message: "Member removed successfully",
    });
  } catch (error) {
    console.error("Error removing team member:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove user from team",
    });
  }
});

// ============================================
// DELETE /api/teams/:id - Delete team (admin only)
// ============================================
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if current user is admin
    const adminCheck = await pool.query(
      `SELECT role FROM team_members 
       WHERE team_id = $1 AND user_id = $2`,
      [id, userId],
    );

    if (adminCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this team",
      });
    }

    if (adminCheck.rows[0].role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only team admins can delete the team",
      });
    }

    // Delete team (cascade will delete team_members and projects)
    const result = await pool.query(
      "DELETE FROM teams WHERE id = $1 RETURNING id",
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    res.json({
      success: true,
      message: "Team deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting team:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete team",
    });
  }
});

export default router;
