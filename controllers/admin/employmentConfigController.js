import asyncHandler from "express-async-handler";
import EmploymentConfig from "../../models/employmentConfigModel.js";

// --- GET all configuration data ---
const getEmploymentConfig = asyncHandler(async (req, res) => {
  const config = await EmploymentConfig.getSingleton();
  res.json(config);
});

// --- ADD a new item to a specific list ---
const addConfigItem = asyncHandler(async (req, res) => {
  const { itemType } = req.params; // e.g., 'employmentTypes', 'departments'
  const { name } = req.body;

  if (!name || !name.trim()) {
    res.status(400);
    throw new Error("Name cannot be empty.");
  }

  const config = await EmploymentConfig.getSingleton();

  if (!config[itemType] || !Array.isArray(config[itemType])) {
    res.status(400);
    throw new Error(`Invalid configuration type: ${itemType}`);
  }

  // Check for duplicates (case-insensitive)
  if (
    config[itemType].some(
      (item) => item.toLowerCase() === name.trim().toLowerCase()
    )
  ) {
    res.status(400);
    throw new Error(`'${name}' already exists in this list.`);
  }

  config[itemType].push(name.trim());
  await config.save();

  res.status(201).json(config); // Return the entire updated config object
});

// --- DELETE an item from a specific list ---
const deleteConfigItem = asyncHandler(async (req, res) => {
  const { itemType } = req.params;
  const { name } = req.body;

  if (!name) {
    res.status(400);
    throw new Error("Name to delete is required.");
  }

  const config = await EmploymentConfig.getSingleton();

  if (!config[itemType] || !Array.isArray(config[itemType])) {
    res.status(400);
    throw new Error(`Invalid configuration type: ${itemType}`);
  }

  const originalLength = config[itemType].length;
  // Filter out the item to delete (case-insensitive)
  config[itemType] = config[itemType].filter(
    (item) => item.toLowerCase() !== name.toLowerCase()
  );

  if (config[itemType].length === originalLength) {
    res.status(404);
    throw new Error(`'${name}' not found in the list.`);
  }

  await config.save();
  res.json(config); // Return the entire updated config object
});

export { getEmploymentConfig, addConfigItem, deleteConfigItem };
