// File: models/memberCertificateModel.js

import mongoose from "mongoose";

const memberCertificateSchema = mongoose.Schema(
  {
    certificateNo: {
      type: String,
      required: true,
      unique: true,
    },
    member: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Member",
      unique: true,
    },
    fatherName: {
      type: String,
      required: true,
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
      required: false, // Optional, as we generate PDF on the fly
    },
    // --- 🚨 CRITICAL CHANGE 🚨 ---
    // Storing admin's identifier (name/email) directly as a String
    generatedBy: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const MemberCertificate = mongoose.model(
  "MemberCertificate",
  memberCertificateSchema
);

export default MemberCertificate;
