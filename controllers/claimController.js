import asyncHandler from "express-async-handler";
import Claim from "../models/claimModel.js";
import Member from "../models/memberModel.js";

const createPublicClaim = asyncHandler(async (req, res) => {
  const claimData = JSON.parse(req.body.claimData);
  const { registrationNo, fullName, dateOfDeath, nomineeDetails } = claimData;

  if (!registrationNo || !fullName || !dateOfDeath || !nomineeDetails) {
    res.status(400);
    throw new Error(
      "Missing required fields (Registration No, Full Name, Date of Death, Nominee Details)."
    );
  }

  const member = await Member.findOne({
    registrationNo: registrationNo.toUpperCase(),
  });

  if (!member) {
    res.status(404);
    throw new Error(
      `Member with Registration No '${registrationNo}' not found.`
    );
  }

  if (member.fullName.toLowerCase() !== fullName.toLowerCase()) {
    res.status(400);
    throw new Error(
      "The provided name does not match the registration number. Please check the details and try again."
    );
  }

  const newClaim = new Claim({
    deceasedMember: member._id,
    dateOfDeath,
    nomineeDetails,
    contributionPlan: member.employment?.contributionPlan || "Not Specified",
    contributionAmountRequired: 0,
  });

  if (req.files?.deathCertificate) {
    newClaim.deathCertificateUrl = req.files.deathCertificate[0].path;
  }
  if (req.files?.deceasedMemberPhoto) {
    newClaim.deceasedMemberPhotoUrl = req.files.deceasedMemberPhoto[0].path;
  }

  await newClaim.save();
  res.status(201).json({
    message: "Claim reported successfully. We will review it shortly.",
  });
});

const getPublicActiveClaims = asyncHandler(async (req, res) => {
  const claims = await Claim.find({ claimStatus: "Active" })
    .populate("deceasedMember", "fullName profileImageUrl")
    .select(
      "-nomineeDetails.accountNumber -nomineeDetails.ifscCode -reportedBy -deathCertificateUrl"
    )
    .sort({ createdAt: -1 });

  res.json(claims);
});

const getAllClaimsForAdmin = asyncHandler(async (req, res) => {
  const claims = await Claim.find({})
    .populate("deceasedMember", "fullName profileImageUrl registrationNo")
    .sort({ createdAt: -1 });
  res.json(claims);
});

const getClaimById = asyncHandler(async (req, res) => {
  const claim = await Claim.findById(req.params.id).populate(
    "deceasedMember",
    "fullName profileImageUrl registrationNo"
  );
  if (claim) {
    res.json(claim);
  } else {
    res.status(404);
    throw new Error("Claim not found");
  }
});

const updateClaim = asyncHandler(async (req, res) => {
  const claim = await Claim.findById(req.params.id);
  if (!claim) {
    res.status(404);
    throw new Error("Claim not found");
  }

  const claimData = JSON.parse(req.body.claimData);
  const {
    nomineeDetails,
    contributionAmountRequired,
    claimStatus,
    dateOfDeath,
    contributionPlan,
  } = claimData;

  claim.nomineeDetails = nomineeDetails || claim.nomineeDetails;
  claim.contributionAmountRequired =
    contributionAmountRequired ?? claim.contributionAmountRequired;
  claim.claimStatus = claimStatus || claim.claimStatus;
  claim.dateOfDeath = dateOfDeath || claim.dateOfDeath;
  claim.contributionPlan = contributionPlan || claim.contributionPlan;

  if (req.files?.deceasedMemberPhoto) {
    claim.deceasedMemberPhotoUrl = req.files.deceasedMemberPhoto[0].path;
  }
  if (req.files?.deathCertificate) {
    claim.deathCertificateUrl = req.files.deathCertificate[0].path;
  }

  const updatedClaim = await claim.save();
  const populatedClaim = await Claim.findById(updatedClaim._id).populate(
    "deceasedMember",
    "fullName profileImageUrl registrationNo"
  );
  res.json(populatedClaim);
});

const deleteClaim = asyncHandler(async (req, res) => {
  const claim = await Claim.findById(req.params.id);
  if (claim) {
    await claim.deleteOne();
    res.json({ message: "Claim removed" });
  } else {
    res.status(404);
    throw new Error("Claim not found");
  }
});

export {
  createPublicClaim,
  getPublicActiveClaims,
  getAllClaimsForAdmin,
  getClaimById,
  updateClaim,
  deleteClaim,
};
