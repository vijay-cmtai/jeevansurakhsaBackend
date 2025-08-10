// server.js

import express from "express";
import dotenv from "dotenv";
import cors from "cors";

// Configurations ko sabse pehle load karein
dotenv.config();

import { configureCloudinary } from "./config/cloudinary.js";
import connectDB from "./config/db.js";

// Routes ko import karein
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

// Database aur Cloudinary ko configure karein
configureCloudinary();
connectDB();

const app = express();

// ✅ CORS Configuration (Yeh setup bilkul sahi hai)
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      "http://localhost:3000",
      "https://jeevansurakhsa-frontend.vercel.app"
    ];
    
    // Allow requests with no origin (like Postman) or from allowed origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  optionsSuccessStatus: 200 // For legacy browser support
};

// CORS middleware ko sabse pehle istemal karein
app.use(cors(corsOptions));

// Pre-flight requests ke liye
app.options('*', cors(corsOptions));

// ✅ Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ Request logging middleware (Debugging ke liye faydemand)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ✅ Root route
app.get("/", (req, res) => {
  res.json({ 
    message: "JeevanSurakhsa API is running successfully...",
    environment: process.env.NODE_ENV || 'development'
  });
});

// ✅ Health check route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

// ✅ API Routes
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

// ✅ 404 Handler (Jab koi route match na ho)
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route Not Found: ${req.originalUrl}`
  });
});

// ✅ Global Error Handler
app.use((err, req, res, next) => {
  console.error("🔥 GLOBAL ERROR HANDLER CAUGHT:", err);

  const statusCode = err.statusCode || 500;
  
  res.status(statusCode).json({
    success: false,
    message: err.message || 'An unexpected internal server error occurred.',
    // Development mode mein extra details bhej sakte hain
    ...(process.env.NODE_ENV === "development" && { stack: err.stack })
  });
});


// ❌ VERCEL DEPLOYMENT KE LIYE IS BLOCK KO HATA DIYA GAYA HAI
/*
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`✅ Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
*/

// ✅ VERCEL KE LIYE EXPRESS APP KO EXPORT KARNA ZAROORI HAI
// Yahi line Vercel ko batati hai ki requests ko kaise handle karna hai.
export default app;
