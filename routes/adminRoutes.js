// 📁 File: routes/adminRoutes.js

import express from "express";
const router = express.Router();
import { protect, admin } from "../middleware/authMiddleware.js"; // Purane middleware
import { isTrueAdmin } from "../middleware/permissionMiddleware.js"; // ✅ Naya middleware
import { upload } from "../middleware/uploadMiddleware.js";

// --- Controller Imports ---
import { authAdminLogin } from "../controllers/admin/adminController.js";
import {
  authManagerLogin,
  createManager,
  getActiveManagers,
  getBlockedManagers,
  getManagerById,
  updateManager,
  changeManagerStatus,
  deleteManager,
} from "../controllers/admin/managerController.js";
import {
  generateCertificate as generateVisitorCertificate,
  getAllCertificates as getAllVisitorCertificates,
  deleteCertificate as deleteVisitorCertificate,
  downloadCertificate as downloadVisitorCertificate,
} from "../controllers/admin/visitorCertificateController.js";
import {
  createCashDonation,
  getAllCashDonations,
  getDonationById,
  deleteDonation,
  downloadDonationReceipt,
} from "../controllers/admin/cashDonationController.js";
import {
  getEligibleMembers,
  getGeneratedCertificates,
  generateForMember,
  deleteCertificate as deleteMemberCertificate,
  downloadMemberCertificate,
  viewMemberCertificate,
} from "../controllers/admin/memberCertificateController.js";

// --- PUBLIC LOGIN ROUTES ---
router.post("/login", authAdminLogin);
router.post("/manager/login", authManagerLogin);

// =================================================================
// 📢 ROUTES FOR BOTH ADMIN & MANAGER (Sabhi par 'protect' aur purana 'admin' lagega)
// =================================================================
// Yahan purana 'admin' middleware ab kaam karega kyunki sabke token mein isAdmin:true hai
router.get("/managers/active", protect, admin, getActiveManagers);
router.get("/managers/:id", protect, admin, getManagerById);
router.put(
  "/managers/:id",
  protect,
  admin,
  upload.single("profilePic"),
  updateManager
);
router.get("/visitor-certificates", protect, admin, getAllVisitorCertificates);
router.get(
  "/visitor-certificates/download/:id",
  protect,
  admin,
  downloadVisitorCertificate
);
router.get("/donations/cash", protect, admin, getAllCashDonations);
router.get("/donations/cash/:id", protect, admin, getDonationById);
router.get(
  "/donations/cash/:id/receipt",
  protect,
  admin,
  downloadDonationReceipt
);
router.get(
  "/member-certificates/view/:id",
  protect,
  admin,
  viewMemberCertificate
);
router.get(
  "/member-certificates/download/:id",
  protect,
  admin,
  downloadMemberCertificate
);

// =================================================================
// 🔐 STRICTLY ADMIN-ONLY ROUTES (Create, Delete, Status Change)
// =================================================================
// Yahan hum `protect`, `admin` ke saath naya `isTrueAdmin` middleware lagayenge
router.post(
  "/managers",
  protect,
  admin,
  isTrueAdmin,
  upload.single("profilePic"),
  createManager
);
router.get(
  "/managers/blocked",
  protect,
  admin,
  isTrueAdmin,
  getBlockedManagers
); // Blocked list sirf Admin dekhega
router.put(
  "/managers/:id/status",
  protect,
  admin,
  isTrueAdmin,
  changeManagerStatus
);
router.delete("/managers/:id", protect, admin, isTrueAdmin, deleteManager);

router.post(
  "/visitor-certificates/generate",
  protect,
  admin,
  isTrueAdmin,
  generateVisitorCertificate
);
router.delete(
  "/visitor-certificates/:id",
  protect,
  admin,
  isTrueAdmin,
  deleteVisitorCertificate
);

router.post(
  "/donations/cash",
  protect,
  admin,
  isTrueAdmin,
  upload.single("paymentImage"),
  createCashDonation
);
router.delete(
  "/donations/cash/:id",
  protect,
  admin,
  isTrueAdmin,
  deleteDonation
);

router.get(
  "/member-certificates/eligible",
  protect,
  admin,
  isTrueAdmin,
  getEligibleMembers
);
router.get(
  "/member-certificates/generated",
  protect,
  admin,
  isTrueAdmin,
  getGeneratedCertificates
);
router.post(
  "/member-certificates/generate/:memberId",
  protect,
  admin,
  isTrueAdmin,
  generateForMember
);
router.delete(
  "/member-certificates/:id",
  protect,
  admin,
  isTrueAdmin,
  deleteMemberCertificate
);

export default router;
