// models/contributionPlanModel.js

import mongoose from "mongoose";

const planSchema = mongoose.Schema({
  planDetails: {
    type: String,
    required: true,
  },
});

const departmentSchema = mongoose.Schema({
  departmentName: {
    type: String,
    required: true,
  },
  plans: [planSchema],
});

const companySchema = mongoose.Schema({
  companyName: {
    type: String,
    required: true,
  },
  departments: [departmentSchema],
});

const contributionGroupSchema = mongoose.Schema(
  {
    recordId: {
      type: String,
      unique: true,
    },
    employmentType: {
      type: String,
      required: [true, "Employment type is required"],
      unique: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    companies: [companySchema],
  },
  {
    timestamps: true,
  }
);

contributionGroupSchema.pre("save", async function (next) {
  if (!this.isNew) {
    return next();
  }
  try {
    const lastGroup = await this.constructor.findOne(
      {},
      {},
      { sort: { createdAt: -1 } }
    );
    let lastIdNumber = 0;
    if (lastGroup && lastGroup.recordId) {
      lastIdNumber = parseInt(lastGroup.recordId.split("-")[1]) || 0;
    }
    this.recordId = `UDRCP-${lastIdNumber + 1}`;
    next();
  } catch (error) {
    next(error);
  }
});

const ContributionGroup = mongoose.model(
  "ContributionGroup",
  contributionGroupSchema
);

export default ContributionGroup;
