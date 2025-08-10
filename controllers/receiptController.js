import asyncHandler from "express-async-handler";
import PDFDocument from "pdfkit";
import { format } from "date-fns";
import Receipt from "../models/receiptModel.js";
import Member from "../models/memberModel.js";

/**
 * @description Creates a registration receipt for a member.
 */
export const createRegistrationReceipt = async (member, orderId) => {
  const receiptNo = `RCPT-REG-${member.registrationNo}`;
  const existingReceipt = await Receipt.findOne({
    member: member._id,
    receiptType: "REGISTRATION",
  });

  if (existingReceipt) {
    console.log(
      `[Receipt] Registration receipt already exists for member ${member._id}`
    );
    return existingReceipt;
  }

  const receipt = await Receipt.create({
    member: member._id,
    receiptNo,
    receiptType: "REGISTRATION",
    amount: 1.0, // Or get from config
    paymentOrderId: orderId,
  });

  member.receiptUrl = `/api/receipts/${receipt._id}/download`;
  await member.save();

  console.log(
    `[Receipt] Created registration receipt ${receiptNo} for member ${member._id}`
  );
  return receipt;
};

/**
 * @description Serves the PDF receipt for download by its ID.
 * @route   GET /api/receipts/:id/download
 */
export const downloadReceipt = asyncHandler(async (req, res) => {
  const receipt = await Receipt.findById(req.params.id).populate("member");

  if (!receipt || !receipt.member) {
    res.status(404);
    throw new Error("Receipt not found");
  }

  // Authorization check: Only the member or an admin can download.
  const isOwner = receipt.member._id.toString() === req.user._id.toString();
  const isAdmin = req.user.isAdmin || req.user.role === "Admin";
  if (!isOwner && !isAdmin) {
    res.status(401);
    throw new Error("Not authorized to view this receipt");
  }

  const doc = new PDFDocument({ size: "A4", margin: 50 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="receipt-${receipt.receiptNo}.pdf"`
  );

  doc.pipe(res);

  // --- PDF Content ---
  doc
    .fontSize(24)
    .font("Helvetica-Bold")
    .text("Payment Receipt", { align: "center" });
  doc.moveDown();
  doc.fontSize(14).text("Jeevan Suraksha Foundation", { align: "center" });
  doc.moveDown(2);

  const details = [
    { label: "Receipt No:", value: receipt.receiptNo },
    { label: "Member Name:", value: receipt.member.fullName },
    { label: "Registration No:", value: receipt.member.registrationNo },
    {
      label: "Date:",
      value: format(new Date(receipt.generatedAt), "dd MMM, yyyy"),
    },
    { label: "Amount Paid:", value: `₹ ${receipt.amount.toFixed(2)}` },
    { label: "For:", value: "Membership Registration Fee" },
    { label: "Transaction ID:", value: receipt.paymentOrderId },
  ];

  let y = doc.y;
  details.forEach((item) => {
    doc.fontSize(12).font("Helvetica-Bold").text(item.label, 50, y);
    doc.font("Helvetica").text(item.value, 200, y);
    y += 25;
  });

  doc.moveDown(4);
  doc
    .fontSize(10)
    .text("This is a computer-generated receipt.", { align: "center" });

  doc.end();
});
export const getMyReceipts = asyncHandler(async (req, res) => {
  const receipts = await Receipt.find({ member: req.user._id }).sort({
    createdAt: -1,
  });
  res.json(receipts);
});
export const getAllReceipts = asyncHandler(async (req, res) => {
  const receipts = await Receipt.find({})
    .populate({
      path: "member",
      select: "fullName email mobile memberId", // Sirf zaroori details fetch karein
    })
    .sort({ createdAt: -1 });

  res.status(200).json(receipts);
});
