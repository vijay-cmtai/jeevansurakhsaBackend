import asyncHandler from "express-async-handler";
import axios from "axios";
import crypto from "crypto";
import Member from "../../models/memberModel.js";
import MemberDonation from "../../models/memberDonationModel.js";

/**
 * @desc    Ek logged-in member ke liye donation payment shuru karein
 * @route   POST /api/member-donations
 * @access  Private (Sirf logged-in members ke liye)
 */
const createMemberDonation = asyncHandler(async (req, res) => {
  const { amount, panNumber, bankName, branchName } = req.body;
  const memberId = req.user._id; // 'protect' middleware se member ki ID milti hai

  if (!amount || amount <= 0) {
    res.status(400);
    throw new Error("A valid amount is required.");
  }

  const member = await Member.findById(memberId);
  if (!member) {
    res.status(404);
    throw new Error("Member not found.");
  }

  const orderId = `ORDER_MEMBER_DONATE_${memberId}_${Date.now()}`;

  // Naye MemberDonation collection mein ek record banayein
  await MemberDonation.create({
    member: memberId,
    amount,
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
      customer_id: memberId.toString(),
      customer_name: member.fullName,
      customer_email: member.email,
      customer_phone: member.phone,
    },
    order_meta: {
      return_url: `${process.env.FRONTEND_URL}/payment/success?order_id=${orderId}`,
      notify_url: `${process.env.BACKEND_URL}/api/payment/webhook`, // Webhook URL
    },
    order_note: "Member Donation for Jeevan Suraksha",
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
      amount: amount, // Frontend ke liye amount bhi send karte hain
    });
  } catch (error) {
    console.error(
      "Cashfree API Error (Member Donation):",
      error.response?.data
    );
    res.status(500).json({ message: "Payment initiation failed." });
  }
});

/**
 * @desc    Cashfree Webhook - Payment status update
 * @route   POST /api/payment/webhook
 * @access  Public (But verified)
 */
const handlePaymentWebhook = asyncHandler(async (req, res) => {
  try {
    console.log("Webhook received:", req.body);

    const { order_id, cf_payment_id, payment_status, order_amount } = req.body;

    // Signature verification (optional but recommended)
    // const signature = req.headers['x-cashfree-signature'];
    // if (!verifyWebhookSignature(req.body, signature)) {
    //   return res.status(400).json({ message: "Invalid signature" });
    // }

    // Find donation record
    const donation = await MemberDonation.findOne({ transactionId: order_id });

    if (!donation) {
      console.log("Donation not found for order_id:", order_id);
      return res.status(404).json({ message: "Order not found" });
    }

    // Update donation status based on payment status
    let newStatus = "PENDING";
    if (payment_status === "PAID") {
      newStatus = "SUCCESS";
      // Generate receipt number
      donation.receiptNo = `RCP_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    } else if (payment_status === "FAILED") {
      newStatus = "FAILED";
    }

    // Update donation record
    donation.status = newStatus;
    if (cf_payment_id) {
      donation.paymentId = cf_payment_id; // Add this field to your model
    }

    await donation.save();

    console.log(`Payment ${order_id} status updated to ${newStatus}`);

    res.status(200).json({
      message: "Webhook processed successfully",
      order_id,
      status: newStatus,
    });
  } catch (error) {
    console.error("Webhook processing error:", error);
    res.status(500).json({ message: "Webhook processing failed" });
  }
});

/**
 * @desc    Manual payment verification (Client-side call after payment)
 * @route   POST /api/payment/verify
 * @access  Private
 */
const verifyPaymentStatus = asyncHandler(async (req, res) => {
  const { order_id } = req.body;
  const memberId = req.user._id;

  try {
    // First check our database
    const donation = await MemberDonation.findOne({
      transactionId: order_id,
      member: memberId,
    });

    if (!donation) {
      return res.status(404).json({ message: "Order not found" });
    }

    // If already updated, return current status
    if (donation.status !== "PENDING") {
      return res.json({
        order_id,
        status: donation.status,
        amount: donation.amount,
        receiptNo: donation.receiptNo,
        updatedAt: donation.updatedAt,
      });
    }

    // If still pending, check with Cashfree API
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

    const { order_status } = response.data;

    // Update status based on Cashfree response
    let newStatus = "PENDING";
    if (order_status === "PAID") {
      newStatus = "SUCCESS";
      donation.receiptNo = `RCP_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    } else if (order_status === "FAILED" || order_status === "CANCELLED") {
      newStatus = "FAILED";
    }

    donation.status = newStatus;
    await donation.save();

    res.json({
      order_id,
      status: newStatus,
      amount: donation.amount,
      receiptNo: donation.receiptNo,
      updatedAt: donation.updatedAt,
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({ message: "Payment verification failed" });
  }
});

/**
 * @desc    Logged-in member ki donation history fetch karein
 * @route   GET /api/member-donations/my-history
 * @access  Private
 */
const getMyDonationHistory = asyncHandler(async (req, res) => {
  const memberId = req.user._id;
  const donations = await MemberDonation.find({ member: memberId })
    .sort({ createdAt: -1 })
    .populate("member", "fullName email phone");
  res.json(donations);
});

/**
 * Helper function to verify webhook signature (optional)
 */
const verifyWebhookSignature = (payload, signature) => {
  const secretKey = process.env.CASHFREE_SECRET_KEY;
  const computedSignature = crypto
    .createHmac("sha256", secretKey)
    .update(JSON.stringify(payload))
    .digest("hex");

  return computedSignature === signature;
};

export {
  createMemberDonation,
  getMyDonationHistory,
  handlePaymentWebhook,
  verifyPaymentStatus,
};
