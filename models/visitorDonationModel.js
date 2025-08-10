import mongoose from "mongoose";

const visitorDonationSchema = new mongoose.Schema(
  {
    // Saare fields yahan rahenge...
    name: { type: String, required: true },
    email: { type: String, lowercase: true },
    mobile: { type: String, required: true },
    address: { type: String },
    amount: { type: Number, required: true },
    panNumber: { type: String },
    bankName: { type: String },
    branchName: { type: String },
    transactionId: { type: String, required: true, unique: true },
    cfOrderId: { type: String },
    paymentSessionId: { type: String },
    cashfreeOrderStatus: { type: String },
    orderExpiryTime: { type: Date },
    receiptNo: { type: String, unique: true, sparse: true },
    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED"],
      default: "PENDING",
    },
  },
  {
    timestamps: true,
  }
);

// Yeh line model ko dobara banne se rokti hai
const VisitorDonation =
  mongoose.models.VisitorDonation ||
  mongoose.model("VisitorDonation", visitorDonationSchema);

export default VisitorDonation;
