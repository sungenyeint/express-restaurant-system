import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema(
  {
    table: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Table",
    //   required: true,
    },
    orderType: {
      type: String,
      enum: ["dine-in", "takeaway"],
      default: "dine-in",
    },
    items: [
      {
        menu: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "MenuItem",
          required: true,
        },
        // name: String,
        // price: Number,
        qty: Number,
      },
    ],
    total: {
      type: Number,
      required: true,
      default: 0,
    },
    notes: { type: String, default: "" },
    // Payment info
    amountPaid: { type: Number },
    paidAt: { type: Date },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: ["pending", "preparing", "ready", "served", "paid"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Order", OrderSchema);
