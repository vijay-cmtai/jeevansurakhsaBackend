import asyncHandler from "express-async-handler";
import axios from "axios";
import Member from "../../models/memberModel.js";
import MemberDonation from "../../models/memberDonationModel.js";

/**
 * @description Helper function to update a donation's status to SUCCESS.
 *              This centralizes the logic and avoids code duplication.
 * @param {object} donation - The Mongoose donation document to update.
 * @param {object} paymentData - The payment details from Cashfree's response.
 * @returns {Promise<object>} - The updated and saved donation document.
 */
const updateDonationOnSuccess = async (donation, paymentData) => {
  // If the donation is already marked as SUCCESS, do nothing. This prevents
  // potential race conditions between the webhook and manual verification.
  if (donation.status === "SUCCESS") {
    console.log(
      `[Info] Donation ${donation.transactionId} is already SUCCESS. No update needed.`
    );
    return donation;
  }

  donation.status = "SUCCESS";
  donation.receiptNo = `RCPT-${Date.now()}`; // Generate a unique receipt number
  donation.paidAt = new Date(); // Record the exact time of successful payment

  // Add specific payment details from Cashfree if they are available
  if (paymentData) {
    donation.paymentId = paymentData.cf_payment_id || paymentData.cf_order_id;
    donation.paymentMethod = paymentData.payment_group;
  }

  console.log(
    `[Success] Updating donation ${donation.transactionId} status to SUCCESS.`
  );
  return await donation.save();
};

/**
 * @description Creates a new donation order with Cashfree.
 * @route   POST /api/member-donations
 * @access  Private (Requires member login)
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

  // ✅ CRITICAL VALIDATION: Ensure the member has a phone number before proceeding.
  if (!member.phone || member.phone.trim() === "") {
    console.error(
      `[Validation Error] Member ${memberId} attempted donation without a phone number.`
    );
    res.status(400); // Send a "Bad Request" status
    // This user-friendly error message will be shown on the frontend.
    throw new Error(
      "Your phone number is missing. Please update your profile before making a donation."
    );
  }

  const orderId = `MEMBER_DONATE_${memberId}_${Date.now()}`;

  // 1. Create a PENDING donation record in our database.
  await MemberDonation.create({
    member: memberId,
    amount,
    panNumber,
    transactionId: orderId,
    status: "PENDING",
  });

  // 2. Prepare the order payload for the Cashfree API.
  const orderPayload = {
    order_id: orderId,
    order_amount: amount,
    order_currency: "INR",
    customer_details: {
      customer_id: memberId.toString(),
      customer_name: member.fullName,
      customer_email: member.email,
      customer_phone: member.phone, // We are now certain this is not undefined.
    },
    order_meta: {
      return_url: `${process.env.FRONTEND_URL}/payment-status?order_id={order_id}`,
      notify_url: `${process.env.BACKEND_URL}/api/member-donations/webhook`,
    },
    order_note: "Member Donation for Jeevan Suraksha",
  };

  try {
    // 3. Send the request to Cashfree.
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
    // 4. Send the session ID back to the frontend to initiate checkout.
    res.status(201).json({
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
 * @description Handles incoming webhooks from Cashfree for server-to-server updates.
 * @route   POST /api/member-donations/webhook
 * @access  Public
 */
export const handlePaymentWebhook = asyncHandler(async (req, res) => {
  // It is highly recommended to verify the webhook signature in a production environment.
  const { data } = req.body;
  console.log(
    "[Webhook] Received webhook from Cashfree:",
    JSON.stringify(data, null, 2)
  );

  if (!data || !data.order) {
    return res.status(400).send("Invalid webhook payload.");
  }

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
      console.log(`[Webhook] Updated donation ${order.order_id} to FAILED.`);
    }
  }
  // Always respond with a 200 OK to Cashfree to acknowledge receipt.
  res.status(200).send("OK");
});

/**
 * @description Verifies the payment status from the frontend after user returns from the gateway.
 * @route   POST /api/member-donations/verify
 * @access  Private (Requires member login)
 */
export const verifyPaymentStatus = asyncHandler(async (req, res) => {
  const { order_id } = req.body;
  const memberId = req.user._id;

  // 1. Find the donation record in our database.
  const donation = await MemberDonation.findOne({
    transactionId: order_id,
    member: memberId,
  });

  if (!donation) {
    return res.status(404).json({ message: "Donation record not found." });
  }

  // 2. If status is already final (e.g., updated by a fast webhook), return it immediately.
  if (donation.status !== "PENDING") {
    const finalDonation = await donation.populate("member", "fullName email");
    console.log(
      `[Verify] Returning final status '${donation.status}' for order ${order_id} from DB.`
    );
    return res.json(finalDonation);
  }

  // 3. If still pending, poll Cashfree's API for the latest status.
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

    // Repopulate member info to send complete data back to the frontend.
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
    // If the Cashfree API call fails, don't crash. Return the current status from our DB.
    const currentDonation = await donation.populate("member", "fullName email");
    res.json(currentDonation);
  }
});

/**
 * @description Fetches the entire donation history for the currently logged-in member.
 * @route   GET /api/member-donations/my-history
 * @access  Private (Requires member login)
 */
export const getMyDonationHistory = asyncHandler(async (req, res) => {
  console.log(
    `[History] Fetching donation history for user ID: ${req.user._id}`
  );

  const donations = await MemberDonation.find({ member: req.user._id })
    .sort({ createdAt: -1 })
    .populate("member", "fullName email");

  console.log(
    `[History] Found ${donations.length} records for user ${req.user._id}.`
  );
  res.status(200).json(donations);
});
