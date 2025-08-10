import express from "express";
const router = express.Router();
import {
  makeMemberPayment,
  makeVisitorDonation,
  handleWebhook,
  getPaymentStatus,
  getAllVisitorDonations,
  deleteVisitorDonation,
  verifyRegistrationPayment,
} from "../controllers/paymentController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

// Visitor Donation Routes
router.post("/donate", makeVisitorDonation);
router.get("/admin/donations", protect, admin, getAllVisitorDonations);
router.delete("/admin/donations/:id", protect, admin, deleteVisitorDonation);

// Member Payment Route
router.post("/member/pay", protect, makeMemberPayment);

// Generic / Shared Routes
router.post("/webhook", handleWebhook);
router.get("/status/:orderId", getPaymentStatus);
router.post("/verify-registration", verifyRegistrationPayment); // New Route

export default router;
