import express from "express";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import Ticket from "../models/Ticket.js";
import User from "../models/User.js";
import Event from "../models/Event.js";

const router = express.Router();

router.get("/summary", auth, requireRole("admin"), async (_req, res) => {
  try {
    const [revenue, tickets, events, users] = await Promise.all([
      Ticket.aggregate([
        { $group: { _id: null, total: { $sum: "$pricePaid" } } },
      ]),
      Ticket.countDocuments(),
      Event.countDocuments(),
      User.countDocuments(),
    ]);

    res.json({
      totalRevenue: revenue[0]?.total || 0,
      totalTickets: tickets,
      totalEvents: events,
      totalUsers: users,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching summary", error: err.message });
  }
});

router.get("/sales", auth, requireRole("admin"), async (req, res) => {
  try {
    const period = req.query.period || "weekly";

    let groupBy;
    if (period === "monthly") {
      groupBy = { $dateToString: { format: "%Y-%m", date: "$createdAt" } };
    } else {
      groupBy = { $dateToString: { format: "%Y-%U", date: "$createdAt" } };
    }

    const sales = await Ticket.aggregate([
      { $group: { _id: groupBy, sales: { $sum: "$pricePaid" } } },
      { $sort: { _id: 1 } },
    ]);

    res.json(sales.map((s) => ({ name: s._id, sales: s.sales })));
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching sales", error: err.message });
  }
});

router.get("/demographics", auth, requireRole("admin"), async (_req, res) => {
  try {
    const [genderStats, ageStats] = await Promise.all([
      User.aggregate([
        { $group: { _id: "$profile.gender", value: { $sum: 1 } } },
      ]),
      User.aggregate([
        {
          $bucket: {
            groupBy: "$profile.age",
            boundaries: [0, 18, 30, 45, 60, 100],
            default: "Unknown",
            output: { count: { $sum: 1 } },
          },
        },
      ]),
    ]);

    const formatted = [
      ...genderStats.map((g) => ({ name: g._id || "unknown", value: g.value })),
      ...ageStats.map((a) => ({
        name: `Age ${a._id}`,
        value: a.count,
      })),
    ];

    res.json(formatted);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching demographics", error: err.message });
  }
});

export default router;
