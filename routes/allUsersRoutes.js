import express from "express";
const router = express.Router();

import { protect, admin } from "../middleware/authMiddleware.js";

import {
  getAllMembers,
  deleteMultipleMembers,
} from "../controllers/admin/allUsersController.js";

import {
  getMemberById,
  updateMemberByAdmin,
  deleteMember,
  verifyMemberByAdmin,
  changeMemberStatus,
} from "../controllers/admin/membershipController.js";

router.use(protect, admin);

router.get("/", getAllMembers);
router.post("/delete-bulk", deleteMultipleMembers);

router
  .route("/:id")
  .get(getMemberById)
  .put(updateMemberByAdmin)
  .delete(deleteMember);

router.put("/:id/verify", verifyMemberByAdmin);
router.put("/:id/status", changeMemberStatus);

export default router;
