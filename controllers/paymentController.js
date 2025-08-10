import asyncHandler from "express-async-handler";
import crypto from "crypto";
import axios from "axios";
import Member from "../models/memberModel.js";
import VisitorDonation from "../models/visitorDonationModel.js";

const createCashfreeOrderForMember = async (member) => {
  const orderAmount = 1.0; // Registration fee, isko .env se bhi la sakte ho
  const orderId = `ORDER_MEMBER_${member._id}_${Date.now()}`;

  const orderPayload = {
    order_id: orderId,
    order_amount: orderAmount,
    order_currency: "INR",
    customer_details: {
      customer_id: member._id.toString(),
      customer_name: member.fullName,
      customer_email: member.email,
      customer_phone: member.phone,
    },
    order_meta: {
      return_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/payment-status?order_id=${orderId}`,
      notify_url: `${process.env.BACKEND_URL || "http://localhost:5001"}/api/payment/webhook`,
    },
    order_note: "Membership Fee for Jeevan Suraksha",
  };

  try {
    const response = await axios.post(
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
    // Sirf payment data return karo
    return {
      payment_session_id: response.data.payment_session_id,
      order_id: orderId,
    };
  } catch (error) {
    console.error("Cashfree API Error (New Member Reg):", error.response?.data);
    throw new Error("Failed to create payment order for new member.");
  }
};

const makeMemberPayment = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const orderAmount = 1.0;
  const orderId = `ORDER_MEMBER_${userId}_${Date.now()}`;

  const member = await Member.findById(userId);
  if (!member) {
    res.status(404);
    throw new Error("Member not found");
  }
  if (member.paymentStatus === "Paid") {
    res.status(400);
    throw new Error("Payment has already been made.");
  }

  const orderPayload = {
    order_id: orderId,
    order_amount: orderAmount,
    order_currency: "INR",
    customer_details: {
      customer_id: userId.toString(),
      customer_name: member.fullName,
      customer_email: member.email,
      customer_phone: member.phone,
    },
    order_meta: {
      return_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/payment-status?order_id=${orderId}`,
      notify_url: `${process.env.BACKEND_URL || "http://localhost:5001"}/api/payment/webhook`,
    },
    order_note: "Membership Fee for Jeevan Suraksha",
  };

  try {
    const response = await axios.post(
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

    res.json({
      payment_session_id: response.data.payment_session_id,
      order_id: orderId,
    });
  } catch (error) {
    console.error("Cashfree API Error (Member):", error.response?.data);
    res.status(500).json({ message: "Failed to create payment order." });
  }
});

