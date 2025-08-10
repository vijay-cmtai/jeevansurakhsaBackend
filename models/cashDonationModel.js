import mongoose from "mongoose";

const cashDonationSchema = mongoose.Schema(
  {
    receiptNo: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      lowercase: true,
    },
    mobile: {
      type: String,
      required: true,
    },
    address: {
      type: String,
    },
    amount: {
      type: Number,
      required: true,
    },
    mode: {
      type: String,
      default: "Cash",
    },
    paymentImageUrl: {
      type: String,
    },
    panNumber: {
      type: String,
      uppercase: true,
      trim: true,
    },
    bankName: {
      type: String,
    },
    branchName: {
      type: String,
    },

    // --- THIS IS THE CORRECTED FIELD ---
    // Instead of an ObjectId with a broken reference, we store a simple string.
    receivedBy: {
      type: String, // Changed from ObjectId to String
      required: true,
      // 'ref' has been removed as it's no longer needed.
    },
  },
  {
    timestamps: true,
  }
);

const CashDonation = mongoose.model("CashDonation", cashDonationSchema);

export default CashDonation;
