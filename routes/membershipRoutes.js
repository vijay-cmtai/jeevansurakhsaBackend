import express from "express";
const router = express.Router();

import {
  getNewMembershipRequests,
  getActiveMembers,
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

router.use(protect, admin);

router.get("/members/new", getNewMembershipRequests);
router.get("/members/active", getActiveMembers);

router
  .route("/members/:id")
  .get(getMemberById)
  .put(updateMemberByAdmin)
  .delete(deleteMember);

router.put("/members/:id/verify", verifyMemberByAdmin);
router.put("/members/:id/status", changeMemberStatus);

router.get("/members/:id/appointment-letter", generateAppointmentLetter);
router.get("/members/:id/id-card", generateIdCard);
router.get("/members/:id/receipt", generateReceipt);

router.post("/notices/send/single/:id", sendSingleNotice);
router.post("/notices/send/all", sendNoticeToAll);
router.get("/notices/previous", getPreviousNotices);
router.delete("/notices/:id", deleteNotice);

export default router;
