import mongoose from "mongoose";

const visitorCertificateSchema = new mongoose.Schema(
  {
    certificateNo: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    fatherName: {
      type: String,
      required: true,
    },
    mobile: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      lowercase: true,
    },
    programName: {
      type: String,
      required: true,
    },
    templateId: {
      type: String,
      required: true,
    },
    certificateUrl: {
      type: String,
      required: true,
    },

    // --- THIS IS THE CORRECTED FIELD ---
    // Instead of an ObjectId with a broken reference, we store the admin's name.
    generatedBy: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const VisitorCertificate = mongoose.model(
  "VisitorCertificate",
  visitorCertificateSchema
);

export default VisitorCertificate;
