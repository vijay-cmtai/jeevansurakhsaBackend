import express from "express";
const router = express.Router();
import {
  initiateDonation,
  handleDonationCallback,
  getAllVisitorDonations,
  checkDonationStatus,
} from "../controllers/visitorDonationController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

// --- PUBLIC ROUTES FOR VISITORS --
router.post("/initiate", initiateDonation);
router.post("/callback", handleDonationCallback);
router.get("/status/:order_id", checkDonationStatus); // New route for status checking

// --- ADMIN-ONLY ROUTE to view the list of successful donations ---
router.get("/admin/all", protect, admin, getAllVisitorDonations);

export default router;
