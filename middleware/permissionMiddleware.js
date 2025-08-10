// 📁 File: middleware/permissionMiddleware.js

import asyncHandler from "express-async-handler";
import Manager from "../models/managerModel.js";

// Yeh middleware check karega ki user sach mein Admin hai ya nahi
export const isTrueAdmin = asyncHandler(async (req, res, next) => {
  // `protect` middleware ne pehle hi token se user ki ID `req.user._id` mein daal di hai
  // Hum hardcoded admin ko bhi check karenge
  if (req.user._id === "507f191e810c19729de860ea") {
    // Hardcoded Admin ID
    return next();
  }

  // Database user ke liye check karein
  const user = await Manager.findById(req.user._id);

  if (user && user.role === "Admin") {
    next(); // Agar sach mein Admin hai, to aage jaane do
  } else {
    res.status(403); // Forbidden
    throw new Error("Action not allowed. Admin permission required.");
  }
});
