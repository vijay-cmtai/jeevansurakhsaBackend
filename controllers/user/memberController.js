import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import Member from "../../models/memberModel.js";
import Config from "../../models/configModel.js";
import { createCashfreeOrderForMember } from "../paymentController.js";
import MemberCertificate from "../../models/memberCertificateModel.js";

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

const getConfig = async () => {
  let config = await Config.findOne({ singleton: "main_config" });
  if (!config) {
    config = await Config.create({ singleton: "main_config" });
  }
  return config;
};

const registerMember = asyncHandler(async (req, res) => {
  let formData;
  let isPayingNow;

  try {
    if (req.body.formData) {
      formData = JSON.parse(req.body.formData);
      isPayingNow = JSON.parse(req.body.isPayingNow);
    } else {
      formData = req.body;
      isPayingNow = req.body.isPayingNow || false;
    }
  } catch (e) {
    res.status(400);
    throw new Error("Invalid form data format. Could not parse data.");
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
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  if (age < 18 || age > 60) {
    res.status(400);
    throw new Error("Member must be between 18 and 60 years of age.");
  }

  const memberExists = await Member.findOne({
    $or: [{ email: email.toLowerCase() }, { phone }],
  });
  if (memberExists) {
    res.status(400);
    throw new Error("Member with this email or phone already exists");
  }

  if (!nominees || nominees.length === 0) {
    res.status(400);
    throw new Error("At least one nominee is required");
  }
  const totalPercentage = nominees.reduce(
    (sum, nom) => sum + Number(nom.percentage || 0),
    0
  );
  if (totalPercentage !== 100) {
    res.status(400);
    throw new Error("Total nominee percentage must be exactly 100%");
  }

  const memberData = { ...formData };

  if (req.files) {
    if (req.files.profileImage && req.files.profileImage.length > 0) {
      memberData.profileImageUrl = req.files.profileImage[0].path;
    }
    if (req.files.panImage && req.files.panImage.length > 0) {
      memberData.panImageUrl = req.files.panImage[0].path;
    }
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
        console.error("PAYMENT_INITIATION_FAILED for new member:", {
          memberId: member._id,
          error: paymentError.message,
        });
        res.status(500);
        throw new Error(
          "Registration was successful, but we could not initiate the payment. Please log in and try to pay from your dashboard."
        );
      }
    } else {
      res.status(201).json({
        _id: member._id,
        message:
          "Registration successful! Please login and complete your payment to activate your account.",
        paymentDetails: null,
      });
    }
  } else {
    res.status(400);
    throw new Error("Invalid member data. Could not create member.");
  }
});

const activateMember = asyncHandler(async (req, res) => {
  const member = await Member.findById(req.params.id);
  if (member && member.paymentStatus === "Pending") {
    member.registrationNo = `MBR-${String(member._id).slice(-6).toUpperCase()}`;
    member.paymentStatus = "Paid";
    member.membershipStatus = "Active";
    const updatedMember = await member.save();
    res.json({
      _id: updatedMember._id,
      fullName: updatedMember.fullName,
      email: updatedMember.email,
      token: generateToken(updatedMember._id),
      message: "Payment successful and membership is now active!",
    });
  } else if (member) {
    res.status(400).json({ message: "Member is already active." });
  } else {
    res.status(404);
    throw new Error("Member not found");
  }
});

const authMember = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const member = await Member.findOne({ email: email.toLowerCase() });
  if (member && (await member.matchPassword(password))) {
    const token = generateToken(member._id);
    res.json({
      ...member.toObject(),
      token: token,
    });
  } else {
    res.status(401);
    throw new Error("Invalid email or password");
  }
});

const getMemberProfile = asyncHandler(async (req, res) => {
  const member = await Member.findById(req.user._id).select("-password");
  if (member) {
    res.json(member);
  } else {
    res.status(404);
    throw new Error("Member not found");
  }
});

const updateMemberProfile = asyncHandler(async (req, res) => {
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
    member.panNumber = req.body.panNumber || member.panNumber;

    if (addressData) member.address = addressData;
    if (employmentData) member.employment = employmentData;
    if (nomineesData) {
      const totalPercentage = nomineesData.reduce(
        (sum, n) => sum + Number(n.percentage || 0),
        0
      );
      if (totalPercentage !== 100) {
        res.status(400);
        throw new Error("Total nominee percentage must be exactly 100%");
      }
      member.nominees = nomineesData;
    }

    if (req.body.password) {
      member.password = req.body.password;
    }

    if (req.files?.profileImage) {
      member.profileImageUrl = req.files.profileImage[0].path;
    }
    if (req.files?.panImage) {
      member.panImageUrl = req.files.panImage[0].path;
    }

    const updatedMember = await member.save();
    res.json(updatedMember);
  } else {
    res.status(404);
    throw new Error("Member not found");
  }
});

