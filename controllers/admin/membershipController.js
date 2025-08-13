import asyncHandler from "express-async-handler";
import Member from "../../models/memberModel.js";

/**
 * @desc    Get new membership requests (Pending status)
 * @route   GET /api/admin/members/new
 * @access  Private/Admin
 */
const getNewMembershipRequests = asyncHandler(async (req, res) => {
  const pageSize = Number(req.query.limit) || 10;
  const page = Number(req.query.page) || 1;

  const keyword = req.query.keyword
    ? {
        $or: [
          { fullName: { $regex: req.query.keyword, $options: "i" } },
          { email: { $regex: req.query.keyword, $options: "i" } },
          { phone: { $regex: req.query.keyword, $options: "i" } },
        ],
      }
    : {};

  const count = await Member.countDocuments({
    ...keyword,
    membershipStatus: "Pending",
  });

  const members = await Member.find({ ...keyword, membershipStatus: "Pending" })
    .sort({ createdAt: -1 })
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  res.json({ members, page, pages: Math.ceil(count / pageSize), total: count });
});

/**
 * @desc    Get all active members
 * @route   GET /api/admin/members/active
 * @access  Private/Admin
 */
const getActiveMembers = asyncHandler(async (req, res) => {
  const pageSize = Number(req.query.limit) || 10;
  const page = Number(req.query.page) || 1;

  const keyword = req.query.keyword
    ? {
        $or: [
          { fullName: { $regex: req.query.keyword, $options: "i" } },
          { email: { $regex: req.query.keyword, $options: "i" } },
          { registrationNo: { $regex: req.query.keyword, $options: "i" } },
        ],
      }
    : {};

  const count = await Member.countDocuments({
    ...keyword,
    membershipStatus: "Active",
  });

  const members = await Member.find({ ...keyword, membershipStatus: "Active" })
    .sort({ createdAt: -1 })
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  res.json({ members, page, pages: Math.ceil(count / pageSize), total: count });
});

/**
 * @desc    Get all blocked members
 * @route   GET /api/admin/members/blocked
 * @access  Private/Admin
 */
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

  const membersFromDB = await Member.find(filter)
    .sort({ blockedAt: -1 })
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  const members = membersFromDB.map((m) => {
    const memberObject = m.toObject();
    if (m.blockedBy) {
      memberObject.blockedBy = { fullName: m.blockedBy, email: m.blockedBy };
    }
    return memberObject;
  });

  res.json({ members, page, pages: Math.ceil(count / pageSize), total: count });
});

/**
 * @desc    Get a single member by ID
 * @route   GET /api/admin/members/:id
 * @access  Private/Admin
 */
const getMemberById = asyncHandler(async (req, res) => {
  const member = await Member.findById(req.params.id);
  if (member) {
    res.json(member);
  } else {
    res.status(404);
    throw new Error("Member not found");
  }
});

/**
 * @desc    Verify a new member
 * @route   PUT /api/admin/members/:id/verify
 * @access  Private/Admin
 */
const verifyMemberByAdmin = asyncHandler(async (req, res) => {
  const member = await Member.findById(req.params.id);
  if (member && member.membershipStatus === "Pending") {
    member.membershipStatus = "Active";
    member.paymentStatus = "Paid";
    member.verifiedByAdmin = true;
    if (!member.registrationNo) {
      const count = await Member.countDocuments({
        registrationNo: { $exists: true },
      });
      member.registrationNo = `MBR-${(count + 1).toString().padStart(3, "0")}`;
    }
    const updatedMember = await member.save();
    res.json({
      message: "Member verified successfully",
      member: updatedMember,
    });
  } else if (member) {
    res
      .status(400)
      .json({ message: "Member is not in pending state or already verified." });
  } else {
    res.status(404);
    throw new Error("Member not found");
  }
});

/**
 * @desc    Update member details by admin
 * @route   PUT /api/admin/members/:id
 * @access  Private/Admin
 */
const updateMemberByAdmin = asyncHandler(async (req, res) => {
  const member = await Member.findById(req.params.id);

  if (member) {
    // Destructure all possible fields from the request body
    const {
      state,
      district,
      volunteerCode,
      fullName,
      panNumber,
      address,
      employment,
      nominees,
    } = req.body;

    // Handle nested JSON data that comes as strings from FormData
    let parsedAddress, parsedEmployment, parsedNominees;
    try {
      if (address) parsedAddress = JSON.parse(address);
      if (employment) parsedEmployment = JSON.parse(employment);
      if (nominees) parsedNominees = JSON.parse(nominees);
    } catch (e) {
      res.status(400);
      throw new Error(
        "Invalid format for JSON data (address, employment, or nominees)."
      );
    }

    // Update all fields from the request
    // Using `'key' in req.body` allows setting fields to empty strings
    if ("state" in req.body) member.state = state;
    if ("district" in req.body) member.district = district;
    if ("volunteerCode" in req.body) member.volunteerCode = volunteerCode;
    if ("fullName" in req.body) member.fullName = fullName;
    if ("panNumber" in req.body) member.panNumber = panNumber;

    if (parsedAddress) member.address = parsedAddress;
    if (parsedEmployment) member.employment = parsedEmployment;
    if (parsedNominees) member.nominees = parsedNominees;

    // Handle file uploads
    if (req.files) {
      if (req.files.profileImage) {
        member.profileImageUrl = req.files.profileImage[0].path;
      }
      if (req.files.panImage) {
        member.panImageUrl = req.files.panImage[0].path;
      }
    }

    const updatedMember = await member.save();
    res.json(updatedMember);
  } else {
    res.status(404);
    throw new Error("Member not found");
  }
});

/**
 * @desc    Change a member's status (Block, Unblock, Deactivate)
 * @route   PUT /api/admin/members/:id/status
 * @access  Private/Admin
 */
const changeMemberStatus = asyncHandler(async (req, res) => {
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
      member.blockedBy = req.user.email || "Admin";
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

/**
 * @desc    Delete a member permanently
 * @route   DELETE /api/admin/members/:id
 * @access  Private/Admin
 */
const deleteMember = asyncHandler(async (req, res) => {
  const member = await Member.findById(req.params.id);
  if (member) {
    await member.deleteOne();
    res.json({ message: "Member removed successfully" });
  } else {
    res.status(404);
    throw new Error("Member not found");
  }
});

const generateAppointmentLetter = asyncHandler(async (req, res) => {
  const member = await Member.findById(req.params.id);
  if (!member || member.membershipStatus !== "Active") {
    res.status(404);
    throw new Error("Active member not found");
  }
  res.json({
    message: "Appointment Letter Generated (Placeholder)",
    name: member.fullName,
  });
});

const generateIdCard = asyncHandler(async (req, res) => {
  const member = await Member.findById(req.params.id);
  if (!member || member.membershipStatus !== "Active") {
    res.status(404);
    throw new Error("Active member not found");
  }
  res.json({
    message: "ID Card Generated (Placeholder)",
    name: member.fullName,
  });
});

const generateReceipt = asyncHandler(async (req, res) => {
  const member = await Member.findById(req.params.id);
  if (!member || member.paymentStatus !== "Paid") {
    res.status(400);
    throw new Error("Payment not completed for this member.");
  }
  res.json({
    message: "Receipt Generated (Placeholder)",
    name: member.fullName,
  });
});

export {
  getNewMembershipRequests,
  getActiveMembers,
  getBlockedUsers,
  getMemberById,
  verifyMemberByAdmin,
  updateMemberByAdmin,
  changeMemberStatus,
  deleteMember,
  generateAppointmentLetter,
  generateIdCard,
  generateReceipt,
};
