import asyncHandler from "express-async-handler";
import Payment from "../../models/paymentModel.js";
// PDF generation ke liye library, jaise 'pdfkit'
import PDFDocument from "pdfkit";

// @desc    Get all payments based on type
// @route   GET /api/receipts?type=MEMBERSHIP_FEE
// @access  Private/Admin
const getPayments = asyncHandler(async (req, res) => {
  const { type, keyword } = req.query;

  let filter = {};
  if (type) {
    filter.paymentType = type;
  } else {
    // Agar type nahi diya to sabhi payments bhej do
  }

  if (keyword) {
    // Search keyword ko alag alag fields mein check karega
    // Pehle user details fetch karne honge agar keyword hai to
    const users = await User.find({
      $or: [
        { name: { $regex: keyword, $options: "i" } },
        { email: { $regex: keyword, $options: "i" } },
        { memberId: { $regex: keyword, $options: "i" } },
      ],
    }).select("_id");

    const userIds = users.map((user) => user._id);

    filter.$or = [
      { receiptNo: { $regex: keyword, $options: "i" } },
      { "nonMemberDetails.name": { $regex: keyword, $options: "i" } },
      { "nonMemberDetails.email": { $regex: keyword, $options: "i" } },
      { "nonMemberDetails.mobile": { $regex: keyword, $options: "i" } },
      { user: { $in: userIds } },
    ];
  }

  const payments = await Payment.find(filter)
    .populate("user", "name memberId email mobile") // User details fetch karega
    .sort({ createdAt: -1 });

  res.json(payments);
});

// @desc    Delete a single payment/donation receipt
// @route   DELETE /api/receipts/:id
// @access  Private/Admin
const deleteReceipt = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);

  if (payment) {
    await payment.remove();
    res.json({ message: "Receipt removed successfully" });
  } else {
    res.status(404);
    throw new Error("Receipt not found");
  }
});

// @desc    Download a receipt as PDF
// @route   GET /api/receipts/:id/download
// @access  Private/Admin
const downloadReceipt = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id).populate(
    "user",
    "name memberId"
  );

  if (!payment) {
    res.status(404);
    throw new Error("Receipt not found");
  }

  const doc = new PDFDocument({ size: "A5", margin: 50 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=receipt-${payment.receiptNo}.pdf`
  );

  doc.pipe(res);

  // PDF Content
  doc.fontSize(20).text("Payment Receipt", { align: "center" });
  doc.moveDown();

  doc.fontSize(12).text(`Receipt No: ${payment.receiptNo}`);
  doc.text(`Date: ${new Date(payment.paymentDate).toLocaleDateString()}`);
  doc.moveDown();

  if (payment.user) {
    doc.text(`Member Name: ${payment.user.name}`);
    doc.text(`Member ID: ${payment.user.memberId}`);
  } else if (payment.nonMemberDetails) {
    doc.text(`Name: ${payment.nonMemberDetails.name}`);
    doc.text(`Email: ${payment.nonMemberDetails.email}`);
  }

  doc.moveDown();
  doc.text(`Amount: ₹ ${payment.amount}`);
  doc.text(`Payment Mode: ${payment.paymentMode}`);
  if (payment.transactionId) {
    doc.text(`Transaction ID: ${payment.transactionId}`);
  }
  doc.moveDown(2);
  doc.text("Thank you for your payment/donation!", { align: "center" });

  doc.end();
});

export { getPayments, deleteReceipt, downloadReceipt };
