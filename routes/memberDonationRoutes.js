import express from "express";
import { protect, admin } from "../middleware/authMiddleware.js";
import {
  createMemberDonation,
  getMyDonationHistory,
  handlePaymentWebhook,
  verifyPaymentStatus,
  getAllMemberDonations,
} from "../controllers/user/memberDonationController.js";

const router = express.Router();

// Member donation routes (Protected)
router.post("/", protect, createMemberDonation);
router.get("/my-history", protect, getMyDonationHistory);
router.post("/verify", protect, verifyPaymentStatus);

// Webhook route (Public - no auth needed)
router.post("/webhook", handlePaymentWebhook);

router.get("/admin/all", protect, admin, getAllMemberDonations);

export default router;
