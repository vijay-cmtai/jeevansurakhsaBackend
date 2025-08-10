// File: routes/contributionPlanRoutes.js (Corrected Code)

import express from "express";
const router = express.Router();

import {
  createOrUpdateContributionGroup,
  getAllContributionGroups,
  getContributionGroupById,
  deleteContributionGroup,
} from "../controllers/admin/contributionPlanController.js";

import { protect, admin } from "../middleware/authMiddleware.js";

router
  .route("/")
  .get(getAllContributionGroups) // <-- Yahan se protect, admin hata diya gaya hai. Ab yeh public hai.
  .post(protect, admin, createOrUpdateContributionGroup); // POST abhi bhi admin-only hai.

router
  .route("/:id")
  .get(protect, admin, getContributionGroupById) // Specific ID get karna abhi bhi admin-only hai.
  .delete(protect, admin, deleteContributionGroup); // Delete abhi bhi admin-only hai.

export default router;
