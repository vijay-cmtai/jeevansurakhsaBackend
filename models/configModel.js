// models/configModel.js
import mongoose from "mongoose";

const districtSchema = mongoose.Schema({
  name: { type: String, required: true },
});

const stateSchema = mongoose.Schema({
  name: { type: String, required: true, unique: true },
  districts: [districtSchema],
});

const volunteerSchema = mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true, uppercase: true },
});

const configSchema = mongoose.Schema(
  {
    // Using a singleton pattern - there will only be one document
    singleton: {
      type: String,
      default: "main_config",
      unique: true,
    },
    states: [stateSchema],
    volunteers: [volunteerSchema],
  },
  { timestamps: true }
);

const Config = mongoose.model("Config", configSchema);
export default Config;
