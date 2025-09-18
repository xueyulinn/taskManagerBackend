import express from "express";
import {
  userSignin,
  userSignup,
  getUserProfile,
  passwordReset,
  passwordResetRequest,
} from "../controllers/authController.js";
import upload from "../middlewares/uploadMiddleware.js";
import { userVerify } from "../middlewares/authMiddleware.js";
const router = express.Router();

router.post("/signup", userSignup);
router.post("/signin", userSignin);
router.get("/profile", userVerify, getUserProfile);
router.post("/password/reset", passwordResetRequest);
router.post("/password/reset/:token", passwordReset);
// router.put("/profile", protect, updateUserProfile);

router.post("/upload-image", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${
    req.file.filename
  }`;
  res.status(200).json({ imageUrl });
});
export default router;
