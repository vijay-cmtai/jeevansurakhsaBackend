import asyncHandler from "express-async-handler";
import crypto from "crypto";
import axios from "axios";
import VisitorDonation from "../models/visitorDonationModel.js";

/**
 * @description Centralized helper function to update a visitor donation to SUCCESS.
 *              This avoids code duplication and ensures consistent behavior.
 * @param {object} donation - The Mongoose donation document.
 * @param {object} paymentData - Payment details from Cashfree.
 * @returns {Promise<object>} The updated and saved donation document.
 */
const updateVisitorDonationOnSuccess = async (donation, paymentData) => {
  // If already updated, do nothing to prevent race conditions.
  if (donation.status === "SUCCESS") {
    console.log(
      `[Info] VisitorDonation ${donation.transactionId} is already SUCCESS.`
    );
    return donation;
  }
  donation.status = "SUCCESS";
  donation.receiptNo = `VDR-${new Date().getFullYear()}-${String(donation._id).slice(-6).toUpperCase()}`;
  // Optional: You can add more fields like paidAt, paymentMethod if your schema supports it
  // if (paymentData) {
  //     donation.paymentId = paymentData.cf_payment_id;
  // }
  console.log(
    `[Success] Updating VisitorDonation ${donation.transactionId} to SUCCESS. Receipt: ${donation.receiptNo}`
  );
  return await donation.save();
};

/**
 * @description Initiates a donation for a visitor by creating an order with Cashfree.
 * @route   POST /api/donate/initiate
 * @access  Public
 */
export const initiateDonation = asyncHandler(async (req, res) => {
  // ✅ DEBUGGING STEP: Log credentials to quickly identify .env issues.
  console.log("--- [Visitor Donation] Checking Environment Variables ---");
  console.log("CASHFREE_API_URL:", process.env.CASHFREE_API_URL);
  console.log("CASHFREE_APP_ID:", process.env.CASHFREE_APP_ID);
  console.log("CASHFREE_SECRET_KEY loaded:", !!process.env.CASHFREE_SECRET_KEY);
  console.log("---------------------------------------------------------");

  const {
    name,
    email,
    mobile,
    address,
    amount,
    panNumber,
    bankName,
    branchName,
  } = req.body;
  if (!name || !mobile || !amount) {
    res.status(400);
    throw new Error("Name, mobile, and amount are required fields.");
  }

  const transactionId = `TXN_VISITOR_${Date.now()}`;

  const orderPayload = {
    order_id: transactionId,
    order_amount: amount,
    order_currency: "INR",
    customer_details: {
      customer_id: `VISITOR_${mobile}_${Date.now()}`,
      customer_name: name,
      customer_email: email,
      customer_phone: mobile,
    },
    order_meta: {
      return_url: `${process.env.FRONTEND_URL}/donation-status?order_id={order_id}`,
      notify_url: `${process.env.BACKEND_URL}/api/donate/callback`,
    },
    order_note: "Visitor Donation for Jeevan Suraksha",
  };

  try {
    const cashfreeResponse = await axios.post(
      `${process.env.CASHFREE_API_URL}/orders`,
      orderPayload,
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-version": "2022-09-01",
          "x-client-id": process.env.CASHFREE_APP_ID,
          "x-client-secret": process.env.CASHFREE_SECRET_KEY,
        },
      }
    );

    const cashfreeData = cashfreeResponse.data;
    await VisitorDonation.create({
      name,
      email,
      mobile,
      address,
      amount,
      panNumber,
      bankName,
      branchName,
      transactionId,
      cfOrderId: cashfreeData.cf_order_id,
      paymentSessionId: cashfreeData.payment_session_id,
      cashfreeOrderStatus: cashfreeData.order_status,
      orderExpiryTime: cashfreeData.order_expiry_time,
      status: "PENDING",
    });

    console.log("VisitorDonation record created in DB with PENDING status.");
    res.status(201).json({
      payment_session_id: cashfreeData.payment_session_id,
      order_id: transactionId,
    });
  } catch (error) {
    console.error(
      "Failed to process visitor donation request:",
      error.response?.data || error.message
    );
    res.status(500).json({
      message:
        "Failed to create payment order. Please check credentials and try again.",
      errorDetails: error.response?.data, // Send detailed error for debugging
    });
  }
});

