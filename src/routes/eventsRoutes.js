import express from "express";
import Event from "../models/Event.js";
import User from "../models/User.js";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import Notification from "../models/Notification.js";

const router = express.Router();

router.post("/", auth, requireRole("admin"), async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      venue,
      price,
      startTime,
      endTime,
      popularity,
      totalSeats = 50,
      status,
    } = req.body;

    const validStatus = ["Upcoming", "Pending", "Closed"].includes(status)
      ? status
      : "Upcoming";

    const event = await Event.create({
      title,
      description,
      date,
      startTime,
      endTime,
      venue,
      popularity,
      price,
      totalSeats,
      status: validStatus,
    });

    res.json(event);

    const users = await User.find({ role: "user" });

    for (const user of users) {
      const exists = await Notification.findOne({
        user: user._id,
        message: `🎉 Event "${title}" has been created`,
      });
      if (!exists) {
        await Notification.create({
          user: user._id,
          message: `🎉 Event "${title}" has been created`,
          type: "success",
        });
      }
    }
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/", async (req, res) => {
  const { status, q } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (q) filter.title = { $regex: q, $options: "i" };
  const events = await Event.find(filter).sort({ date: 1 });

  const sanitized = events.map((ev) => ({
    ...ev.toObject(),
    seats: ev.seats || [],
  }));

  res.json(sanitized);
});

router.get("/:id", async (req, res) => {
  const ev = await Event.findById(req.params.id);
  if (!ev) return res.status(404).json({ message: "Not found" });
  res.json(ev);
});

router.put("/:id", auth, requireRole("admin"), async (req, res) => {
  const ev = await Event.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  res.json(ev);
});

router.delete("/:id", auth, requireRole("admin"), async (req, res) => {
  await Event.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;
