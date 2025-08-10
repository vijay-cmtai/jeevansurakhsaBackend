import express from "express";
import { adminProtect } from "../middleware/adminAuthMiddleware.js"; // Use our single, reliable middleware

// Import all controllers that this router will need
// import { authAdminLogin } from "../controllers/admin/adminController.js";
import {
  createManager,
  getActiveManagers,
  getBlockedManagers,
  getManagerById,
  updateManager,
  changeManagerStatus,
  deleteManager,
} from "../controllers/admin/managerController.js";
import {
  getNewMembershipRequests,
  getActiveMembers,
  getBlockedUsers,
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
import {
  getEligibleMembers,
  getGeneratedCertificates,
  generateForMember,
  deleteCertificate as deleteMemberCertificate,
} from "../controllers/admin/memberCertificateController.js";
// Add other controller imports as needed (cash donation, visitor cert, etc.)

const router = express.Router();

// --- PUBLIC ROUTE (Does not use middleware) ---
router.post("/login", authAdmin);

// --- PROTECTED ROUTES ---
// Apply our single admin middleware to all routes defined below this line.
router.use(adminProtect);

// --- MEMBERSHIP ROUTES ---
router.get("/members/new", getNewMembershipRequests);
router.get("/members/active", getActiveMembers);
router.get("/members/blocked", getBlockedUsers);
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

// --- NOTICE ROUTES ---
router.post("/notices/send/single/:id", sendSingleNotice);
router.post("/notices/send/all", sendNoticeToAll);
router.get("/notices/previous", getPreviousNotices);
router.delete("/notices/:id", deleteNotice);

// --- MEMBER CERTIFICATE ROUTES ---
router.get("/member-certificates/eligible", getEligibleMembers);
router.get("/member-certificates/generated", getGeneratedCertificates);
router.post("/member-certificates/generate/:memberId", generateForMember);
router.delete("/member-certificates/:id", deleteMemberCertificate);

// --- MANAGER ROUTES ---
router.get("/managers/active", getActiveManagers);
router.get("/managers/blocked", getBlockedManagers);
router
  .route("/managers/:id")
  .get(getManagerById)
  .put(updateManager)
  .delete(deleteManager);
router.put("/managers/:id/status", changeManagerStatus);
// Note: The createManager route with file upload needs separate handling or needs the upload middleware here.

// Add other routes from adminRoutes.js here...

export default router;
