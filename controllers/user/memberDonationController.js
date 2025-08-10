import asyncHandler from "express-async-handler";
import axios from "axios";
import Member from "../../models/memberModel.js";
import MemberDonation from "../../models/memberDonationModel.js";

// Helper function to avoid repeating the update logic
const updateDonationOnSuccess = async (donation, paymentData) => {
  if (donation.status === "SUCCESS") return donation; // Already updated, do nothing

  donation.status = "SUCCESS";
  donation.receiptNo = `RCPT-${Date.now()}`;
  donation.paidAt = new Date();
  if (paymentData) {
    donation.paymentId = paymentData.cf_payment_id || paymentData.cf_order_id;
    donation.paymentMethod = paymentData.payment_group;
  }
  return await donation.save();
};

// 1. CREATE DONATION
export const createMemberDonation = asyncHandler(async (req, res) => {
  const { amount, panNumber } = req.body;
  const memberId = req.user._id;

  if (!amount || amount <= 0) {
    res.status(400);
    throw new Error("A valid amount is required.");
  }

  const member = await Member.findById(memberId);
  if (!member) {
    res.status(404);
    throw new Error("Member not found.");
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
      // ✅ CRITICAL: This URL points to our status verification page.
      // Cashfree will replace {order_id} with the actual ID.
      return_url: `${process.env.FRONTEND_URL}/payment-status?order_id={order_id}`,
      notify_url: `${process.env.BACKEND_URL}/api/member-donations/webhook`,
    },
    order_note: "Member Donation",
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
    console.error("Cashfree API Error:", error.response?.data);
    res.status(500).json({ message: "Payment initiation failed." });
  }
});

// 2. HANDLE WEBHOOK (for server-to-server updates)
export const handlePaymentWebhook = asyncHandler(async (req, res) => {
  // It's highly recommended to verify the webhook signature in production
  const { data } = req.body;
  console.log("Webhook Received:", JSON.stringify(data, null, 2));

  if (!data || !data.order) {
    return res.status(400).send("Invalid webhook payload.");
  }

  const { order, payment } = data;
  const donation = await MemberDonation.findOne({
    transactionId: order.order_id,
  });

  if (!donation) {
    return res.status(404).send("Order not found.");
  }

  if (order.order_status === "PAID") {
    await updateDonationOnSuccess(donation, payment);
  } else if (["FAILED", "CANCELLED", "EXPIRED"].includes(order.order_status)) {
    donation.status = "FAILED";
    await donation.save();
  }
  res.status(200).send("OK");
});

// 3. VERIFY STATUS (for client-side updates)
export const verifyPaymentStatus = asyncHandler(async (req, res) => {
  const { order_id } = req.body;
  const memberId = req.user._id;

  const donation = await MemberDonation.findOne({
    transactionId: order_id,
    member: memberId,
  });

  if (!donation) {
    return res.status(404).json({ message: "Donation record not found." });
  }

  if (donation.status !== "PENDING") {
    const finalDonation = await donation.populate("member", "fullName email");
    return res.json(finalDonation);
  }

  try {
    const response = await axios.get(
      `${process.env.CASHFREE_API_URL}/orders/${order_id}`,
      {
        headers: {
          /* headers as before */
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
    console.error("Cashfree Verification Error:", error.response?.data);
    // If Cashfree fails, return the current status from our DB
    const currentDonation = await donation.populate("member", "fullName email");
    res.json(currentDonation);
  }
});

// 4. GET HISTORY
export const getMyDonationHistory = asyncHandler(async (req, res) => {
  const donations = await MemberDonation.find({ member: req.user._id })
    .sort({ createdAt: -1 })
    .populate("member", "fullName email");
  res.json(donations);
});
