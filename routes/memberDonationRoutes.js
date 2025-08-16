// File: routes/user/memberDonationRoutes.js

import express from "express";
import { protect, admin } from "../middleware/authMiddleware.js";
import {
  createMemberDonation,
  getMyDonationHistory,
  handlePaymentWebhook,
  verifyPaymentStatus,
  getAllMemberDonations,
  deleteMemberDonation, // <-- Import the new controller
} from "../controllers/user/memberDonationController.js";

const router = express.Router();

// --- MEMBER ROUTES ---
router.route("/").post(protect, createMemberDonation);

router.route("/my-history").get(protect, getMyDonationHistory);

router.route("/verify").post(protect, verifyPaymentStatus);

router.route("/webhook").post(handlePaymentWebhook);

router.route("/admin/all").get(protect, admin, getAllMemberDonations);

router.route("/admin/:id").delete(protect, admin, deleteMemberDonation);

export default router;
