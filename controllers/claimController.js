import asyncHandler from "express-async-handler";
import Claim from "../models/claimModel.js";
import Member from "../models/memberModel.js";

// --- PUBLIC FACING CONTROLLERS ---

// @desc    Create a new claim from the public website using EMAIL
// @route   POST /api/claims
const createPublicClaim = asyncHandler(async (req, res) => {
  const claimData = JSON.parse(req.body.claimData);
  const { email, dateOfDeath, nomineeDetails } = claimData;

  // Validate required fields
  if (!email || !dateOfDeath || !nomineeDetails) {
    res.status(400);
    throw new Error(
      "Missing required claim information (email, date of death, nominee details)."
    );
  }

  // Find member by email (case-insensitive)
  const member = await Member.findOne({ email: email.toLowerCase() });

  // If member not found, throw a specific error
  if (!member) {
    res.status(404);
    throw new Error(`Member with Email '${email}' not found.`);
  }

  // Create a new claim instance
  const newClaim = new Claim({
    deceasedMember: member._id,
    dateOfDeath,
    nomineeDetails,
    contributionPlan: member.employment?.contributionPlan || "Not Specified",
    contributionAmountRequired: 0, // Admin will set this value later
  });

  // Handle file uploads
  if (req.files?.deathCertificate) {
    newClaim.deathCertificateUrl = req.files.deathCertificate[0].path;
  }
  if (req.files?.deceasedMemberPhoto) {
    newClaim.deceasedMemberPhotoUrl = req.files.deceasedMemberPhoto[0].path;
  }

  await newClaim.save();
  res
    .status(201)
    .json({
      message: "Claim reported successfully. We will review it shortly.",
    });
});

// @desc    Get only ACTIVE claims for the PUBLIC website (Hides sensitive data)
// @route   GET /api/claims/active
const getPublicActiveClaims = asyncHandler(async (req, res) => {
  const claims = await Claim.find({ claimStatus: "Active" })
    .populate("deceasedMember", "fullName profileImageUrl")
    .select(
      "-nomineeDetails.accountNumber -nomineeDetails.ifscCode -reportedBy -deathCertificateUrl"
    )
    .sort({ createdAt: -1 });

  res.json(claims);
});

// --- ADMIN FACING CONTROLLERS ---

// @desc    Get ALL claims (all statuses) for the ADMIN panel
// @route   GET /api/claims/admin
const getAllClaimsForAdmin = asyncHandler(async (req, res) => {
  const claims = await Claim.find({})
    .populate("deceasedMember", "fullName profileImageUrl registrationNo")
    .sort({ createdAt: -1 });
  res.json(claims);
});

// @desc    Get a single claim by ID for admin
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

// @desc    Update a claim by admin
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

// @desc    Delete a claim by admin
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
