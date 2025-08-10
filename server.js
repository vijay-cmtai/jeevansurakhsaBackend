import express from "express";
import dotenv from "dotenv";
import cors from "cors";

// --- Step 1: Load environment variables FIRST ---
dotenv.config();

// --- Step 2: Import and RUN the Cloudinary configuration function immediately after ---
import { configureCloudinary } from "./config/cloudinary.js";
configureCloudinary();

// --- Step 3: Now, import all other files that depend on environment variables ---
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
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API is running successfully...");
});

// --- Route Mounting ---
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

// Error handler
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? "🥞" : err.stack,
  });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () =>
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
);
