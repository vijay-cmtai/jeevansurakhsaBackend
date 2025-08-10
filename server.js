import express from "express";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

import { configureCloudinary } from "./config/cloudinary.js";
configureCloudinary();

import connectDB from "./config/db.js";
import memberRoutes from "./routes/memberRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import membershipAdminRoutes from "./routes/membershipRoutes.js";
import allUsersRoutes from "./routes/allUsersRoutes.js";
import receiptRoutes from "./routes/receiptRoutes.js";
import contributionPlanRoutes from "./routes/contributionPlanRoutes.js";
import employmentConfigRoutes from "./routes/employmentConfigRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import visitorDonationRoutes from "./routes/visitorDonationRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";
import noticeRoutes from "./routes/noticeRoutes.js";
import memberDonationRoutes from "./routes/memberDonationRoutes.js";
import claimRoutes from "./routes/claimRoutes.js";
import userRoutes from "./routes/userRoutes.js";

connectDB();

const app = express();

// ✅ Allow both local & deployed frontend
const allowedOrigins = [
  "http://localhost:3000",
  "https://jeevansurakhsa-frontend.vercel.app", // your deployed frontend domain
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
};

// ✅ Apply CORS before any routes
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json());

app.get("/", (req, res) => {
  res.send("API is running successfully...");
});

// ✅ Routes
app.use("/api/members", memberRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin", membershipAdminRoutes);
app.use("/api/all-users", allUsersRoutes);
app.use("/api/receipts", receiptRoutes);
app.use("/api/contribution-plans", contributionPlanRoutes);
app.use("/api/employment-config", employmentConfigRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/donate", visitorDonationRoutes);
app.use("/api/admin/stats", statsRoutes);
app.use("/api/notices", noticeRoutes);
app.use("/api/member-donations", memberDonationRoutes);
app.use("/api/claims", claimRoutes);
app.use("/api/users", userRoutes);

// ✅ Error handler with logging
app.use((err, req, res, next) => {
  console.error("🔥 ERROR:", err);

  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      message: "CORS Error: This origin is not allowed to access this resource.",
    });
  }

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? "🥞" : err.stack,
  });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () =>
  console.log(`✅ Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
);
