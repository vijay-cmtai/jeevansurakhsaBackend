import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";

// This function signs the token with the admin's ID.
const generateAdminToken = (id) => {
  return jwt.sign({ id, isAdmin: true }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
};

const authAdminLogin = asyncHandler(async (req, res) => {
  console.log("<<<<< RUNNING THE NEW AUTH ADMIN CONTROLLER >>>>>");

  const { email, password } = req.body;

  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "healthguard0102@gmail.com";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "1Health@121";
  const ADMIN_ID = "507f191e810c19729de860ea";

  if (
    email.toLowerCase() === ADMIN_EMAIL.toLowerCase() &&
    password === ADMIN_PASSWORD
  ) {
    res.json({
      _id: ADMIN_ID,
      email: ADMIN_EMAIL,
      isAdmin: true,
      token: generateAdminToken(ADMIN_ID),
    });
  } else {
    res.status(401);
    throw new Error("Invalid admin email or password");
  }
});

export { authAdminLogin };
