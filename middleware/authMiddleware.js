import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import Member from "../models/memberModel.js";

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // --- SIMPLIFIED LOGIC ---
      // We don't care if it's an admin or member here.
      // We just need to attach a user object with a valid _id.
      // The 'id' field is GUARANTEED to be in the token for both admins and members.
      req.user = { _id: decoded.id, isAdmin: decoded.isAdmin || false };
      console.log("this is admin", req.user);

      next();
    } catch (error) {
      console.error("TOKEN VERIFICATION FAILED:", error);
      res.status(401);
      throw new Error("Not authorized, token failed");
    }
  }

  if (!token) {
    res.status(401);
    throw new Error("Not authorized, no token");
  }
});

const admin = (req, res, next) => {
  console.log("this is user", req.user.isAdmin);
  // This middleware now has only one job: check the isAdmin flag.
  if (process.env.ADMIN_ID && req.user.isAdmin === true) {
    next();
  } else {
    res.status(401);
    throw new Error("Not authorized as an admin");
  }
};

export { protect, admin };
