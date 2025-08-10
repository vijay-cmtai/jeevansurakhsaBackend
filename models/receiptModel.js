import mongoose from "mongoose";

const receiptSchema = mongoose.Schema(
  {
    member: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Member",
    },
    receiptNo: {
      type: String,
      required: true,
      unique: true,
    },
    receiptType: {
      type: String,
      required: true,
      enum: ["REGISTRATION", "DONATION", "OTHER"],
    },
    amount: {
      type: Number,
      required: true,
    },
    paymentOrderId: {
      // The order_id from Cashfree
      type: String,
      required: true,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Receipt = mongoose.model("Receipt", receiptSchema);
export default Receipt;
