import express from "express";
const router = express.Router();
import { protect, admin } from "../middleware/authMiddleware.js";
import { downloadMemberReport } from "../controllers/admin/reportController.js";

// All report routes are protected for admins
router.use(protect, admin);

// A single route handles both 'new' and 'active' reports via a query parameter
router.get("/download/members", downloadMemberReport);

export default router;
