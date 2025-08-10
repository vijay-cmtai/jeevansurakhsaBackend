// 📁 File: routes/adminRoutes.js

import express from "express";
const router = express.Router();

import { authAdminLogin } from "../controllers/admin/adminController.js";
import {
  authManagerLogin,
  createManager,
  getActiveManagers,
  getBlockedManagers,
  getManagerById,
  updateManager,
  changeManagerStatus,
  deleteManager,
} from "../controllers/admin/managerController.js";

// --- Middleware Imports ---
import { protect, admin } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";

// --- Public Login Routes ---
router.post("/login", authAdminLogin);
router.post("/manager/login", authManagerLogin);

// --- Neeche ke sabhi routes ke liye login zaroori hai ---
router.use(protect);

// --- Routes for Both Admin & Manager (View/Edit) ---
router.get("/managers/active", getActiveManagers);
router.put("/managers/:id", upload.single("profilePic"), updateManager);

// --- Admin-Only Routes (Create/Delete/Status Change etc.) ---
router.post("/managers", admin, upload.single("profilePic"), createManager);
router.get("/managers/blocked", admin, getBlockedManagers);
router.get("/managers/:id", admin, getManagerById);
router.delete("/managers/:id", admin, deleteManager);
router.put("/managers/:id/status", admin, changeManagerStatus);

export default router;
