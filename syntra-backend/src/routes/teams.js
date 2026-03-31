import express from "express";
import pool from "../config/db.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

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

    const teamResult =
      await pool.query(`insert into teams (name, description, created_by)
        values ($1, $2, $3) 
        Returning id, name, description, created_by
        [name, description || null, userId`);

    const team = teamResult.rows[0];

    await pool.query(`insert into team_members (team.id, user_id, role)
        values ($1, $2, 'admin')`);

    res.status(201).json({
      success: true,
      message: "team created successfully",
      data: team,
    });
  } catch (error) {
    console.error("Error creating team:", error);
    res.status(500).json({
      success: false,
      message: "failed to create team",
    });
  }
});

router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `select team.id, team.name, team.description, team.created_by, team_members.role, users.full_name as created_by_name
            from team_members
            join teams on team_members.team_id = teams.id
            join users on teams.created_by = users.id
            where team_members.user_id = $1
            order by teams.created_at desc`,
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
      message: "failed to fetch teams",
    });
  }
});

export default router;
