// File: controllers/user/memberDonationController.js

import asyncHandler from "express-async-handler";
import axios from "axios";
import Member from "../../models/memberModel.js";
import MemberDonation from "../../models/memberDonationModel.js";

// --- HELPER FUNCTION ---
const updateDonationOnSuccess = async (donation, paymentData) => {
  if (donation.status === "SUCCESS") {
    console.log(
      `[Info] Donation ${donation.transactionId} is already SUCCESS. No update needed.`
    );
    return donation;
  }
  donation.status = "SUCCESS";
  donation.receiptNo = `RCPT-${Date.now()}`;
  donation.paidAt = new Date();
  if (paymentData) {
    donation.paymentId = paymentData.cf_payment_id || paymentData.cf_order_id;
    donation.paymentMethod = paymentData.payment_group;
  }
  console.log(
    `[Success] Updating donation ${donation.transactionId} status to SUCCESS.`
  );
  return await donation.save();
};

// --- CONTROLLER FUNCTIONS ---

/**
 * @description Creates a new donation order with Cashfree.
 * @route   POST /api/member-donations
 * @access  Private
 */
export const createMemberDonation = asyncHandler(async (req, res) => {
  const { amount, panNumber } = req.body;
  const memberId = req.user._id;

  if (!amount || amount <= 0) {
    res.status(400);
    throw new Error("A valid donation amount is required.");
  }

  const member = await Member.findById(memberId);
  if (!member) {
    res.status(404);
    throw new Error("Member profile not found.");
  }

  if (!member.phone || member.phone.trim() === "") {
    res.status(400);
    throw new Error(
      "Your phone number is missing. Please update your profile before making a donation."
    );
  }

  const orderId = `MEMBER_DONATE_${memberId}_${Date.now()}`;

  await MemberDonation.create({
    member: memberId,
    amount,
    panNumber,
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
      return_url: `${process.env.FRONTEND_URL}/payment-status?order_id={order_id}`,
      notify_url: `${process.env.BACKEND_URL}/api/member-donations/webhook`,
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
    res
      .status(201)
      .json({
        payment_session_id: response.data.payment_session_id,
        order_id: orderId,
      });
  } catch (error) {
    console.error(
      "[Cashfree Error] Failed to create order:",
      error.response?.data || error.message
    );
    res
      .status(500)
      .json({ message: "Payment initiation failed due to a gateway error." });
  }
});

/**
 * @description Handles incoming webhooks from Cashfree.
 * @route   POST /api/member-donations/webhook
 * @access  Public
 */
export const handlePaymentWebhook = asyncHandler(async (req, res) => {
  const { data } = req.body;
  if (!data || !data.order)
    return res.status(400).send("Invalid webhook payload.");

  const { order, payment } = data;
  const donation = await MemberDonation.findOne({
    transactionId: order.order_id,
  });

  if (!donation) {
    console.error(
      `[Webhook Error] Donation not found for order_id: ${order.order_id}`
    );
    return res.status(404).send("Order not found");
  }

  if (order.order_status === "PAID") {
    await updateDonationOnSuccess(donation, payment);
  } else if (["FAILED", "CANCELLED", "EXPIRED"].includes(order.order_status)) {
    if (donation.status !== "FAILED") {
      donation.status = "FAILED";
      await donation.save();
    }
  }
  res.status(200).send("OK");
});

/**
 * @description Verifies the payment status from the frontend.
 * @route   POST /api/member-donations/verify
 * @access  Private
 */
export const verifyPaymentStatus = asyncHandler(async (req, res) => {
  const { order_id } = req.body;
  const memberId = req.user._id;

  const donation = await MemberDonation.findOne({
    transactionId: order_id,
    member: memberId,
  });
  if (!donation)
    return res.status(404).json({ message: "Donation record not found." });

  if (donation.status !== "PENDING") {
    const finalDonation = await donation.populate("member", "fullName email");
    return res.json(finalDonation);
  }

  try {
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
      updatedDonation = await updateDonationOnSuccess(donation, cashfreeOrder);
    } else if (
      ["FAILED", "CANCELLED", "EXPIRED"].includes(cashfreeOrder.order_status)
    ) {
      donation.status = "FAILED";
      updatedDonation = await donation.save();
    }

    const finalDonation = await updatedDonation.populate(
      "member",
      "fullName email"
    );
    res.json(finalDonation);
  } catch (error) {
    console.error(
      `[Verify Error] Cashfree API failed for order ${order_id}:`,
      error.response?.data
    );
    const currentDonation = await donation.populate("member", "fullName email");
    res.json(currentDonation);
  }
});

/**
 * @description Fetches donation history for the logged-in member.
 * @route   GET /api/member-donations/my-history
 * @access  Private
 */
export const getMyDonationHistory = asyncHandler(async (req, res) => {
  const donations = await MemberDonation.find({ member: req.user._id })
    .sort({ createdAt: -1 })
    .populate("member", "fullName email");
  res.status(200).json(donations);
});

/**
 * @description [ADMIN] Fetches all member donations.
 * @route   GET /api/member-donations/admin/all
 * @access  Private (Admin)
 */
export const getAllMemberDonations = asyncHandler(async (req, res) => {
  const donations = await MemberDonation.find({})
    .sort({ createdAt: -1 })
    .populate("member", "fullName email mobile memberId");
  res.status(200).json(donations);
});

// ================================================================
// ▼▼▼▼▼ NEW FUNCTION ADDED HERE ▼▼▼▼▼
// ================================================================
/**
 * @description [ADMIN] Deletes a member donation record by its ID.
 * @route   DELETE /api/member-donations/admin/:id
 * @access  Private (Admin only)
 */
export const deleteMemberDonation = asyncHandler(async (req, res) => {
  const donationId = req.params.id;

  if (!donationId) {
    res.status(400);
    throw new Error("Donation ID is required.");
  }

  const donation = await MemberDonation.findById(donationId);

  if (!donation) {
    res.status(404);
    throw new Error("Donation record not found.");
  }

  await MemberDonation.deleteOne({ _id: donationId });

  console.log(
    `[Admin] Admin user ${req.user._id} deleted donation record ${donationId}.`
  );
  res.status(200).json({ message: "Donation record deleted successfully." });
});
