import express from "express";
const router = express.Router();
import { protect, admin } from "../middleware/authMiddleware.js";
import {
  getEmploymentConfig,
  addConfigItem,
  deleteConfigItem,
} from "../controllers/admin/employmentConfigController.js";

router.use(protect, admin);

// GET all config data
router.get("/", getEmploymentConfig);

// POST to add an item to a specific list (e.g., POST /api/employment-config/departments)
router.post("/:itemType", addConfigItem);

// DELETE an item from a specific list (e.g., DELETE /api/employment-config/companyNames)
router.delete("/:itemType", deleteConfigItem);

export default router;
