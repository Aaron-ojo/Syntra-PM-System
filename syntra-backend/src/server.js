import cors from "cors";
import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import searchRoutes from "./routes/search.js";
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

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded files
const uploadsPath = path.resolve(__dirname, "../uploads");

console.log("Server directory:", __dirname);
console.log("Serving uploads from:", uploadsPath);

app.use("/uploads", express.static(uploadsPath));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/search", searchRoutes);

// Test route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Syntra API is running!",
  });
});

// Uploads test route
app.get("/test-uploads", (req, res) => {
  res.json({
    uploadsPath,
  });
});

// Database test
pool
  .query("SELECT NOW()")
  .then((result) => {
    console.log("DB connected:", result.rows[0]);
  })
  .catch((err) => {
    console.error("DB error:", err);
  });

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
