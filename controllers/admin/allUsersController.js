import asyncHandler from "express-async-handler";
import Member from "../../models/memberModel.js";

const getAllMembers = asyncHandler(async (req, res) => {
  const pageSize = Number(req.query.limit) || 10;
  const page = Number(req.query.page) || 1;

  const keyword = req.query.keyword
    ? {
        $or: [
          { fullName: { $regex: req.query.keyword, $options: "i" } },
          { email: { $regex: req.query.keyword, $options: "i" } },
          { registrationNo: { $regex: req.query.keyword, $options: "i" } },
          { phone: { $regex: req.query.keyword, $options: "i" } },
        ],
      }
    : {};

  const statusFilter = req.query.status
    ? { membershipStatus: req.query.status }
    : {};
  const finalFilter = { ...keyword, ...statusFilter };

  const count = await Member.countDocuments(finalFilter);
  const members = await Member.find(finalFilter)
    .sort({ createdAt: -1 })
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  res.json({ members, page, pages: Math.ceil(count / pageSize), total: count });
});

const deleteMultipleMembers = asyncHandler(async (req, res) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    res.status(400);
    throw new Error("No member IDs provided for deletion");
  }

  const result = await Member.deleteMany({ _id: { $in: ids } });

  if (result.deletedCount > 0) {
    res.json({
      message: `${result.deletedCount} members deleted successfully.`,
    });
  } else {
    res.status(404);
    throw new Error("No matching members found to delete.");
  }
});

export { getAllMembers, deleteMultipleMembers };
