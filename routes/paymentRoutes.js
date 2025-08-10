import express from "express";
const router = express.Router();
import {
  makeMemberPayment,
  makeVisitorDonation,
  handleWebhook,
  getPaymentStatus,
  getAllVisitorDonations,
  deleteVisitorDonation,
} from "../controllers/paymentController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

router.post("/donate", makeVisitorDonation);
router.post("/webhook", handleWebhook);
router.get("/status/:orderId", getPaymentStatus);
router.post("/member/pay", protect, makeMemberPayment);
router.get("/admin/donations", protect, admin, getAllVisitorDonations);
router.delete("/admin/donations/:id", protect, admin, deleteVisitorDonation);

export default router;
