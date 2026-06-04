import express from "express";
import pool from "../config/db.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// ============================================
// GET /api/search - Global search across tasks, projects, and teams
// Query params: q (search query)
// ============================================
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const searchQuery = req.query.q || "";

    if (!searchQuery.trim() || searchQuery.length < 2) {
      return res.json({
        success: true,
        data: [],
        message: "Search query must be at least 2 characters",
      });
    }

    const searchTerm = `%${searchQuery.toLowerCase()}%`;
    const results = [];

    // ============================================
    // 1. SEARCH TASKS
    // ============================================
    const tasksResult = await pool.query(
      `SELECT 
        t.id, 
        t.title, 
        t.description, 
        t.status,
        t.priority,
        p.name as project_name,
        p.id as project_id
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       JOIN teams te ON p.team_id = te.id
       JOIN team_members tm ON te.id = tm.team_id
       WHERE tm.user_id = $1 
         AND (LOWER(t.title) LIKE $2 OR LOWER(t.description) LIKE $2)
       ORDER BY t.created_at DESC
       LIMIT 10`,
      [userId, searchTerm],
    );

    tasksResult.rows.forEach((task) => {
      results.push({
        id: task.id,
        type: "task",
        title: task.title,
        description: task.description || "",
        url: `/project/${task.project_id}`,
        project_name: task.project_name,
        status: task.status,
        priority: task.priority,
      });
    });

    // ============================================
    // 2. SEARCH PROJECTS
    // ============================================
    const projectsResult = await pool.query(
      `SELECT 
        p.id, 
        p.name, 
        p.description,
        t.name as team_name
       FROM projects p
       JOIN teams t ON p.team_id = t.id
       JOIN team_members tm ON t.id = tm.team_id
       WHERE tm.user_id = $1 
         AND (LOWER(p.name) LIKE $2 OR LOWER(p.description) LIKE $2)
       ORDER BY p.created_at DESC
       LIMIT 5`,
      [userId, searchTerm],
    );

    projectsResult.rows.forEach((project) => {
      results.push({
        id: project.id,
        type: "project",
        title: project.name,
        description: project.description || "",
        url: `/project/${project.id}`,
        team_name: project.team_name,
      });
    });

    // ============================================
    // 3. SEARCH TEAMS
    // ============================================
    const teamsResult = await pool.query(
      `SELECT 
        t.id, 
        t.name, 
        t.description
       FROM teams t
       JOIN team_members tm ON t.id = tm.team_id
       WHERE tm.user_id = $1 
         AND (LOWER(t.name) LIKE $2 OR LOWER(t.description) LIKE $2)
       ORDER BY t.created_at DESC
       LIMIT 5`,
      [userId, searchTerm],
    );

    teamsResult.rows.forEach((team) => {
      results.push({
        id: team.id,
        type: "team",
        title: team.name,
        description: team.description || "",
        url: `/team/${team.id}`,
      });
    });

    // Sort results by type priority (tasks first, then projects, then teams)
    const typeOrder = { task: 1, project: 2, team: 3 };
    results.sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);

    res.json({
      success: true,
      count: results.length,
      data: results,
      query: searchQuery,
    });
  } catch (error) {
    console.error("Error searching:", error);
    res.status(500).json({
      success: false,
      message: "Failed to perform search",
    });
  }
});

// ============================================
// GET /api/search/tasks - Advanced task search with filters
// Query params:
//   - q: search text
//   - priority: low/medium/high/urgent
//   - status: todo/in_progress/review/done
//   - assignee_id: user ID
//   - project_id: project ID
// ============================================
router.get("/tasks", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { q, priority, status, assignee_id, project_id } = req.query;

    let query = `
      SELECT DISTINCT
        t.id, t.title, t.description, t.status, t.priority, 
        t.due_date, t.created_at,
        p.name as project_name,
        p.id as project_id,
        u.full_name as assignee_name
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN teams te ON p.team_id = te.id
      JOIN team_members tm ON te.id = tm.team_id
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE tm.user_id = $1
    `;

    const queryParams = [userId];
    let paramCounter = 2;

    // Add search condition
    if (q && q.trim()) {
      query += ` AND (LOWER(t.title) LIKE $${paramCounter} OR LOWER(t.description) LIKE $${paramCounter})`;
      queryParams.push(`%${q.toLowerCase()}%`);
      paramCounter++;
    }

    // Add priority filter
    if (priority) {
      query += ` AND t.priority = $${paramCounter}`;
      queryParams.push(priority);
      paramCounter++;
    }

    // Add status filter
    if (status) {
      query += ` AND t.status = $${paramCounter}`;
      queryParams.push(status);
      paramCounter++;
    }

    // Add assignee filter
    if (assignee_id) {
      query += ` AND t.assigned_to = $${paramCounter}`;
      queryParams.push(assignee_id);
      paramCounter++;
    }

    // Add project filter
    if (project_id) {
      query += ` AND p.id = $${paramCounter}`;
      queryParams.push(project_id);
      paramCounter++;
    }

    query += ` ORDER BY t.created_at DESC LIMIT 50`;

    const result = await pool.query(query, queryParams);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
      filters: { q, priority, status, assignee_id, project_id },
    });
  } catch (error) {
    console.error("Error searching tasks:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search tasks",
    });
  }
});

// ============================================
// GET /api/search/recent - Get recently accessed items
// ============================================
router.get("/recent", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get recently accessed tasks (from task history or just most recent tasks)
    const recentTasks = await pool.query(
      `SELECT 
        t.id, t.title, 'task' as type,
        p.id as project_id
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       JOIN teams te ON p.team_id = te.id
       JOIN team_members tm ON te.id = tm.team_id
       WHERE tm.user_id = $1
       ORDER BY t.updated_at DESC
       LIMIT 5`,
      [userId],
    );

    const results = recentTasks.rows.map((task) => ({
      id: task.id,
      type: "task",
      title: task.title,
      url: `/project/${task.project_id}`,
    }));

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Error fetching recent items:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch recent items",
    });
  }
});

export default router;
