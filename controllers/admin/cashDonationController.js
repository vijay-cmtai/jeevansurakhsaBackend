import asyncHandler from "express-async-handler";
import CashDonation from "../../models/cashDonationModel.js";
import PDFDocument from "pdfkit"; // Make sure you have installed pdfkit: npm install pdfkit

/**
 * @desc    Create a new cash donation record
 * @route   POST /api/admin/donations/cash
 * @access  Private/Admin
 */
const createCashDonation = asyncHandler(async (req, res) => {
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

  const receiptNo = `CDR-${Date.now()}`;

  const donationData = {
    receiptNo,
    name,
    email,
    mobile,
    address,
    amount: Number(amount),
    panNumber,
    bankName,
    branchName,
    receivedBy: req.user._id,
  };

  if (req.file) {
    donationData.paymentImageUrl = req.file.path;
  }

  const donation = await CashDonation.create(donationData);

  if (donation) {
    const responseDonation = donation.toObject();
    responseDonation.receivedBy = { name: req.user.email || "Admin" };
    res
      .status(201)
      .json({
        message: "Donation recorded successfully",
        donation: responseDonation,
      });
  } else {
    res.status(400);
    throw new Error("Invalid donation data.");
  }
});

/**
 * @desc    Get all cash donation records with pagination
 * @route   GET /api/admin/donations/cash
 * @access  Private/Admin
 */
const getAllCashDonations = asyncHandler(async (req, res) => {
  const pageSize = Number(req.query.limit) || 10;
  const page = Number(req.query.page) || 1;
  const keyword = req.query.keyword
    ? {
        $or: [
          { name: { $regex: req.query.keyword, $options: "i" } },
          { email: { $regex: req.query.keyword, $options: "i" } },
          { receiptNo: { $regex: req.query.keyword, $options: "i" } },
        ],
      }
    : {};

  const count = await CashDonation.countDocuments({ ...keyword });
  const donationsFromDB = await CashDonation.find({ ...keyword })
    .sort({ createdAt: -1 })
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  const donations = donationsFromDB.map((d) => {
    const donationObject = d.toObject();
    donationObject.receivedBy = { name: d.receivedBy };
    return donationObject;
  });

  const totalDonationResult = await CashDonation.aggregate([
    { $match: { ...keyword } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const totalDonation =
    totalDonationResult.length > 0 ? totalDonationResult[0].total : 0;

  res.json({
    donations,
    page,
    pages: Math.ceil(count / pageSize),
    totalDonation,
    total: count,
  });
});

/**
 * @desc    Get a single donation record by ID
 * @route   GET /api/admin/donations/cash/:id
 * @access  Private/Admin
 */
const getDonationById = asyncHandler(async (req, res) => {
  const donation = await CashDonation.findById(req.params.id);
  if (donation) {
    const responseDonation = donation.toObject();
    responseDonation.receivedBy = { name: donation.receivedBy };
    res.json(responseDonation);
  } else {
    res.status(404);
    throw new Error("Donation record not found");
  }
});

/**
 * @desc    Delete a donation record
 * @route   DELETE /api/admin/donations/cash/:id
 * @access  Private/Admin
 */
const deleteDonation = asyncHandler(async (req, res) => {
  const donation = await CashDonation.findById(req.params.id);
  if (donation) {
    await donation.deleteOne();
    res.json({ message: "Donation record deleted." });
  } else {
    res.status(404);
    throw new Error("Donation record not found.");
  }
});

/**
 * @desc    Generate and download a PDF receipt for a donation
 * @route   GET /api/admin/donations/cash/:id/receipt
 * @access  Private/Admin
 */
const downloadDonationReceipt = asyncHandler(async (req, res) => {
  const donation = await CashDonation.findById(req.params.id);

  if (!donation) {
    res.status(404);
    throw new Error("Donation record not found.");
  }

  // --- Generate the PDF in memory ---
  const doc = new PDFDocument({ size: "A5", margin: 40 });

  // Set the response headers to tell the browser to download a PDF file
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=receipt-${donation.receiptNo}.pdf`
  );

  // Pipe the PDF content directly to the HTTP response
  doc.pipe(res);

  // --- Add content to the PDF document ---
  // Header
  doc
    .fontSize(18)
    .font("Helvetica-Bold")
    .text("Jeevan Suraksha", { align: "center" });
  doc
    .fontSize(12)
    .font("Helvetica")
    .text("Cash Donation Receipt", { align: "center" });
  doc.moveDown(2);

  // Helper function to draw a row
  const drawRow = (y, label, value) => {
    doc.fontSize(10).font("Helvetica-Bold").text(label, 50, y);
    doc.font("Helvetica").text(value || "N/A", 150, y);
  };

  let yPosition = 150;
  drawRow(yPosition, "Receipt No:", donation.receiptNo);
  yPosition += 20;
  drawRow(
    yPosition,
    "Date:",
    new Date(donation.createdAt).toLocaleDateString("en-GB")
  );
  yPosition += 20;
  drawRow(yPosition, "Donor Name:", donation.name);
  yPosition += 20;
  drawRow(yPosition, "Mobile:", donation.mobile);

  if (donation.email) {
    yPosition += 20;
    drawRow(yPosition, "Email:", donation.email);
  }
  if (donation.panNumber) {
    yPosition += 20;
    drawRow(yPosition, "PAN Number:", donation.panNumber);
  }

  // Line separator
  doc
    .moveTo(40, yPosition + 20)
    .lineTo(380, yPosition + 20)
    .stroke();

  // Amount
  doc
    .fontSize(12)
    .font("Helvetica-Bold")
    .text("Amount Received:", 50, yPosition + 40);
  doc
    .fontSize(14)
    .font("Helvetica-Bold")
    .text(`₹ ${donation.amount.toLocaleString("en-IN")}`, 250, yPosition + 38, {
      align: "right",
    });

  // Line separator
  doc
    .moveTo(40, yPosition + 60)
    .lineTo(380, yPosition + 60)
    .stroke();

  // Footer
  doc
    .fontSize(9)
    .font("Helvetica-Oblique")
    .text("This is a computer-generated receipt.", 40, doc.page.height - 100, {
      align: "center",
    });
  doc
    .fontSize(10)
    .text("Thank you for your generous donation!", { align: "center" });

  // Finalize the PDF and end the stream
  doc.end();
});

export {
  createCashDonation,
  getAllCashDonations,
  getDonationById,
  deleteDonation,
  downloadDonationReceipt,
};
