import express from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import teamRoutes from "./routes/teams.js";
import pool from "./config/db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/teams", teamRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Syntra API is running!" });
});

pool
  .query("SELECT NOW()")
  .then((res) => {
    console.log("DB connected:", res.rows[0]);
  })
  .catch((err) => {
    console.error("DB error:", err);
  });

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
