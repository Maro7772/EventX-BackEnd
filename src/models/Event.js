import mongoose from "mongoose";

const SeatSchema = new mongoose.Schema({
  seatNo: String,
  isBooked: { type: Boolean, default: false },
  ticket: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket" },
});

const EventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    date: { type: Date, required: true },
    venue: String,
    price: { type: Number, default: 0 },
    totalSeats: { type: Number, default: 50 },
    seats: [SeatSchema],
    status: {
      type: String,
      enum: ["Upcoming", "Pending", "Closed"],
      default: "Upcoming",
    },
    startTime: String,
    endTime: String,
    popularity: {
      type: String,
      enum: ["New", "Trending", "Popular"],
      default: "New",
    },
  },
  { timestamps: true }
);

EventSchema.pre("save", function (next) {
  if (this.isNew && (!this.seats || this.seats.length === 0)) {
    this.seats = Array.from({ length: this.totalSeats }, (_, i) => ({
      seatNo: `S${i + 1}`,
    }));
  }
  next();
});

export default mongoose.model("Event", EventSchema);
