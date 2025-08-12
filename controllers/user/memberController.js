import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import Member from "../../models/memberModel.js";
import Config from "../../models/configModel.js";
import { createCashfreeOrderForMember } from "../paymentController.js";
import MemberCertificate from "../../models/memberCertificateModel.js";

// Helper function to generate a JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// Helper function to get or create the main config document
const getConfig = async () => {
  let config = await Config.findOne({ singleton: "main_config" });
  if (!config) {
    config = await Config.create({ singleton: "main_config" });
  }
  return config;
};

// --- CORE MEMBER FUNCTIONS ---

export const registerMember = asyncHandler(async (req, res) => {
  let formData;
  let isPayingNow;
  try {
    formData = JSON.parse(req.body.formData);
    isPayingNow = JSON.parse(req.body.isPayingNow);
  } catch (e) {
    res.status(400);
    throw new Error("Invalid form data format.");
  }

  const { dateOfBirth, fullName, phone, email, nominees } = formData;

  if (!dateOfBirth) {
    res.status(400);
    throw new Error("Date of birth is required.");
  }
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  if (age < 18 || age > 60) {
    res.status(400);
    throw new Error("Member must be between 18 and 60 years of age.");
  }

  const memberExists = await Member.findOne({
    $or: [{ email: email.toLowerCase() }, { phone }],
  });
  if (memberExists) {
    res.status(400);
    throw new Error("A member with this email or phone number already exists.");
  }

  if (!nominees || nominees.length === 0) {
    res.status(400);
    throw new Error("At least one nominee is required.");
  }
  const totalPercentage = nominees.reduce(
    (sum, nom) => sum + Number(nom.percentage || 0),
    0
  );
  if (totalPercentage !== 100) {
    res.status(400);
    throw new Error("The total nominee percentage must be exactly 100%.");
  }

  const memberData = { ...formData };
  if (req.files) {
    if (req.files.profileImage?.[0])
      memberData.profileImageUrl = req.files.profileImage[0].path;
    if (req.files.panImage?.[0])
      memberData.panImageUrl = req.files.panImage[0].path;
  }

  const member = await Member.create(memberData);

  if (member) {
    if (isPayingNow) {
      try {
        const paymentDetails = await createCashfreeOrderForMember(member);
        res.status(201).json({
          _id: member._id,
          message: "Member registered. Proceeding to payment.",
          paymentDetails,
        });
      } catch (paymentError) {
        res.status(500);
        throw new Error(
          "Registration successful, but payment initiation failed. Please login and pay from your dashboard."
        );
      }
    } else {
      res.status(201).json({
        _id: member._id,
        message: "Registration successful! Please login to complete payment.",
        paymentDetails: null,
      });
    }
  } else {
    res.status(400);
    throw new Error("Invalid member data. Could not create member.");
  }
});

export const authMember = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    res.status(400);
    throw new Error("Please provide identifier and password.");
  }

  const member = await Member.findOne({
    $or: [{ email: identifier.toLowerCase() }, { phone: identifier }],
  });

  if (member && (await member.matchPassword(password))) {
    res.json({ ...member.toObject(), token: generateToken(member._id) });
  } else {
    res.status(401);
    throw new Error("Invalid credentials.");
  }
});

export const getMemberProfile = asyncHandler(async (req, res) => {
  const member = await Member.findById(req.user._id).select("-password");
  if (member) res.json(member);
  else {
    res.status(404);
    throw new Error("Member not found.");
  }
});

export const updateMemberProfile = asyncHandler(async (req, res) => {
  const member = await Member.findById(req.user._id);
  if (member) {
    let addressData, employmentData, nomineesData;
    try {
      if (req.body.address) addressData = JSON.parse(req.body.address);
      if (req.body.employment) employmentData = JSON.parse(req.body.employment);
      if (req.body.nominees) nomineesData = JSON.parse(req.body.nominees);
    } catch (e) {
      res.status(400);
      throw new Error("Invalid format for nested data.");
    }
    member.fullName = req.body.fullName || member.fullName;
    member.phone = req.body.phone || member.phone;
    if (addressData) member.address = addressData;
    if (employmentData) member.employment = employmentData;
    if (nomineesData) member.nominees = nomineesData;
    if (req.body.password) member.password = req.body.password;
    if (req.files?.profileImage)
      member.profileImageUrl = req.files.profileImage[0].path;
    if (req.files?.panImage) member.panImageUrl = req.files.panImage[0].path;
    res.json(await member.save());
  } else {
    res.status(404);
    throw new Error("Member not found");
  }
});

export const getMyCertificates = asyncHandler(async (req, res) => {
  const certificates = await MemberCertificate.find({
    member: req.user._id,
  }).sort({ createdAt: -1 });
  res.json(certificates);
});

// --- CONFIG AND ADMIN FUNCTIONS ---

