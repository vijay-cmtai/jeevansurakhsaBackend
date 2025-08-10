import asyncHandler from "express-async-handler";
import Notice from "../../models/noticeModel.js";
import Member from "../../models/memberModel.js";
import { activateMember } from "../user/memberController.js";

const sendSingleNotice = asyncHandler(async (req, res) => {
  const { title, subject, content } = req.body;
  const memberId = req.params.id;
  const adminId = process.env.ADMIN_ID;

  if (!title || !subject || !content) {
    res.status(400);
    throw new Error("Title, subject, and content are required");
  }

  const member = await Member.findById(memberId);
  if (!member) {
    res.status(404);
    throw new Error("Member not found");
  }

  const notice = await Notice.create({
    title,
    subject,
    content,
    sentBy: adminId,
    recipientType: "Single",
    recipients: [memberId],
  });

  if (notice) {
    res
      .status(201)
      .json({ message: `Notice sent successfully to ${member.fullName}` });
  } else {
    res.status(400);
    throw new Error("Failed to send notice");
  }
});

const sendNoticeToAll = asyncHandler(async (req, res) => {
  const { title, subject, content } = req.body;
  // console.log("this is data", title, subject, content);
  console.log("this is body", req.body);
  const adminId = process.env.ADMIN_ID;

  if (!title || !subject || !content) {
    res.status(400);
    throw new Error("Title, subject, and content are required");
  }

  const activeMembers = await Member.find({ membershipStatus: "Active" });
  const memberIds = activeMembers.map((member) => member._id);
  console.log("this is activemember", memberIds.length);

  if (memberIds.length === 0) {
    res.status(404);
    throw new Error("No active members found to send notice.");
  }

  const notice = await Notice.create({
    title,
    subject,
    content,
    sentBy: adminId,
    recipientType: "All",
    recipients: memberIds,
  });

  console.log("this is notice", notice);
  if (notice) {
    res
      .status(201)
      .json({ message: "Notice sent successfully to all active users." });
  } else {
    res.status(400);
    throw new Error("Failed to send notice to all users");
  }
});

const getPreviousNotices = asyncHandler(async (req, res) => {
  const pageSize = Number(req.query.limit) || 10;
  const page = Number(req.query.page) || 1;

  const count = await Notice.countDocuments({});
  const notices = await Notice.find({})
    .populate("sentBy", "name")
    .populate("recipients", "fullName registrationNo")
    .sort({ createdAt: -1 })
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  res.json({
    notices,
    page,
    pages: Math.ceil(count / pageSize),
    total: count,
  });
});

// --- NEW FUNCTION ADDED HERE ---
const deleteNotice = asyncHandler(async (req, res) => {
  const notice = await Notice.findById(req.params.id);

  if (notice) {
    await notice.deleteOne();
    res.json({ message: "Notice deleted successfully" });
  } else {
    res.status(404);
    throw new Error("Notice not found");
  }
});

// --- EXPORT BLOCK UPDATED HERE ---
export { sendSingleNotice, sendNoticeToAll, getPreviousNotices, deleteNotice };
