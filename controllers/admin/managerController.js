// 📁 File: controllers/admin/managerController.js

import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import Manager from "../../models/managerModel.js";

// ✅✅✅ YAHAN PAR "TRICK" HAI ✅✅✅
const generateToken = (id, role) => {
  // Token mein hamesha isAdmin: true bhejein taaki purana middleware kaam kare
  // Asli permission 'role' se control hogi
  return jwt.sign({ id, role, isAdmin: true }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

export const authManagerLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const manager = await Manager.findOne({ email: email.toLowerCase() });

  if (manager && (await manager.matchPassword(password))) {
    if (manager.status === "Blocked") {
      res.status(403);
      throw new Error("Your account is blocked.");
    }
    res.json({
      _id: manager._id,
      name: manager.name,
      email: manager.email,
      role: manager.role,
      token: generateToken(manager._id, manager.role),
    });
  } else {
    res.status(401);
    throw new Error("Invalid email or password");
  }
});

// Create manager ab role ke saath data banayega
export const createManager = asyncHandler(async (req, res) => {
  const { name, email, mobile, password, role } = req.body;
  if (!name || !email || !mobile || !password || !role) {
    res.status(400);
    throw new Error(
      "Please provide all fields including a role (Admin/Manager)."
    );
  }
  const managerExists = await Manager.findOne({ $or: [{ email }, { mobile }] });
  if (managerExists) {
    res.status(400);
    throw new Error("User with this email or mobile already exists.");
  }
  const managerData = { name, email, mobile, password, role };
  if (req.file) {
    managerData.profilePicUrl = req.file.path;
  }
  const manager = await Manager.create(managerData);
  res.status(201).json({ message: "User created successfully", user: manager });
});

export const getActiveManagers = asyncHandler(async (req, res) => {
  const managers = await Manager.find({ status: "Active" }).sort({
    createdAt: -1,
  });
  res.json(managers);
});

export const getBlockedManagers = asyncHandler(async (req, res) => {
  const managersFromDB = await Manager.find({ status: "Blocked" }).sort({
    blockedAt: -1,
  });
  const managers = managersFromDB.map((m) => {
    const managerObject = m.toObject();
    if (m.blockedBy) {
      managerObject.blockedBy = { name: m.blockedBy, email: m.blockedBy };
    }
    return managerObject;
  });
  res.json(managers);
});

export const getManagerById = asyncHandler(async (req, res) => {
  const manager = await Manager.findById(req.params.id).select("-password");
  if (manager) {
    res.json(manager);
  } else {
    res.status(404);
    throw new Error("Manager not found");
  }
});

export const updateManager = asyncHandler(async (req, res) => {
  const manager = await Manager.findById(req.params.id);
  if (manager) {
    manager.name = req.body.name || manager.name;
    manager.email = req.body.email || manager.email;
    manager.mobile = req.body.mobile || manager.mobile;
    if (req.body.password) {
      manager.password = req.body.password;
    }
    if (req.file) {
      manager.profilePicUrl = req.file.path;
    }
    const updatedManager = await manager.save();
    res.json({
      message: "Manager updated successfully",
      manager: updatedManager,
    });
  } else {
    res.status(404);
    throw new Error("Manager not found.");
  }
});

export const changeManagerStatus = asyncHandler(async (req, res) => {
  const manager = await Manager.findById(req.params.id);
  if (manager) {
    manager.status = req.body.status;
    if (req.body.status === "Blocked") {
      manager.blockedAt = Date.now();
      // req.user might be simplified, so we might need a DB call if we need more info
      manager.blockedBy = req.user._id || "Super Admin";
    } else {
      manager.blockedAt = undefined;
      manager.blockedBy = undefined;
    }
    await manager.save();
    res.json({ message: `Manager has been ${manager.status.toLowerCase()}.` });
  } else {
    res.status(404);
    throw new Error("Manager not found");
  }
});

export const deleteManager = asyncHandler(async (req, res) => {
  const manager = await Manager.findById(req.params.id);
  if (manager) {
    await manager.deleteOne();
    res.json({ message: "Manager removed successfully." });
  } else {
    res.status(404);
    throw new Error("Manager not found");
  }
});
