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
// ENDPOINT 1: CREATE A NEW TASK
// POST /api/tasks
// ============================================
// WHAT THIS DOES:
// - Creates a new task under a specific project
// - Only team members can create tasks
// - The creator becomes the task owner (created_by)
// - Supports subtasks via parent_task_id
// ============================================
router.post("/", authMiddleware, async (req, res) => {
  try {
    // STEP 1: Extract data from request body
    // - title: task name (required)
    // - description: detailed explanation (optional)
    // - project_id: which project this task belongs to (required)
    // - assigned_to: user ID of person responsible (optional)
    // - priority: low/medium/high/urgent (defaults to medium)
    // - status: todo/in_progress/review/done (defaults to todo)
    // - due_date: deadline (optional)
    // - parent_task_id: for subtasks (optional)
    // - labels: array of tags like ['bug', 'urgent'] (optional)
    const {
      title,
      description,
      project_id,
      assigned_to,
      priority,
      status,
      due_date,
      parent_task_id,
      labels,
    } = req.body;

    // STEP 2: Get the logged-in user's ID from auth middleware
    const userId = req.user.id;

    // STEP 3: Validate required fields
    // If title or project_id is missing, return 400 Bad Request
    if (!title || !project_id) {
      return res.status(400).json({
        success: false,
        message: "Task title and project ID are required",
      });
    }

    // STEP 4: Get the project's team_id
    // We need this to check if the user is a member of the team
    const projectCheck = await pool.query(
      `SELECT team_id FROM projects WHERE id = $1`,
      [project_id],
    );

    // If project doesn't exist, return 404 Not Found
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const teamId = projectCheck.rows[0].team_id;

    // STEP 5: Check if user is a member of the team
    // Using our database function is_team_member(team_id, user_id)
    const membershipCheck = await pool.query(`SELECT is_team_member($1, $2)`, [
      teamId,
      userId,
    ]);

    // If not a member, return 403 Forbidden
    if (!membershipCheck.rows[0].is_team_member) {
      return res.status(403).json({
        success: false,
        message: "You must be a member of this team to create tasks",
      });
    }

    // STEP 6: If this is a subtask (has parent_task_id), verify parent exists
    // and belongs to the same project
    if (parent_task_id) {
      const parentCheck = await pool.query(
        `SELECT project_id FROM tasks WHERE id = $1`,
        [parent_task_id],
      );

      // Parent task doesn't exist
      if (parentCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Parent task not found",
        });
      }

      // Parent task belongs to different project
      if (parentCheck.rows[0].project_id !== project_id) {
        return res.status(400).json({
          success: false,
          message: "Parent task must belong to the same project",
        });
      }
    }

    // STEP 7: Insert the task into database
    // Using RETURNING * to get back the complete created task
    const result = await pool.query(
      `INSERT INTO tasks (title, description, project_id, created_by, assigned_to, 
                          priority, status, due_date, parent_task_id, labels)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        title, // $1
        description || null, // $2 - use null if not provided
        project_id, // $3
        userId, // $4 - creator from auth
        assigned_to || null, // $5 - use null if not assigned
        priority || "medium", // $6 - default to 'medium'
        status || "todo", // $7 - default to 'todo'
        due_date || null, // $8 - use null if not provided
        parent_task_id || null, // $9 - use null if not a subtask
        labels || [], // $10 - default to empty array
      ],
    );

    // STEP 8: Return success response with 201 Created status
    res.status(201).json({
      success: true,
      message: "Task created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    // STEP 9: Handle errors
    console.error("Error creating task:", error);

    // 23503 is PostgreSQL error code for foreign key violation
    // This happens if project_id, parent_task_id, or assigned_to doesn't exist
    if (error.code === "23503") {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID, parent task ID, or assigned user ID",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create task",
    });
  }
});

// ============================================
// ENDPOINT 2: GET ALL TASKS (WITH FILTERS)
// GET /api/tasks
// Query parameters (optional):
//   - project_id: filter by project
//   - assigned_to: filter by assigned user
//   - status: filter by status (todo/in_progress/review/done)
//   - priority: filter by priority (low/medium/high/urgent)
// ============================================
// WHAT THIS DOES:
// - Returns all tasks the user has access to
// - Can filter by project, assignee, status, priority
// - Only shows tasks from teams the user belongs to
// ============================================
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    // Extract query parameters from URL
    // Example: /api/tasks?project_id=123&status=in_progress
    const { project_id, assigned_to, status, priority } = req.query;

    // ============================================
    // BASE QUERY - Gets tasks from user's teams
    // ============================================
    // We join multiple tables:
    // - tasks: the main table
    // - projects: to get project name and team_id
    // - teams: to filter by team membership
    // - team_members: to check which teams user belongs to
    // - users (creator): to get creator's name
    // - users (assignee): to get assignee's name
    // ============================================
    let query = `
      SELECT t.id, t.title, t.description, t.status, t.priority, 
             t.story_points, t.due_date, t.completed_at, t.created_at,
             t.parent_task_id, t.labels,
             p.id as project_id, p.name as project_name,
             creator.full_name as created_by_name,
             assignee.full_name as assigned_to_name
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN teams te ON p.team_id = te.id
      JOIN team_members tm ON te.id = tm.team_id
      LEFT JOIN users creator ON t.created_by = creator.id
      LEFT JOIN users assignee ON t.assigned_to = assignee.id
      WHERE tm.user_id = $1
    `;

    // ============================================
    // DYNAMIC FILTERS - Add conditions based on query params
    // ============================================
    const queryParams = [userId];
    let paramCounter = 2;

    if (project_id) {
      query += ` AND t.project_id = $${paramCounter}`;
      queryParams.push(project_id);
      paramCounter++;
    }

    if (assigned_to) {
      query += ` AND t.assigned_to = $${paramCounter}`;
      queryParams.push(assigned_to);
      paramCounter++;
    }

    if (status) {
      query += ` AND t.status = $${paramCounter}`;
      queryParams.push(status);
      paramCounter++;
    }

    if (priority) {
      query += ` AND t.priority = $${paramCounter}`;
      queryParams.push(priority);
      paramCounter++;
    }

    // ORDER BY - newest tasks first
    query += ` ORDER BY t.created_at DESC`;

    // Execute the query
    const result = await pool.query(query, queryParams);

    // Return results with count
    res.json({
      success: true,
      count: result.rows.length,
      filters: { project_id, assigned_to, status, priority },
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tasks",
    });
  }
});

// ============================================
// ENDPOINT 3: GET SINGLE TASK BY ID
// GET /api/tasks/:id
// ============================================
// WHAT THIS DOES:
// - Returns a single task with all its details
// - Includes subtasks (child tasks)
// - User must be a member of the task's team
// ============================================
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // STEP 1: Check if user has access to this task
    // We do this by verifying they are a member of the task's team
    const accessCheck = await pool.query(
      `SELECT t.id
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       JOIN teams te ON p.team_id = te.id
       JOIN team_members tm ON te.id = tm.team_id
       WHERE t.id = $1 AND tm.user_id = $2`,
      [id, userId],
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this task",
      });
    }

    // STEP 2: Get task details with creator and assignee names
    const taskResult = await pool.query(
      `SELECT t.*, 
              p.name as project_name, p.team_id,
              creator.full_name as created_by_name,
              assignee.full_name as assigned_to_name
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       LEFT JOIN users creator ON t.created_by = creator.id
       LEFT JOIN users assignee ON t.assigned_to = assignee.id
       WHERE t.id = $1`,
      [id],
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    // STEP 3: Get subtasks (tasks that have this task as parent)
    const subtasksResult = await pool.query(
      `SELECT id, title, status, priority, assigned_to
       FROM tasks
       WHERE parent_task_id = $1
       ORDER BY created_at ASC`,
      [id],
    );

    // STEP 4: Combine task data with subtasks
    const task = taskResult.rows[0];
    task.subtasks = subtasksResult.rows;

    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error("Error fetching task:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch task",
    });
  }
});

// ============================================
// ENDPOINT 4: UPDATE A TASK
// PUT /api/tasks/:id
// ============================================
// WHAT THIS DOES:
// - Updates any field of a task
// - Only assignee, creator, or team admin can update
// - Uses COALESCE for partial updates (only update provided fields)
// ============================================
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      assigned_to,
      priority,
      status,
      due_date,
      labels,
      story_points,
    } = req.body;
    const userId = req.user.id;

    // STEP 1: Check if user has permission to update this task
    // Get task details and team information
    const taskCheck = await pool.query(
      `SELECT t.created_by, t.assigned_to, p.team_id
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE t.id = $1`,
      [id],
    );

    if (taskCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const task = taskCheck.rows[0];

    // Check if user is assignee, creator, or team admin
    const isAssignee = task.assigned_to === userId;
    const isCreator = task.created_by === userId;

    // Check if user is team admin
    const adminCheck = await pool.query(
      `SELECT role FROM team_members 
       WHERE team_id = $1 AND user_id = $2 AND role = 'admin'`,
      [task.team_id, userId],
    );

    const isAdmin = adminCheck.rows.length > 0;

    // Allow update only for assignee, creator, or admin
    if (!isAssignee && !isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to update this task",
      });
    }

    // STEP 2: Update the task using COALESCE for partial updates
    // COALESCE(provided_value, current_value) means:
    // - If provided_value is not null, use it
    // - If provided_value is null, keep the existing value
    const result = await pool.query(
      `UPDATE tasks 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           assigned_to = COALESCE($3, assigned_to),
           priority = COALESCE($4, priority),
           status = COALESCE($5, status),
           due_date = COALESCE($6, due_date),
           labels = COALESCE($7, labels),
           story_points = COALESCE($8, story_points)
       WHERE id = $9
       RETURNING *`,
      [
        title,
        description,
        assigned_to,
        priority,
        status,
        due_date,
        labels,
        story_points,
        id,
      ],
    );

    res.json({
      success: true,
      message: "Task updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update task",
    });
  }
});

// ============================================
// ENDPOINT 5: UPDATE TASK STATUS (QUICK UPDATE)
// PATCH /api/tasks/:id/status
// ============================================
// WHAT THIS DOES:
// - Convenience endpoint for quickly changing task status
// - This is the most common task update
// - Only assignee, creator, or admin can update status
// ============================================
router.patch("/:id/status", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    // Validate status is provided
    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    // Validate status is valid
    const validStatuses = ["todo", "in_progress", "review", "done"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be: todo, in_progress, review, or done",
      });
    }

    // Check permission
    const taskCheck = await pool.query(
      `SELECT t.created_by, t.assigned_to, p.team_id
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE t.id = $1`,
      [id],
    );

    if (taskCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const task = taskCheck.rows[0];
    const isAssignee = task.assigned_to === userId;
    const isCreator = task.created_by === userId;

    const adminCheck = await pool.query(
      `SELECT role FROM team_members 
       WHERE team_id = $1 AND user_id = $2 AND role = 'admin'`,
      [task.team_id, userId],
    );

    const isAdmin = adminCheck.rows.length > 0;

    if (!isAssignee && !isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to update this task status",
      });
    }

    // Update status
    const result = await pool.query(
      `UPDATE tasks 
       SET status = $1,
           completed_at = CASE WHEN $1 = 'done' THEN CURRENT_TIMESTAMP ELSE NULL END
       WHERE id = $2
       RETURNING *`,
      [status, id],
    );

    res.json({
      success: true,
      message: `Task status updated to ${status}`,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating task status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update task status",
    });
  }
});

// ============================================
// ENDPOINT 6: DELETE A TASK
// DELETE /api/tasks/:id
// ============================================
// WHAT THIS DOES:
// - Deletes a task and all its subtasks (due to CASCADE)
// - Only creator or team admin can delete
// ============================================
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check permission (only creator or admin can delete)
    const taskCheck = await pool.query(
      `SELECT t.created_by, p.team_id
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE t.id = $1`,
      [id],
    );

    if (taskCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const task = taskCheck.rows[0];
    const isCreator = task.created_by === userId;

    const adminCheck = await pool.query(
      `SELECT role FROM team_members 
       WHERE team_id = $1 AND user_id = $2 AND role = 'admin'`,
      [task.team_id, userId],
    );

    const isAdmin = adminCheck.rows.length > 0;

    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only the task creator or team admin can delete this task",
      });
    }

    // Delete the task (CASCADE will delete all subtasks automatically)
    await pool.query(`DELETE FROM tasks WHERE id = $1`, [id]);

    res.json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete task",
    });
  }
});

export default router;
