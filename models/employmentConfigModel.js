import mongoose from "mongoose";

const employmentConfigSchema = new mongoose.Schema({
  // Singleton pattern ensures there's only one document for this configuration
  singleton: {
    type: String,
    default: "employment_config",
    unique: true,
  },
  employmentTypes: {
    type: [String],
    default: [],
  },
  departments: {
    type: [String],
    default: [],
  },
  companyNames: {
    type: [String],
    default: [],
  },
  contributionPlans: {
    type: [String],
    default: [],
  },
});

// Helper method to get the single config document, creating it if it doesn't exist
employmentConfigSchema.statics.getSingleton = async function () {
  let config = await this.findOne({ singleton: "employment_config" });
  if (!config) {
    config = await this.create({ singleton: "employment_config" });
  }
  return config;
};

const EmploymentConfig = mongoose.model(
  "EmploymentConfig",
  employmentConfigSchema
);
export default EmploymentConfig;
