import express from "express";
import pool from "../config/db.js";
import authMiddleware from "../middleware/auth.js";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/avatars";
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      `avatar-${req.user.id}-${uniqueSuffix}${path.extname(file.originalname)}`,
    );
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase(),
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: fileFilter,
});

// ============================================
// GET /api/users/profile - Get current user profile
// ============================================
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT id, email, full_name as name, avatar_url, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Format the response
    const userData = result.rows[0];
    res.json({
      success: true,
      data: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        avatar: userData.avatar_url, // Add this line for frontend compatibility
        avatar_url: userData.avatar_url,
        created_at: userData.created_at,
      },
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
    });
  }
});

// ============================================
// PUT /api/users/profile - Update user profile
// ============================================
router.put("/profile", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email } = req.body;

    if (!name && !email) {
      return res.status(400).json({
        success: false,
        message: "At least one field (name or email) is required",
      });
    }

    // Check if email is already taken by another user
    if (email) {
      const emailCheck = await pool.query(
        `SELECT id FROM users WHERE email = $1 AND id != $2`,
        [email, userId],
      );
      if (emailCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Email already in use by another account",
        });
      }
    }

    // Update user profile
    const result = await pool.query(
      `UPDATE users 
       SET full_name = COALESCE($1, full_name),
           email = COALESCE($2, email),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, email, full_name as name, avatar_url, created_at, updated_at`,
      [name || null, email || null, userId],
    );

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
});

// ============================================
// POST /api/users/avatar - Upload avatar
router.post(
  "/avatar",
  authMiddleware,
  upload.single("avatar"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        });
      }

      const userId = req.user.id;
      // Return full URL instead of just path
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const avatarUrl = `${baseUrl}/uploads/avatars/${req.file.filename}`;

      // Get old avatar to delete it
      const oldAvatar = await pool.query(
        `SELECT avatar_url FROM users WHERE id = $1`,
        [userId],
      );

      // Delete old avatar file if exists
      if (oldAvatar.rows[0]?.avatar_url) {
        const oldPath = path.join(
          process.cwd(),
          oldAvatar.rows[0].avatar_url.replace(baseUrl, ""),
        );
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      // Update user with new avatar URL
      const result = await pool.query(
        `UPDATE users 
       SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING avatar_url`,
        [avatarUrl, userId],
      );

      res.json({
        success: true,
        message: "Avatar uploaded successfully",
        data: {
          avatar_url: result.rows[0].avatar_url,
        },
      });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      res.status(500).json({
        success: false,
        message: "Failed to upload avatar",
      });
    }
  },
);

// ============================================
// PUT /api/users/change-password - Change password
// ============================================
router.put("/change-password", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }

    // Get current user's password
    const userResult = await pool.query(
      `SELECT password FROM users WHERE id = $1`,
      [userId],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(
      current_password,
      userResult.rows[0].password,
    );

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Update password
    await pool.query(
      `UPDATE users 
       SET password = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [hashedPassword, userId],
    );

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({
      success: false,
      message: "Failed to change password",
    });
  }
});

// ============================================
// DELETE /api/users/account - Delete user account
// ============================================
router.delete("/account", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Delete user's avatar file if exists
    const userResult = await pool.query(
      `SELECT avatar_url FROM users WHERE id = $1`,
      [userId],
    );

    if (userResult.rows[0]?.avatar_url) {
      const avatarPath = path.join(
        process.cwd(),
        userResult.rows[0].avatar_url,
      );
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
    }

    // Delete user (CASCADE will delete related records)
    await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);

    res.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete account",
    });
  }
});

// ============================================
// GET /api/users - Get all users (existing endpoint)
// ============================================
router.get("/", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, full_name as name, role, is_active, created_at 
       FROM users 
       ORDER BY created_at DESC`,
    );
    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching users. Please try again later.",
    });
  }
});

export default router;
