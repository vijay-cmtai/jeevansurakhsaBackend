import asyncHandler from "express-async-handler";
import VisitorCertificate from "../../models/visitorCertificateModel.js";
import PDFDocument from "pdfkit"; // Make sure pdfkit is installed: npm install pdfkit

// This function creates the record in the database without using .populate()
const generateCertificate = asyncHandler(async (req, res) => {
  const { name, fatherName, mobile, email, programName, templateId } = req.body;

  if (!name || !fatherName || !mobile || !programName || !templateId) {
    res.status(400);
    throw new Error("Please provide all required fields.");
  }

  const certificateNo = `VC-${Date.now()}`;

  // Get the admin's email from the token provided by the 'protect' middleware.
  // This is a reliable way to get the admin's identifier without a separate Admin model.
  const adminIdentifier = req.user.email || "Admin";

  const certificate = await VisitorCertificate.create({
    certificateNo,
    name,
    fatherName,
    mobile,
    email,
    programName,
    templateId,
    certificateUrl: `/api/admin/visitor-certificates/download/${certificateNo}`, // A reference path
    generatedBy: adminIdentifier, // Save the admin's identifier (string) directly
  });

  if (certificate) {
    res.status(201).json({
      message: "Certificate record created successfully!",
      certificate, // Send back the complete object
    });
  } else {
    res.status(400);
    throw new Error("Invalid certificate data.");
  }
});

// This function finds a record by ID and generates a PDF on the fly.
const downloadCertificate = asyncHandler(async (req, res) => {
  const certificate = await VisitorCertificate.findById(req.params.id);

  if (!certificate) {
    res.status(404);
    throw new Error("Certificate record not found.");
  }

  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 50 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=certificate-${certificate.name.replace(/\s+/g, "-")}.pdf`
  );

  doc.pipe(res);

  // Add content to the PDF using data from the database
  doc.fontSize(36).text("Certificate of Participation", { align: "center" });
  doc.moveDown(2);
  doc.fontSize(18).text("This is to certify that", { align: "center" });
  doc.moveDown(1);
  doc
    .fontSize(28)
    .font("Helvetica-Bold")
    .text(certificate.name, { align: "center" });
  doc.moveDown(1);
  doc
    .fontSize(16)
    .font("Helvetica")
    .text(`Son/Daughter of ${certificate.fatherName}`, { align: "center" });
  doc.moveDown(2);
  doc
    .fontSize(18)
    .text(`has successfully participated in the program:`, { align: "center" });
  doc.moveDown(1);
  doc
    .fontSize(24)
    .font("Helvetica-Bold")
    .text(certificate.programName, { align: "center" });
  doc.moveDown(3);
  doc
    .fontSize(12)
    .font("Helvetica")
    .text(`Date: ${new Date(certificate.createdAt).toLocaleDateString()}`, {
      align: "left",
    });
  doc.fontSize(12).text("Signature: ____________", { align: "right" });

  doc.end();
});

// This function gets the list of all generated certificates WITHOUT using .populate()
const getAllCertificates = asyncHandler(async (req, res) => {
  const pageSize = Number(req.query.limit) || 10;
  const page = Number(req.query.page) || 1;
  const keyword = req.query.keyword
    ? {
        $or: [
          { name: { $regex: req.query.keyword, $options: "i" } },
          { email: { $regex: req.query.keyword, $options: "i" } },
          { certificateNo: { $regex: req.query.keyword, $options: "i" } },
        ],
      }
    : {};

  const count = await VisitorCertificate.countDocuments({ ...keyword });

  // --- .populate("generatedBy", "name") has been REMOVED ---
  const certificates = await VisitorCertificate.find({ ...keyword })
    .sort({ createdAt: -1 })
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  res.json({
    certificates,
    page,
    pages: Math.ceil(count / pageSize),
    total: count,
  });
});

// This function deletes a certificate record from the database.
const deleteCertificate = asyncHandler(async (req, res) => {
  const certificate = await VisitorCertificate.findById(req.params.id);

  if (certificate) {
    await certificate.deleteOne();
    res.json({ message: "Certificate deleted successfully." });
  } else {
    res.status(404);
    throw new Error("Certificate not found.");
  }
});

export {
  generateCertificate,
  getAllCertificates,
  deleteCertificate,
  downloadCertificate,
};
