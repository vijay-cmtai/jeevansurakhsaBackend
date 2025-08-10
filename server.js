import express from "express";
import dotenv from "dotenv";
import cors from "cors";

// Load configurations first
dotenv.config();

import { configureCloudinary } from "./config/cloudinary.js";
import connectDB from "./config/db.js";

// Import routes
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

// Configure database and Cloudinary
configureCloudinary();
connectDB();

const app = express();

// CORS Configuration
const allowedOrigins = [
  "http://localhost:3000",
  "https://jeevansurakhsa-frontend.vercel.app"
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin '${origin}' not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'x-auth-token'
  ],
  optionsSuccessStatus: 200
};

// Special handling for OPTIONS requests
app.options('*', cors(corsOptions));

// Apply CORS middleware
app.use(cors(corsOptions));

// Manually set CORS headers for all responses
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-auth-token'
  );
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Root route
app.get("/", (req, res) => {
  res.json({ 
    message: "JeevanSurakhsa API is running successfully...",
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "OK",
    database: "Connected", // You might want to add actual DB health check
    timestamp: new Date().toISOString()
  });
});

// API Routes
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

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route Not Found: ${req.originalUrl}`,
    timestamp: new Date().toISOString()
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("🔥 GLOBAL ERROR HANDLER:", {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    timestamp: new Date().toISOString()
  });

  const statusCode = err.statusCode || 500;
  const response = {
    success: false,
    message: err.message || 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  };

  if (process.env.NODE_ENV === "development") {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
});

// Export for Vercel
export default app;
