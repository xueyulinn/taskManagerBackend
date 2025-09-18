import express from "express";
import { userVerify, adminOnly } from "../middlewares/authMiddleware.js";
import {
  exportTasksReport,
  exportUsersReport,
} from "../controllers/reportController.js";
const router = express.Router();

router.get("/export/tasks", userVerify, adminOnly, exportTasksReport); // Export all tasks as Excel/PDF
router.get("/export/users", userVerify, adminOnly, exportUsersReport); // Export user-task report

export default router;
