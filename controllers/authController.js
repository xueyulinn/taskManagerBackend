import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Resend } from "resend";
import User from "../models/User.js";
const generateJWT = (userId) => {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
  return token;
};

const userSignup = async (req, res) => {
  try {
    const { username, password, email, adminInviteToken } = req.body;
    let { avatar } = req.body;

    // check if user exists
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "User already exists." });
    }

    // identify user role
    let role = "member";
    if (adminInviteToken && adminInviteToken == process.env.ADMIN_TOKEN) {
      role = "admin";
    }

    // hash the password
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    if (avatar === "") {
      avatar = "https://cdn-icons-png.flaticon.com/128/3177/3177440.png";
    }

    // create user
    const user = await User.create({
      username,
      email,
      password: hash,
      avatar,
      role,
    });

    res.status(201).json({
      _id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      token: generateJWT(user.id),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
const userSignin = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    // check if the user exists
    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });
    if (!user) {
      return res.status(400).json({
        message: "The username and/or password you specified are not correct.",
      });
    }

    const match = bcrypt.compareSync(password, user.password);
    if (!match) {
      return res.status(400).json({
        message: "The username and/or password you specified are not correct.",
      });
    }

    // return user data with JWT
    res.status(201).json({
      _id: user.id,
      username: user.userName,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      token: generateJWT(user.id),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const passwordResetRequest = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    const token = jwt.sign({ email }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });

    const resetLink = `http://localhost:5173/accounts/reset-password/${token}`;

    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: "TaskManager <onboarding@resend.dev>",
      to: [email],
      subject: "[TaskManager] Password Reset E-mail",
      html: `<p>Click <a href="${resetLink}">here</a> to reset your password. Please note this email is valid with 15 minutes. If you did not request a password reset you can safely ignore this email.</p>`,
    });

    return res.status(200).json({ message: "Password reset email sent." });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

const passwordReset = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ email: payload.email });
    if (!user) return res.status(404).json({ message: "User not found." });

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(newPassword, salt);
    user.password = hash;
    await user.save();
    return res.json({ message: "Password has been reset successfully" });
  } catch (error) {
    if (error.message === "jwt expired")
      return res.status(400).json({ message: "Credentials expired." });
    return res.status(500).json({ message: "Server error" });
  }
};

const getUserProfile = async (req, res) => {
  try {
    // exclude the password field
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(401).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
export {
  getUserProfile,
  passwordResetRequest,
  passwordReset,
  userSignin,
  userSignup,
};
