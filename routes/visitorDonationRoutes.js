// File: routes/visitorDonationRoutes.js

import express from "express";
const router = express.Router();
import {
  initiateDonation,
  handleDonationCallback,
  checkDonationStatus,
  getAllVisitorDonations,
  deleteVisitorDonation, // ✅ 1. Import the new controller function
} from "../controllers/visitorDonationController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

// --- PUBLIC ROUTES FOR VISITORS --
router.post("/initiate", initiateDonation);
router.post("/callback", handleDonationCallback);
router.get("/status/:order_id", checkDonationStatus);

// --- ADMIN-ONLY ROUTES ---
router.route("/admin/all").get(protect, admin, getAllVisitorDonations);

// ✅ 2. Add the new DELETE route
router.route("/admin/:id").delete(protect, admin, deleteVisitorDonation);

export default router;
