import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { signJWT } from "../utils/generateJWT.js";
import Notification from "../models/Notification.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      adminCode,
      age,
      gender,
      interests,
      location,
    } = req.body;

    // check if email already exists
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: "Email already used" });

    // hash password
    const hash = await bcrypt.hash(password, 10);

    // role check
    let finalRole = "user";
    if (role === "admin") {
      if (parseInt(adminCode) === parseInt(process.env.ADMIN_CODE)) {
        finalRole = "admin";
      } else {
        return res.status(403).json({ message: "Invalid admin code" });
      }
    }

    // create user
    const user = await User.create({
      name,
      email,
      password: hash,
      role: finalRole,
      profile: {
        age: age || 18,
        gender: gender || "male",
        interests:
          interests && interests.length > 0 ? interests : ["sports", "arts"],
        location: location || "Cairo",
      },
    });

    // sign token
    const token = signJWT({ id: user._id, role: user.role });

    // response
    res.json({
      token,
      user: {
        id: user._id,
        name,
        email,
        role: user.role,
        profile: user.profile,
      },
    });

    // notification
    await Notification.create({
      message: `🆕 New user registered: ${user.name}`,
      type: "info",
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });
    const token = signJWT({ id: user._id, role: user.role });
    res.json({
      token,
      user: { id: user._id, name: user.name, email, role: user.role },
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