const makeVisitorDonation = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    mobile,
    amount,
    address,
    panNumber,
    bankName,
    branchName,
  } = req.body;
  if (!name || !mobile || !amount) {
    res.status(400);
    throw new Error("Name, mobile, and amount are required.");
  }

  const orderId = `ORDER_VISITOR_${Date.now()}`;

  const donation = await VisitorDonation.create({
    name,
    email,
    mobile,
    amount,
    address,
    panNumber,
    bankName,
    branchName,
    transactionId: orderId,
    status: "PENDING",
  });

  const orderPayload = {
    order_id: orderId,
    order_amount: amount,
    order_currency: "INR",
    customer_details: {
      customer_id: `VISITOR_${mobile}_${Date.now()}`,
      customer_name: name,
      customer_email: email || `${mobile}@jeevansuraksha.org`,
      customer_phone: mobile,
    },
    order_meta: {
      return_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/donation-status?order_id=${orderId}`,
      notify_url: `${process.env.BACKEND_URL || "http://localhost:5001"}/api/payment/webhook`,
    },
    order_note: "Visitor Donation for Jeevan Suraksha",
  };

  try {
    const response = await axios.post(
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

    res.json({
      payment_session_id: response.data.payment_session_id,
      order_id: orderId,
    });
  } catch (error) {
    console.error("Cashfree API Error (Visitor):", error.response?.data);
    res.status(500).json({ message: "Payment initiation failed." });
  }
});

const handleWebhook = asyncHandler(async (req, res) => {
  try {
    const webhookPayload = req.body;
    const receivedSignature = req.headers["x-webhook-signature"];
    const timestamp = req.headers["x-webhook-timestamp"];
    if (!receivedSignature || !timestamp) {
      throw new Error("Webhook signature or timestamp is missing.");
    }
    const bodyString = timestamp + JSON.stringify(webhookPayload);
    const secretKey = process.env.CASHFREE_SECRET_KEY;
    const generatedSignature = crypto
      .createHmac("sha256", secretKey)
      .update(bodyString)
      .digest("base64");
    if (generatedSignature !== receivedSignature) {
      console.warn("Webhook signature verification failed.");
      return res.status(401).send("Signature verification failed.");
    }
  } catch (e) {
    console.error("Error during webhook signature verification:", e.message);
    return res.status(400).send("Invalid webhook payload or signature.");
  }

  const { order_id, order_status, customer_details } = req.body.data.order;
  console.log(
    `Webhook received for order ${order_id} with status: ${order_status}`
  );

  if (order_status === "PAID") {
    if (order_id.startsWith("ORDER_MEMBER_")) {
      const member = await Member.findById(customer_details.customer_id);
      if (member && member.paymentStatus !== "Paid") {
        member.paymentStatus = "Paid";
        if (!member.registrationNo) {
          member.registrationNo = `MBR-${String(member._id).slice(-6).toUpperCase()}`;
        }
        await member.save();
      }
    } else if (order_id.startsWith("ORDER_VISITOR_")) {
      const donation = await VisitorDonation.findOne({
        transactionId: order_id,
      });
      if (donation && donation.status !== "SUCCESS") {
        donation.status = "SUCCESS";
        donation.receiptNo = `VDR-${new Date().getFullYear()}-${String(donation._id).slice(-6).toUpperCase()}`;
        await donation.save();
      }
    }
  } else if (order_status === "FAILED" || order_status === "CANCELLED") {
    if (order_id.startsWith("ORDER_VISITOR_")) {
      await VisitorDonation.findOneAndUpdate(
        { transactionId: order_id },
        { status: "FAILED" }
      );
    }
  }

  res.status(200).send("Webhook processed successfully.");
});

const getPaymentStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  let localRecord = null;
  if (orderId.startsWith("ORDER_MEMBER_")) {
    /* ... */
  } else if (orderId.startsWith("ORDER_VISITOR_")) {
    localRecord = await VisitorDonation.findOne({
      transactionId: orderId,
    }).lean();
  }
  if (!localRecord) {
    return res
      .status(404)
      .json({ success: false, message: "Transaction record not found." });
  }
  try {
    const response = await axios.get(
      `${process.env.CASHFREE_API_URL}/orders/${orderId}`,
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-version": "2022-09-01",
          "x-client-id": process.env.CASHFREE_APP_ID,
          "x-client-secret": process.env.CASHFREE_SECRET_KEY,
        },
      }
    );
    res.json({
      success: true,
      cashfree_status: response.data.order_status,
      local_status: localRecord.status,
      donationDetails: localRecord,
    });
  } catch (error) {
    res.json({
      success: true,
      cashfree_status: "UNKNOWN",
      local_status: localRecord.status,
      donationDetails: localRecord,
      note: "Could not verify with payment gateway, showing local status.",
    });
  }
});

const getAllVisitorDonations = asyncHandler(async (req, res) => {
  const donations = await VisitorDonation.find({}).sort({ createdAt: -1 });
  res.json({ donations, total: donations.length });
});

const deleteVisitorDonation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const donation = await VisitorDonation.findById(id);
  if (donation) {
    await donation.deleteOne();
    res.json({ message: "Donation record removed" });
  } else {
    res.status(404);
    throw new Error("Donation not found");
  }
});

export {
  createCashfreeOrderForMember,
  makeMemberPayment,
  makeVisitorDonation,
  handleWebhook,
  getPaymentStatus,
  getAllVisitorDonations,
  deleteVisitorDonation,
};
