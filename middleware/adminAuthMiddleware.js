import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";

// This single middleware will protect all admin routes.
const adminProtect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // 1. Get token from header
      token = req.headers.authorization.split(" ")[1];

      // 2. Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 3. Check if it is a valid admin token (must have isAdmin and id)
      if (!decoded.isAdmin || !decoded.id) {
        res.status(401);
        throw new Error("Not authorized, invalid admin token");
      }

      // 4. If everything is perfect, attach the user object to the request
      req.user = {
        _id: decoded.id,
        isAdmin: true,
      };
      console.log("this is ", req.user);

      next(); // Proceed to the controller
    } catch (error) {
      res.status(401);
      throw new Error("Not authorized, token failed");
    }
  }

  if (!token) {
    res.status(401);
    throw new Error("Not authorized, no token");
  }
});

export { adminProtect };
