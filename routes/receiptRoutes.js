import express from "express";
const router = express.Router();

import {
  getPayments,
  deleteReceipt,
  downloadReceipt,
} from "../controllers/admin/receiptController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

// Sabhi routes admin ke liye protected hain
router.use(protect, admin);

router.route("/").get(getPayments);

router.route("/:id").delete(deleteReceipt);

router.route("/:id/download").get(downloadReceipt);

export default router;
