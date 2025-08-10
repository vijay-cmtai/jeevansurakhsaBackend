import mongoose from "mongoose";

const memberDonationSchema = mongoose.Schema(
  {
    member: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Member", // Member model se link karega
    },
    amount: {
      type: Number,
      required: true,
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
    },
    // Cashfree payment ID (CF se milti hai)
    paymentId: {
      type: String,
    },
    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED"],
      default: "PENDING",
    },
    receiptNo: {
      type: String,
    },
    // Tax ke liye optional fields
    panNumber: { type: String },
    bankName: { type: String },
    branchName: { type: String },
    // Payment method details
    paymentMethod: { type: String },
    // Payment completion time
    paidAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
memberDonationSchema.index({ member: 1, createdAt: -1 });
memberDonationSchema.index({ transactionId: 1 });
memberDonationSchema.index({ status: 1 });

const MemberDonation = mongoose.model("MemberDonation", memberDonationSchema);

export default MemberDonation;
