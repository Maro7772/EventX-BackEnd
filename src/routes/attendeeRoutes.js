import express from "express";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import User from "../models/User.js";

const router = express.Router();

router.get("/insights", auth, requireRole("admin"), async (_req, res) => {
  try {
    const total = await User.countDocuments({ role: "user" });

    // 👤 Age groups
    const ageGroupsRaw = await User.aggregate([
      { $match: { role: "user" } },
      {
        $bucket: {
          groupBy: "$profile.age",
          boundaries: [0, 18, 25, 35, 45, 60, 100],
          default: "Unknown",
          output: { count: { $sum: 1 } },
        },
      },
    ]);

    const ageLabels = {
      0: "0-17",
      18: "18-24",
      25: "25-34",
      35: "35-44",
      45: "45-59",
      60: "60+",
      Unknown: "Unknown",
    };

    const ages = ageGroupsRaw.map((a) => ({
      name: ageLabels[a._id] || "Unknown",
      value: a.count,
    }));

    // 👤 Genders
    const gendersRaw = await User.aggregate([
      { $match: { role: "user" } },
      {
        $group: {
          _id: {
            $cond: [
              { $ifNull: ["$profile.gender", false] },
              { $toLower: "$profile.gender" },
              "unknown",
            ],
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const genders = gendersRaw.map((g) => ({
      name:
        g._id && g._id !== "unknown"
          ? g._id.charAt(0).toUpperCase() + g._id.slice(1)
          : "Unknown",
      value: g.count,
    }));

    // 👤 Locations
    const locationsRaw = await User.aggregate([
      {
        $match: {
          role: "user",
          "profile.location": { $nin: [null, ""] },
        },
      },
      { $group: { _id: "$profile.location", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const locations = locationsRaw.map((l) => ({
      name: l._id || "Unknown",
      value: l.count,
    }));

    // 👤 Interests
    const interestsRaw = await User.aggregate([
      { $match: { role: "user", "profile.interests": { $exists: true } } },
      { $unwind: "$profile.interests" },
      { $group: { _id: "$profile.interests", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const interests = interestsRaw.map((i) => ({
      name: i._id || "Unknown",
      value: i.count,
    }));

    res.json({
      total,
      ages,
      genders,
      locations,
      interests,
    });
  } catch (err) {
    res.status(500).json({
      message: "Error fetching attendee insights",
      error: err.message,
    });
  }
});

export default router;
