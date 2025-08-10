import express from "express";
import { getMyNotices } from "../controllers/user/noticeController.js";
import { protect } from "../middleware/authMiddleware.js"; // Sirf logged-in users ke liye

const router = express.Router();
router.route("/").get(protect, getMyNotices);

export default router;