// === YEH FUNCTION UPDATE KIYA GAYA HAI ===
const addState = asyncHandler(async (req, res) => {
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

  // District names ko validate aur format karein
  const formattedDistricts = districts
    .map((d) => ({ name: d.trim() })) // Har district naam se whitespace hatao
    .filter((d) => d.name); // Khaali naam ko hata do

  if (formattedDistricts.length === 0) {
    res.status(400);
    throw new Error("District names cannot be empty.");
  }

  const newState = {
    name,
    districts: formattedDistricts,
  };

  config.states.push(newState);
  await config.save();

  res
    .status(201)
    .json(config.states.sort((a, b) => a.name.localeCompare(b.name)));
});

const getStates = asyncHandler(async (req, res) => {
  const config = await getConfig();
  res.json(config.states.sort((a, b) => a.name.localeCompare(b.name)));
});

const addDistrict = asyncHandler(async (req, res) => {
  const { stateName, districtName } = req.body;
  const config = await getConfig();
  const state = config.states.find((s) => s.name === stateName);
  if (!state) {
    res.status(404);
    throw new Error("State not found");
  }
  const districtExists = state.districts.find(
    (d) => d.name.toLowerCase() === districtName.toLowerCase()
  );
  if (districtExists) {
    res.status(400);
    throw new Error("District already exists in this state");
  }
  state.districts.push({ name: districtName });
  await config.save();
  res
    .status(201)
    .json(state.districts.sort((a, b) => a.name.localeCompare(b.name)));
});

const getDistrictsByState = asyncHandler(async (req, res) => {
  const { stateName } = req.params;
  const config = await getConfig();
  const state = config.states.find((s) => s.name === stateName);
  if (!state) {
    res.status(404);
    throw new Error("State not found");
  }
  res.json(state.districts.sort((a, b) => a.name.localeCompare(b.name)));
});

const addVolunteer = asyncHandler(async (req, res) => {
  const { name, code } = req.body;
  const config = await getConfig();
  const codeExists = config.volunteers.find(
    (v) => v.code.toUpperCase() === code.toUpperCase()
  );
  if (codeExists) {
    res.status(400);
    throw new Error("Volunteer code already exists");
  }
  config.volunteers.push({ name, code: code.toUpperCase() });
  await config.save();
  res
    .status(201)
    .json(config.volunteers.sort((a, b) => a.name.localeCompare(b.name)));
});

const getVolunteers = asyncHandler(async (req, res) => {
  const config = await getConfig();
  res.json(config.volunteers.sort((a, b) => a.name.localeCompare(b.name)));
});
const deleteState = asyncHandler(async (req, res) => {
  const { id: stateId } = req.params;
  const config = await getConfig();

  const stateExists = config.states.some((s) => s._id.toString() === stateId);
  if (!stateExists) {
    res.status(404);
    throw new Error("State not found");
  }

  config.states.pull({ _id: stateId });
  await config.save();

  res.json({ message: "State deleted successfully" });
});

const deleteDistrict = asyncHandler(async (req, res) => {
  const { stateId, districtId } = req.params;
  const config = await getConfig();

  const state = config.states.id(stateId);
  if (!state) {
    res.status(404);
    throw new Error("State not found");
  }

  const districtExists = state.districts.some(
    (d) => d._id.toString() === districtId
  );
  if (!districtExists) {
    res.status(404);
    throw new Error("District not found in this state");
  }

  state.districts.pull({ _id: districtId });
  await config.save();

  res.json({ message: "District deleted successfully" });
});

const deleteVolunteer = asyncHandler(async (req, res) => {
  const { id: volunteerId } = req.params;
  const config = await getConfig();

  const volunteerExists = config.volunteers.some(
    (v) => v._id.toString() === volunteerId
  );
  if (!volunteerExists) {
    res.status(404);
    throw new Error("Volunteer not found");
  }

  config.volunteers.pull({ _id: volunteerId });
  await config.save();

  res.json({ message: "Volunteer deleted successfully" });
});

const changeMemberStatusByAdmin = asyncHandler(async (req, res) => {
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

const getBlockedUsers = asyncHandler(async (req, res) => {
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
const getMyCertificates = asyncHandler(async (req, res) => {
  const certificates = await MemberCertificate.find({ member: req.user._id })
    .select("-member -generatedBy")
    .sort({ createdAt: -1 });

  res.json(certificates);
});
export {
  registerMember,
  activateMember,
  authMember,
  getMemberProfile,
  updateMemberProfile,
  addState,
  getStates,
  addDistrict,
  getDistrictsByState,
  addVolunteer,
  getVolunteers,
  changeMemberStatusByAdmin,
  getBlockedUsers,
  getMyCertificates,
  deleteState,
  deleteDistrict,
  deleteVolunteer,
};
