// File: controllers/admin/memberCertificateController.js

import asyncHandler from "express-async-handler";
import MemberCertificate from "../../models/memberCertificateModel.js";
import Member from "../../models/memberModel.js";
import PDFDocument from "pdfkit";

/**
 * @desc    Get members who are eligible for a certificate.
 */
const getEligibleMembers = asyncHandler(async (req, res) => {
  const certifiedMemberIds = await MemberCertificate.find({}).select("member");
  const ids = certifiedMemberIds.map((c) => c.member);

  const eligibleMembers = await Member.find({
    _id: { $nin: ids },
    membershipStatus: "Active",
  }).sort({ fullName: 1 });

  res.json(eligibleMembers);
});

/**
 * @desc    Generate a certificate record, storing admin name as a string.
 */
const generateForMember = asyncHandler(async (req, res) => {
  const { fatherName, programName, templateId } = req.body;
  const { memberId } = req.params;

  const member = await Member.findById(memberId);
  if (!member) {
    res.status(404);
    throw new Error("Member not found");
  }

  const alreadyExists = await MemberCertificate.findOne({ member: memberId });
  if (alreadyExists) {
    res.status(400);
    throw new Error("A certificate for this member already exists.");
  }

  const adminIdentifier = req.user.name || req.user.email || "Admin";

  const certificate = await MemberCertificate.create({
    certificateNo: `MC-${Date.now()}`,
    member: memberId,
    fatherName,
    programName,
    templateId,
    generatedBy: adminIdentifier,
  });

  const populatedCertificate = await certificate.populate({
    path: "member",
    select: "fullName email registrationNo membershipStatus createdAt",
  });

  const responseCert = populatedCertificate.toObject();
  responseCert.generatedBy = { name: adminIdentifier };

  res.status(201).json({
    message: "Certificate record created successfully!",
    certificate: responseCert,
  });
});

/**
 * @desc    Get all generated member certificates.
 */
const getGeneratedCertificates = asyncHandler(async (req, res) => {
  const certificates = await MemberCertificate.find({})
    .populate({
      path: "member",
      select: "fullName email registrationNo membershipStatus createdAt",
    })
    .sort({ createdAt: -1 });

  const responseCertificates = certificates.map((cert) => {
    const certObject = cert.toObject();
    certObject.generatedBy = {
      name: cert.generatedBy,
    };
    return certObject;
  });

  res.json(responseCertificates);
});

/**
 * @desc    View certificate by generating a PDF on-the-fly.
 */
const viewMemberCertificate = asyncHandler(async (req, res) => {
  const certificate = await MemberCertificate.findById(req.params.id).populate({
    path: "member",
    select: "fullName",
  });

  if (!certificate) {
    res.status(404);
    throw new Error("Certificate record not found.");
  }

  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 50 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="certificate-${certificate.certificateNo}.pdf"`
  );

  doc.pipe(res);

  doc.fontSize(32).text("Certificate of Membership", { align: "center" });
  doc.moveDown(2);
  doc.fontSize(18).text("This is to certify that", { align: "center" });
  doc.moveDown(1);
  doc
    .fontSize(28)
    .font("Helvetica-Bold")
    .text(certificate.member.fullName, { align: "center" });
  doc.moveDown(1);
  doc
    .fontSize(16)
    .font("Helvetica")
    .text(`Son/Daughter of ${certificate.fatherName}`, { align: "center" });
  doc.moveDown(2);
  doc
    .fontSize(18)
    .text("is a valued member of the program:", { align: "center" });
  doc.moveDown(1);
  doc
    .fontSize(24)
    .font("Helvetica-Bold")
    .text(certificate.programName, { align: "center" });
  doc.moveDown(3);
  doc
    .fontSize(12)
    .text(
      `Date of Issue: ${new Date(certificate.createdAt).toLocaleDateString("en-GB")}`,
      { align: "left" }
    );
  doc
    .fontSize(12)
    .text("Authorized Signature: ____________", { align: "right" });
  doc.end();
});

/**
 * @desc    Download certificate by generating a PDF and forcing download.
 * @route   GET /api/admin/member-certificates/download/:id
 */
const downloadMemberCertificate = asyncHandler(async (req, res) => {
  const certificate = await MemberCertificate.findById(req.params.id).populate({
    path: "member",
    select: "fullName registrationNo",
  });

  if (!certificate) {
    res.status(404);
    throw new Error("Certificate record not found.");
  }

  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 50 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="Certificate-${certificate.member.registrationNo || certificate.certificateNo}.pdf"`
  );

  doc.pipe(res);

  doc.fontSize(32).text("Certificate of Membership", { align: "center" });
  doc.moveDown(2);
  doc.fontSize(18).text("This is to certify that", { align: "center" });
  doc.moveDown(1);
  doc
    .fontSize(28)
    .font("Helvetica-Bold")
    .text(certificate.member.fullName, { align: "center" });
  doc.moveDown(1);
  doc
    .fontSize(16)
    .font("Helvetica")
    .text(`Son/Daughter of ${certificate.fatherName}`, { align: "center" });
  doc.moveDown(2);
  doc
    .fontSize(18)
    .text("is a valued member of the program:", { align: "center" });
  doc.moveDown(1);
  doc
    .fontSize(24)
    .font("Helvetica-Bold")
    .text(certificate.programName, { align: "center" });
  doc.moveDown(3);
  doc
    .fontSize(12)
    .text(
      `Date of Issue: ${new Date(certificate.createdAt).toLocaleDateString("en-GB")}`,
      { align: "left" }
    );
  doc
    .fontSize(12)
    .text("Authorized Signature: ____________", { align: "right" });
  doc.end();
});

/**
 * @desc    Delete a certificate record.
 */
const deleteCertificate = asyncHandler(async (req, res) => {
  const certificate = await MemberCertificate.findById(req.params.id);
  if (certificate) {
    await certificate.deleteOne();
    res.json({ message: "Certificate record deleted successfully." });
  } else {
    res.status(404);
    throw new Error("Certificate not found.");
  }
});

export {
  getEligibleMembers,
  getGeneratedCertificates,
  generateForMember,
  deleteCertificate,
  downloadMemberCertificate,
  viewMemberCertificate,
};
