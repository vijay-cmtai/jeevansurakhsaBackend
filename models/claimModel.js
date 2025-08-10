import mongoose from "mongoose";

const claimSchema = new mongoose.Schema(
  {
    deceasedMember: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Member",
    },
    deceasedMemberPhotoUrl: {
      type: String,
      required: false,
    },
    deathCertificateUrl: {
      type: String,
      required: false,
    },
    nomineeDetails: {
      name: { type: String, required: true },
      accountNumber: { type: String, required: true },
      ifscCode: { type: String, required: false },
      bankName: { type: String, required: false },
    },
    contributionPlan: {
      type: String,
      required: true,
    },
    contributionAmountRequired: {
      type: Number,
      required: true,
    },
    claimStatus: {
      type: String,
      enum: ["Pending Review", "Active", "Processing", "Paid", "Rejected"],
      default: "Pending Review",
    },
    dateOfDeath: {
      type: Date,
      required: true,
    },
    reportedBy: {
      // For claims created by admin
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  {
    timestamps: true,
  }
);

const Claim = mongoose.model("Claim", claimSchema);

export default Claim;
