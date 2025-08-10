import asyncHandler from "express-async-handler";
import crypto from "crypto";
import axios from "axios";
import VisitorDonation from "../models/visitorDonationModel.js";

// --- Step 1: INITIATE Donation (Updated & Corrected Logic) ---
const initiateDonation = asyncHandler(async (req, res) => {
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
    throw new Error("Name, mobile, and amount are required.");
  }

  // Yeh hamara internal transaction ID hai, jo Cashfree ka order_id banega
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
      return_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/donation-status?order_id={order_id}`,
      notify_url: `${process.env.BACKEND_URL || "http://localhost:5001"}/api/donate/callback`,
    },
    order_note: "Visitor Donation for Jeevan Suraksha",
  };

  try {
    // === STEP 1: Pehle Cashfree se order create karo ===
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

    console.log("Cashfree order created:", cashfreeResponse.data);
    const cashfreeData = cashfreeResponse.data;

    // === STEP 2: Ab form data aur Cashfree se mila data ek saath database mein save karo ===
    await VisitorDonation.create({
      // Form se aaya data
      name,
      email,
      mobile,
      address,
      amount,
      panNumber,
      bankName,
      branchName,

      // Cashfree se aaya data (agar aapne schema update kiya hai)
      transactionId,
      cfOrderId: cashfreeData.cf_order_id,
      paymentSessionId: cashfreeData.payment_session_id,
      cashfreeOrderStatus: cashfreeData.order_status,
      orderExpiryTime: cashfreeData.order_expiry_time,

      // Default status
      status: "PENDING",
    });

    console.log(
      "Donation record created in DB with PENDING status successfully."
    );

    // === STEP 3: Frontend ko payment details bhejo ===
    res.json({
      payment_session_id: cashfreeData.payment_session_id,
      order_id: transactionId,
    });
  } catch (error) {
    // Agar Cashfree API ya Database mein se kahin bhi error aaya
    console.error(
      "Failed to process donation request:",
      error.response ? error.response.data : error.message
    );
    res.status(500).json({
      message:
        "Failed to create payment order. Please check credentials and try again.",
      error: error.response ? error.response.data : error.message,
    });
  }
});

// --- Step 2: HANDLE the Webhook from Cashfree Servers ---
const handleDonationCallback = asyncHandler(async (req, res) => {
  console.log("Webhook received:", req.body);
  console.log("Webhook headers:", req.headers);

  const webhookPayload = req.body;
  const receivedSignature = req.headers["x-webhook-signature"];
  const timestamp = req.headers["x-webhook-timestamp"];

  // Verify the webhook signature
  if (receivedSignature && timestamp) {
    try {
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
      console.log("Webhook signature verified successfully");
    } catch (e) {
      console.error("Error verifying webhook signature:", e.message);
      return res.status(400).send("Invalid webhook payload.");
    }
  } else {
    console.warn("Missing signature or timestamp in webhook headers");
  }

  const { order_id, order_status } =
    webhookPayload.data?.order || webhookPayload;

  console.log(
    `Webhook received for visitor donation ${order_id} with status: ${order_status}`
  );

  try {
    const donation = await VisitorDonation.findOne({ transactionId: order_id });
    if (!donation) {
      console.error(`Donation not found for order_id: ${order_id}`);
      return res.status(404).send("Donation not found.");
    }

    if (order_status === "PAID") {
      if (donation.status !== "SUCCESS") {
        donation.status = "SUCCESS";
        donation.receiptNo = `VDR-${new Date().getFullYear()}-${String(donation._id).slice(-6).toUpperCase()}`;
        await donation.save();
        console.log(
          `Visitor donation status updated to 'SUCCESS' for ${order_id}. Receipt: ${donation.receiptNo}`
        );
      } else {
        console.log(`Donation ${order_id} already marked as SUCCESS`);
      }
    } else if (["FAILED", "CANCELLED", "EXPIRED"].includes(order_status)) {
      await VisitorDonation.updateOne(
        { transactionId: order_id },
        { status: "FAILED" }
      );
      console.log(
        `Visitor donation status updated to 'FAILED' for ${order_id}`
      );
    }
  } catch (error) {
    console.error("Error processing webhook:", error);
    return res.status(500).send("Error processing webhook.");
  }

  res.status(200).send("Webhook processed successfully.");
});

// --- Step 3: Check donation status (for frontend polling) ---
const checkDonationStatus = asyncHandler(async (req, res) => {
  const { order_id } = req.params;

  try {
    const donation = await VisitorDonation.findOne({ transactionId: order_id });

    if (!donation) {
      return res.status(404).json({ message: "Transaction record not found." });
    }

    res.json({
      status: donation.status,
      receiptNo: donation.receiptNo,
      amount: donation.amount,
      createdAt: donation.createdAt,
    });
  } catch (error) {
    console.error("Error checking donation status:", error);
    res.status(500).json({ message: "Error checking donation status" });
  }
});

// --- Step 4: For Admin Panel: Get all donations ---
const getAllVisitorDonations = asyncHandler(async (req, res) => {
  const donations = await VisitorDonation.find({}).sort({ createdAt: -1 });
  res.json(donations);
});

export {
  initiateDonation,
  handleDonationCallback,
  getAllVisitorDonations,
  checkDonationStatus,
};
