import express from "express";
const router = express.Router();
import {
  createPublicClaim,
  getPublicActiveClaims,
  getAllClaimsForAdmin,
  updateClaim,
  deleteClaim,
  getClaimById,
} from "../controllers/claimController.js";
import { uploadClaimDocuments } from "../middleware/uploadMiddleware.js";
import { protect, admin } from "../middleware/authMiddleware.js";

// --- PUBLIC ROUTES ---
router.route("/").post(uploadClaimDocuments, createPublicClaim);
router.route("/active").get(getPublicActiveClaims);

// --- ADMIN-ONLY ROUTES ---
router.route("/admin").get(protect, admin, getAllClaimsForAdmin);
router
  .route("/admin/:id")
  .get(protect, admin, getClaimById)
  .put(protect, admin, uploadClaimDocuments, updateClaim)
  .delete(protect, admin, deleteClaim);

export default router;
