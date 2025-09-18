import express from "express";
import { userVerify, adminOnly } from "../middlewares/authMiddleware.js";
import {
  getAllUsers,
  getUserById,
  deleteUserById,
} from "../controllers/userController.js";
const router = express.Router();
router.get("/", userVerify, adminOnly, getAllUsers);
router.get("/:id", userVerify, getUserById);
router.delete("/:id", userVerify, adminOnly, deleteUserById);

export default router;
