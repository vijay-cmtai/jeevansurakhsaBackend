// File: models/configModel.js
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
  phone: { type: String, required: true },
  state: { type: String, required: true },
  district: { type: String, required: true },
});
const configSchema = mongoose.Schema(
  {
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