export const addState = asyncHandler(async (req, res) => {
  const { name, districts } = req.body;
  if (
    !name ||
    !districts ||
    !Array.isArray(districts) ||
    districts.length === 0
  ) {
    res.status(400);
    throw new Error(
      "State name and a non-empty array of districts are required."
    );
  }

  const config = await getConfig();
  const stateExists = config.states.find(
    (s) => s.name.toLowerCase() === name.toLowerCase()
  );
  if (stateExists) {
    res.status(400);
    throw new Error("State already exists");
  }

  const formattedDistricts = districts
    .map((d) => ({ name: d.trim() }))
    .filter((d) => d.name);
  if (formattedDistricts.length === 0) {
    res.status(400);
    throw new Error("District names cannot be empty.");
  }

  // SOLUTION: Seedha database ko update karein, poore document ko save na karein
  await Config.updateOne(
    { singleton: "main_config" },
    { $push: { states: { name, districts: formattedDistricts } } }
  );

  const updatedConfig = await getConfig();
  res
    .status(201)
    .json(updatedConfig.states.sort((a, b) => a.name.localeCompare(b.name)));
});

export const getStates = asyncHandler(async (req, res) => {
  const config = await getConfig();
  res.json(config.states.sort((a, b) => a.name.localeCompare(b.name)));
});
export const addDistrict = asyncHandler(async (req, res) => {
  const { stateName, districtName } = req.body;

  const result = await Config.updateOne(
    { "states.name": stateName },
    { $push: { "states.$.districts": { name: districtName } } }
  );

  if (result.matchedCount === 0) {
    res.status(404);
    throw new Error("State not found");
  }

  const updatedConfig = await getConfig();
  const updatedState = updatedConfig.states.find((s) => s.name === stateName);
  res
    .status(201)
    .json(updatedState.districts.sort((a, b) => a.name.localeCompare(b.name)));
});

export const getDistrictsByState = asyncHandler(async (req, res) => {
  const { stateName } = req.params;
  const config = await getConfig();
  const state = config.states.find((s) => s.name === stateName);
  if (!state) {
    res.status(404);
    throw new Error("State not found");
  }
  res.json(state.districts.sort((a, b) => a.name.localeCompare(b.name)));
});

export const addVolunteer = asyncHandler(async (req, res) => {
  const { name, code, phone, state, district } = req.body;
  if (!name || !code || !phone || !state || !district) {
    res.status(400);
    throw new Error(
      "Please provide all fields: name, code, phone, state, and district."
    );
  }

  const config = await getConfig();
  const codeExists = config.volunteers.find(
    (v) => v.code.toUpperCase() === code.toUpperCase()
  );
  if (codeExists) {
    res.status(400);
    throw new Error("Volunteer with this code already exists");
  }

  // SOLUTION: Seedha database ko update karein
  await Config.updateOne(
    { singleton: "main_config" },
    {
      $push: {
        volunteers: { name, code: code.toUpperCase(), phone, state, district },
      },
    }
  );

  const updatedConfig = await getConfig();
  res
    .status(201)
    .json(
      updatedConfig.volunteers.sort((a, b) => a.name.localeCompare(b.name))
    );
});
export const getVolunteers = asyncHandler(async (req, res) => {
  const config = await getConfig();
  res.json(config.volunteers.sort((a, b) => a.name.localeCompare(b.name)));
});

export const deleteState = asyncHandler(async (req, res) => {
  const { id: stateId } = req.params;
  await Config.updateOne(
    { singleton: "main_config" },
    { $pull: { states: { _id: stateId } } }
  );
  res.json({ message: "State deleted successfully" });
});

export const deleteDistrict = asyncHandler(async (req, res) => {
  const { stateId, districtId } = req.params;
  await Config.updateOne(
    { "states._id": stateId },
    { $pull: { "states.$.districts": { _id: districtId } } }
  );
  res.json({ message: "District deleted successfully" });
});

export const deleteVolunteer = asyncHandler(async (req, res) => {
  const { id: volunteerId } = req.params;
  await Config.updateOne(
    { singleton: "main_config" },
    { $pull: { volunteers: { _id: volunteerId } } }
  );
  res.json({ message: "Volunteer deleted successfully" });
});

export const changeMemberStatusByAdmin = asyncHandler(async (req, res) => {
  const { status, notes } = req.body;
  if (!["Active", "Blocked", "Inactive"].includes(status)) {
    res.status(400);
    throw new Error("Invalid status value.");
  }
  const member = await Member.findById(req.params.id);
  if (member) {
    member.membershipStatus = status;
    if (status === "Blocked") {
      member.adminNotes = notes || "No reason provided.";
      member.blockedAt = new Date();
      member.blockedBy = req.user._id;
    } else {
      member.adminNotes = undefined;
      member.blockedAt = undefined;
      member.blockedBy = undefined;
    }
    await member.save();
    res.json({ message: `Member status has been updated to ${status}.` });
  } else {
    res.status(404);
    throw new Error("Member not found");
  }
});

export const getBlockedUsers = asyncHandler(async (req, res) => {
  const pageSize = Number(req.query.limit) || 10;
  const page = Number(req.query.page) || 1;
  const keyword = req.query.keyword
    ? {
        $or: [
          { fullName: { $regex: req.query.keyword, $options: "i" } },
          { email: { $regex: req.query.keyword, $options: "i" } },
        ],
      }
    : {};
  const filter = { membershipStatus: "Blocked", ...keyword };
  const count = await Member.countDocuments(filter);
  const members = await Member.find(filter)
    .populate("blockedBy", "fullName email")
    .sort({ blockedAt: -1 })
    .limit(pageSize)
    .skip(pageSize * (page - 1));
  res.json({ members, page, pages: Math.ceil(count / pageSize), total: count });
});