/**
 * @description Handles webhooks from Cashfree for server-to-server confirmation.
 * @route   POST /api/donate/callback
 * @access  Public
 */
export const handleDonationCallback = asyncHandler(async (req, res) => {
  // Your signature verification logic here is a good practice for production.
  const { data } = req.body;
  if (!data || !data.order)
    return res.status(400).send("Invalid webhook payload.");

  const { order, payment } = data;
  const donation = await VisitorDonation.findOne({
    transactionId: order.order_id,
  });
  if (!donation) return res.status(404).send("Donation record not found.");

  if (order.order_status === "PAID") {
    await updateVisitorDonationOnSuccess(donation, payment);
  } else if (["FAILED", "CANCELLED", "EXPIRED"].includes(order.order_status)) {
    if (donation.status !== "FAILED") {
      donation.status = "FAILED";
      await donation.save();
    }
  }
  res.status(200).send("Webhook processed successfully.");
});

/**
 * @description Checks donation status for the frontend polling mechanism.
 * @route   GET /api/donate/status/:order_id
 * @access  Public
 */
export const checkDonationStatus = asyncHandler(async (req, res) => {
  const { order_id } = req.params;
  const donation = await VisitorDonation.findOne({ transactionId: order_id });

  if (!donation) {
    return res.status(404).json({ message: "Transaction record not found." });
  }

  if (donation.status !== "PENDING") {
    console.log(
      `[Status Check] Returning final status '${donation.status}' for order ${order_id} from DB.`
    );
    return res.json({
      status: donation.status,
      receiptNo: donation.receiptNo,
      amount: donation.amount,
      createdAt: donation.createdAt,
      donorName: donation.name,
    });
  }

  // If status is PENDING, actively verify with the Cashfree API.
  try {
    console.log(
      `[Status Check] Status for ${order_id} is PENDING. Verifying with Cashfree.`
    );
    const response = await axios.get(
      `${process.env.CASHFREE_API_URL}/orders/${order_id}`,
      {
        headers: {
          "x-api-version": "2022-09-01",
          "x-client-id": process.env.CASHFREE_APP_ID,
          "x-client-secret": process.env.CASHFREE_SECRET_KEY,
        },
      }
    );

    const cashfreeOrder = response.data;
    let updatedDonation = donation;

    if (cashfreeOrder.order_status === "PAID") {
      updatedDonation = await updateVisitorDonationOnSuccess(
        donation,
        cashfreeOrder
      );
    } else if (
      ["FAILED", "CANCELLED", "EXPIRED"].includes(cashfreeOrder.order_status)
    ) {
      updatedDonation.status = "FAILED";
      await updatedDonation.save();
    }

    res.json({
      status: updatedDonation.status,
      receiptNo: updatedDonation.receiptNo,
      amount: updatedDonation.amount,
      createdAt: updatedDonation.createdAt,
      donorName: updatedDonation.name,
    });
  } catch (error) {
    console.error(
      `[Status Check Error] Cashfree API failed for order ${order_id}:`,
      error.response?.data
    );
    res
      .status(500)
      .json({ message: "Failed to verify status with the payment gateway." });
  }
});

/**
 * @description Gets all visitor donations for the admin panel.
 * @route   GET /api/donate/admin/all
 * @access  Private (Admin only)
 */
export const getAllVisitorDonations = asyncHandler(async (req, res) => {
  const donations = await VisitorDonation.find({}).sort({ createdAt: -1 });
  res.json(donations);
});
