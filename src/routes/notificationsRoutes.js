import express from "express";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import Notification from "../models/Notification.js";

const router = express.Router();

// Admin: Get all notifications (optional)
router.get("/", auth, requireRole("admin"), async (_req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.json(notifications);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// User: Get my notifications
router.get("/my", auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id }).sort({
      createdAt: -1,
    });
    res.json(notifications);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// User: Mark single notification as read
router.patch("/:id/read", auth, async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { isRead: true },
      { new: true }
    );

    if (!notif)
      return res.status(404).json({ message: "Notification not found" });
    res.json(notif);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// User: Mark all notifications as read
router.patch("/mark-all-read", auth, async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user.id }, { isRead: true });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
