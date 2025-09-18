import express from "express";
import { adminOnly, userVerify } from "../middlewares/authMiddleware.js";
import {
  createTask,
  getTasks,
  deleteTask,
  getTaskById,
  updateTask,
  updateTaskStatus,
  updateTaskChecklist,
  getDashboardData,
  getUserDashboardData,
} from "../controllers/taskController.js";
const router = express.Router();

router.post("/", userVerify, adminOnly, createTask);

// admin-all, member-assignedTo
router.get("/", userVerify, getTasks);
router.get("/dashboard-data", userVerify, getDashboardData);
router.get("/user-dashboard-data", userVerify, getUserDashboardData);
router.get("/:taskId", userVerify, getTaskById);
router.put("/:taskId", userVerify, updateTask);
router.put("/:taskId/status", userVerify, updateTaskStatus); // Update task status
router.put("/:taskId/todo", userVerify, updateTaskChecklist); // Update task checklist
router.delete("/:taskId", userVerify, adminOnly, deleteTask); // Delete a task (Admin only)

export default router;
