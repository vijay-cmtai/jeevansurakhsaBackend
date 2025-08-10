import express from "express";
const router = express.Router();
import {
  downloadReceipt,
  getMyReceipts,
  getAllReceipts,
} from "../controllers/receiptController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

router.route("/my-receipts").get(protect, getMyReceipts);
router.route("/:id/download").get(protect, downloadReceipt);

router.route("/").get(protect, admin, getAllReceipts);

export default router;
