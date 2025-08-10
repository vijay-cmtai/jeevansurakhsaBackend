import asyncHandler from "express-async-handler";
import crypto from "crypto";
import axios from "axios";
import jwt from "jsonwebtoken";
import Member from "../models/memberModel.js";
import VisitorDonation from "../models/visitorDonationModel.js";

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

const activateMemberAndGenerateToken = async (member) => {
  if (member.paymentStatus === "Paid") {
    console.log(`[Activation] Member ${member._id} is already active.`);
    return null;
  }
  member.registrationNo = `MBR-${String(member._id).slice(-6).toUpperCase()}`;
  member.paymentStatus = "Paid";
  member.membershipStatus = "Active";
  await member.save();
  console.log(
    `[Activation] Member ${member._id} has been activated successfully.`
  );
  return generateToken(member._id);
};

export const createCashfreeOrderForMember = async (member) => {
  const orderAmount = 1.0;
  const orderId = `REG_${member._id}_${Date.now()}`;
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
      return_url: `${process.env.FRONTEND_URL}/registration-status?order_id={order_id}`,
      notify_url: `${process.env.BACKEND_URL}/api/payment/webhook`,
    },
    order_note: "Membership Registration Fee",
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
    return {
      payment_session_id: response.data.payment_session_id,
      order_id: orderId,
    };
  } catch (error) {
    console.error("Cashfree API Error (New Member Reg):", error.response?.data);
    throw new Error("Failed to create payment order for the new member.");
  }
};

export const verifyRegistrationPayment = asyncHandler(async (req, res) => {
  const { order_id } = req.body;
  if (!order_id || !order_id.startsWith("REG_"))
    return res.status(400).json({ message: "Invalid Order ID." });

  const memberId = order_id.split("_")[1];
  const member = await Member.findById(memberId);
  if (!member)
    return res.status(404).json({ message: "Member record not found." });

  if (member.paymentStatus === "Paid")
    return res.json({
      status: "SUCCESS",
      message: "Membership is already active.",
    });

  try {
    const response = await axios.get(
      `${process.env.CASHFREE_API_URL}/orders/${order_id}`,
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-version": "2022-09-01",
          "x-client-id": process.env.CASHFREE_APP_ID,
          "x-client-secret": process.env.CASHFREE_SECRET_KEY,
        },
      }
    );
    const cashfreeOrder = response.data;
    if (cashfreeOrder.order_status === "PAID") {
      const token = await activateMemberAndGenerateToken(member);
      const userProfile = await Member.findById(memberId).select("-password");
      res.json({
        status: "SUCCESS",
        message: "Payment successful! Membership activated.",
        user: { ...userProfile.toObject(), token },
      });
    } else if (
      ["FAILED", "CANCELLED", "EXPIRED"].includes(cashfreeOrder.order_status)
    ) {
      res.json({ status: "FAILED", message: "Payment was not successful." });
    } else {
      res.json({ status: "PENDING", message: "Payment is still pending." });
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to verify payment with the gateway." });
  }
});

export const handleWebhook = asyncHandler(async (req, res) => {
  // Implement signature verification in production
  const { order_id, order_status, customer_details } = req.body.data.order;
  if (order_status === "PAID") {
    if (order_id.startsWith("REG_")) {
      const member = await Member.findById(customer_details.customer_id);
      if (member) await activateMemberAndGenerateToken(member);
    } else if (order_id.startsWith("ORDER_MEMBER_")) {
      // Your member donation webhook logic here
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
  }
  res.status(200).send("Webhook processed.");
});

export const makeMemberPayment = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const member = await Member.findById(userId);
  if (!member) {
    res.status(404);
    throw new Error("Member not found");
  }
  if (member.paymentStatus === "Paid") {
    res.status(400);
    throw new Error("Payment has already been made.");
  }
  // Full logic for creating payment order for existing member
  const orderId = `ORDER_MEMBER_PAY_${userId}_${Date.now()}`;
  const orderAmount = 1.0;
  const orderPayload = {
    /* ... */
  };
  try {
    const response = await axios.post(/* ... */);
    res.json({
      payment_session_id: response.data.payment_session_id,
      order_id: orderId,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to create payment order." });
  }
});

export const makeVisitorDonation = asyncHandler(async (req, res) => {
  const { name, email, mobile, amount } = req.body;
  if (!name || !mobile || !amount) {
    res.status(400);
    throw new Error("Name, mobile, and amount are required.");
  }
  const orderId = `ORDER_VISITOR_${Date.now()}`;
  await VisitorDonation.create({
    name,
    email,
    mobile,
    amount,
    transactionId: orderId,
    status: "PENDING",
  });
  const orderPayload = {
    /* ... */
  };
  try {
    const response = await axios.post(/* ... */);
    res.json({
      payment_session_id: response.data.payment_session_id,
      order_id: orderId,
    });
  } catch (error) {
    res.status(500).json({ message: "Payment initiation failed." });
  }
});

export const getPaymentStatus = asyncHandler(async (req, res) => {
  // This is a generic status checker, it can be expanded as needed
  const { orderId } = req.params;
  try {
    const response = await axios.get(
      `${process.env.CASHFREE_API_URL}/orders/${orderId}`,
      {
        headers: {
          /* ... */
        },
      }
    );
    res.json({
      success: true,
      status: response.data.order_status,
      details: response.data,
    });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Could not fetch status from gateway.",
      });
  }
});

export const getAllVisitorDonations = asyncHandler(async (req, res) => {
  const donations = await VisitorDonation.find({}).sort({ createdAt: -1 });
  res.json({ donations, total: donations.length });
});

export const deleteVisitorDonation = asyncHandler(async (req, res) => {
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
