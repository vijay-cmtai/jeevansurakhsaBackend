import express from "express";
const router = express.Router();
import {
  registerMember,
  authMember,
  getMemberProfile,
  updateMemberProfile,
  addState,
  getStates,
  addDistrict,
  getDistrictsByState,
  addVolunteer,
  getVolunteers,
  changeMemberStatusByAdmin,
  getBlockedUsers,
  getMyCertificates,
  deleteState,
  deleteDistrict,
  deleteVolunteer,
} from "../controllers/user/memberController.js";
import { protect, admin } from "../middleware/authMiddleware.js";
import uploadImages from "../middleware/uploadMiddleware.js";

// Public & Member Routes
router.post("/register", uploadImages, registerMember);
router.post("/login", authMember);
router
  .route("/profile")
  .get(protect, getMemberProfile)
  .put(protect, uploadImages, updateMemberProfile);
router.route("/my-certificates").get(protect, getMyCertificates);

// Public Config Routes
router.get("/config/states", getStates);
router.get("/config/districts/:stateName", getDistrictsByState);
router.get("/config/volunteers", getVolunteers);

// Admin Config Routes
router.post("/config/states", protect, admin, addState);
router.post("/config/districts", protect, admin, addDistrict);
router.post("/config/volunteers", protect, admin, addVolunteer);
router.delete("/config/states/:id", protect, admin, deleteState);
router.delete(
  "/config/states/:stateId/districts/:districtId",
  protect,
  admin,
  deleteDistrict
);
router.delete("/config/volunteers/:id", protect, admin, deleteVolunteer);

// Admin Member Management
router.get("/admin/blocked", protect, admin, getBlockedUsers);
router.put("/admin/status/:id", protect, admin, changeMemberStatusByAdmin);

export default router;
