import mongoose from "mongoose";

const TicketSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    seatNo: String,
    pricePaid: Number,
    qrToken: { type: String, required: true },
    checkedInAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Ticket", TicketSchema);
