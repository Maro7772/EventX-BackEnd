import express from "express";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import Event from "../models/Event.js";
import Ticket from "../models/Ticket.js";
import { signJWT, verifyJWT } from "../utils/generateJWT.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";

const router = express.Router();

router.get("/", auth, requireRole("admin"), async (req, res) => {
  try {
    const tickets = await Ticket.find()
      .populate("user", "name email")
      .populate("event", "title date");

    const formatted = tickets.map((t) => ({
      _id: t._id,
      eventTitle: t.event?.title || "Deleted Event",
      eventDate: t.event?.date || null,
      userName: t.user?.name || "Deleted User",
      userEmail: t.user?.email || "",
      seatNo: t.seatNo,
      pricePaid: t.pricePaid,
      checkedInAt: t.checkedInAt || null,
    }));

    res.json(formatted);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/book", auth, async (req, res) => {
  try {
    const { eventId, seatNo } = req.body;
    const ev = await Event.findById(eventId);
    if (!ev) return res.status(404).json({ message: "Event not found" });

    const alreadyBooked = await Ticket.findOne({
      user: req.user.id,
      event: eventId,
    });
    if (alreadyBooked) {
      return res
        .status(400)
        .json({ message: "You already booked a seat for this event" });
    }

    const seat = ev.seats.find((s) => s.seatNo === seatNo);
    if (!seat || seat.isBooked)
      return res.status(400).json({ message: "Seat unavailable" });

    seat.isBooked = true;
    await ev.save();

    const qrToken = signJWT({ userId: req.user.id, eventId, seatNo }, "3d");
    const ticket = await Ticket.create({
      user: req.user.id,
      event: eventId,
      seatNo,
      pricePaid: ev.price,
      qrToken,
    });
    res.json(ticket);

    const admins = await User.find({ role: "admin" });
    for (const admin of admins) {
      await Notification.create({
        user: admin._id,
        message: `🟢 ${req.user.name} booked a seat (${seatNo}) for "${
          ev.title
        }" at ${new Date().toISOString()}`,
        type: "success",
        type: "success",
      });
    }
    await Notification.create({
      user: req.user.id,
      message: `🎟️ Seat ${seatNo} booked for "${
        ev.title
      }" at ${new Date().toISOString()}`,
      type: "warning",
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/mine", auth, async (req, res) => {
  const t = await Ticket.find({ user: req.user.id }).populate("event");
  res.json(t);
});

router.get(
  "/by-event/:eventId",
  auth,
  requireRole("admin"),
  async (req, res) => {
    const { eventId } = req.params;
    const t = await Ticket.find({ event: eventId })
      .populate("user")
      .populate("event");
    res.json(t);
  }
);

router.post("/checkin", auth, requireRole("admin"), async (req, res) => {
  const { token } = req.body;
  try {
    const payload = verifyJWT(token);

    const ticket = await Ticket.findOne({
      user: payload.userId,
      event: payload.eventId,
      seatNo: payload.seatNo,
    });
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    if (ticket.checkedInAt)
      return res.status(409).json({ message: "Already checked in" });
    ticket.checkedInAt = new Date();
    await ticket.save();
    res.json({ ok: true, ticket });
  } catch (e) {
    res.status(400).json({ message: "Invalid token" });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      _id: req.params.id,
      user: req.user.id,
    }).populate("event");
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // free the seat again
    const ev = await Event.findById(ticket.event._id);
    const seat = ev.seats.find((s) => s.seatNo === ticket.seatNo);
    if (seat) {
      seat.isBooked = false;
      await ev.save();
    }

    await ticket.deleteOne();

    await Notification.create({
      user: req.user.id,
      message: `❌ Ticket for seat ${ticket.seatNo} in "${
        ev.title
      }" has been cancelled at ${new Date().toISOString()}`,
      type: "info",
    });

    res.json({ message: "Ticket deleted successfully" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});
export default router;
