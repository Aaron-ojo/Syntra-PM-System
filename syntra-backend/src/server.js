import cors from "cors";
import express from "express";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import teamRoutes from "./routes/teams.js";
import projectRoutes from "./routes/projects.js";
import taskRoutes from "./routes/tasks.js";
import commentRoutes from "./routes/comments.js";
import notificationRoutes from "./routes/notifications.js";

import pool from "./config/db.js";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

/*
|--------------------------------------------------------------------------
| Middleware
|--------------------------------------------------------------------------
*/

// Temporary open CORS for development
app.use(cors());

app.use(express.json());

/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
*/

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/notifications", notificationRoutes);

/*
|--------------------------------------------------------------------------
| Root Route
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Syntra API is running!",
  });
});

/*
|--------------------------------------------------------------------------
| Database Test
|--------------------------------------------------------------------------
*/

pool
  .query("SELECT NOW()")
  .then((result) => {
    console.log("DB connected:", result.rows[0]);
  })
  .catch((err) => {
    console.error("DB error:", err);
  });

/*
|--------------------------------------------------------------------------
| Start Server
|--------------------------------------------------------------------------
*/

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
