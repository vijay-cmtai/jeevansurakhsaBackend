// server.js
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

// ✅ Enhanced CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:3001", 
      "https://jeevansurakhsa-frontend.vercel.app"
    ];
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
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

app.use(cors(corsOptions));

// ✅ Handle preflight OPTIONS requests explicitly
app.options('*', cors(corsOptions));

// ✅ Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ✅ Root route
app.get("/", (req, res) => {
  res.json({ 
    message: "JeevanSurakhsa API is running successfully...",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ✅ Health check route
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString() 
  });
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

// ✅ 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// ✅ Enhanced Global Error Handler with proper CORS
app.use((err, req, res, next) => {
  console.error("🔥 SERVER ERROR:", {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Ensure CORS headers are always sent, even on errors
  const allowedOrigin = req.headers.origin && [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://jeevansurakhsa-frontend.vercel.app"
  ].includes(req.headers.origin) ? req.headers.origin : "http://localhost:3000";

  res.header("Access-Control-Allow-Origin", allowedOrigin);
  res.header("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept, Origin");
  res.header("Access-Control-Allow-Credentials", "true");

  const statusCode = err.statusCode || res.statusCode === 200 ? 500 : res.statusCode;
  
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === "development" && { 
      stack: err.stack,
      error: err 
    })
  });
});

// ✅ Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`✅ Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`🌍 CORS enabled for: http://localhost:3000, https://jeevansurakhsa-frontend.vercel.app`);
});

export default app;
