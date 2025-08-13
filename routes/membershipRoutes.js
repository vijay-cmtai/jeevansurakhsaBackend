import express from "express";
const router = express.Router();

import {
  getNewMembershipRequests,
  getActiveMembers,
  getBlockedUsers, // Make sure this is imported
  getMemberById,
  verifyMemberByAdmin,
  updateMemberByAdmin,
  changeMemberStatus,
  deleteMember,
  generateAppointmentLetter,
  generateIdCard,
  generateReceipt,
} from "../controllers/admin/membershipController.js";

import {
  sendSingleNotice,
  sendNoticeToAll,
  getPreviousNotices,
  deleteNotice,
} from "../controllers/admin/noticeController.js";

import { protect, admin } from "../middleware/authMiddleware.js";
// ✅ STEP 1: UPLOAD MIDDLEWARE KO IMPORT KAREIN (PATH SAHI KAREIN)
import uploadImages from "../middleware/uploadMiddleware.js";

// This middleware will protect all routes in this file
router.use(protect, admin);

// --- Member List Routes ---
router.get("/members/new", getNewMembershipRequests);
router.get("/members/active", getActiveMembers);
router.get("/members/blocked", getBlockedUsers); // Route for blocked users

// --- Single Member Routes ---
router
  .route("/members/:id")
  .get(getMemberById)
  // ✅ STEP 2: UPLOAD MIDDLEWARE KO YAHAN ADD KAREIN
  .put(uploadImages, updateMemberByAdmin)
  .delete(deleteMember);

router.put("/members/:id/verify", verifyMemberByAdmin);
router.put("/members/:id/status", changeMemberStatus);

// --- Document Generation Routes ---
router.get("/members/:id/appointment-letter", generateAppointmentLetter);
router.get("/members/:id/id-card", generateIdCard);
router.get("/members/:id/receipt", generateReceipt);

// --- Notice Routes ---
router.post("/notices/send/single/:id", sendSingleNotice);
router.post("/notices/send/all", sendNoticeToAll);
router.get("/notices/previous", getPreviousNotices);
router.delete("/notices/:id", deleteNotice);

export default router;
