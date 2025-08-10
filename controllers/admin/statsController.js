import asyncHandler from "express-async-handler";
// PATHS CORRECTED: Use ../../ to go up two levels (from admin -> controllers -> root)
import Member from "../../models/memberModel.js";
import VisitorDonation from "../../models/visitorDonationModel.js";
import CashDonation from "../../models/cashDonationModel.js";
import Manager from "../../models/managerModel.js";

/**
 * @desc    Get all dashboard statistics in one call
 * @route   GET /api/admin/dashboard-stats
 * @access  Private/Admin
 */
const getDashboardStats = asyncHandler(async (req, res) => {
  // Member Stats
  const totalMembers = await Member.countDocuments();
  const activeMembers = await Member.countDocuments({
    membershipStatus: "Active",
  });
  const newMembers = await Member.countDocuments({
    paymentStatus: "Pending",
    membershipStatus: "Pending",
  });
  const blockedMembers = await Member.countDocuments({
    membershipStatus: "Blocked",
  });

  // Donation Stats (Sums)
  const membershipFeePipeline = await Member.aggregate([
    { $match: { paymentStatus: "Paid" } },
    { $group: { _id: null, total: { $sum: 1 } } },
  ]);
  const membershipFeeTotal =
    membershipFeePipeline.length > 0 ? membershipFeePipeline[0].total : 0;

  const visitorDonationPipeline = await VisitorDonation.aggregate([
    { $match: { status: "SUCCESS" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const visitorDonationTotal =
    visitorDonationPipeline.length > 0 ? visitorDonationPipeline[0].total : 0;

  const cashDonationPipeline = await CashDonation.aggregate([
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const cashDonationTotal =
    cashDonationPipeline.length > 0 ? cashDonationPipeline[0].total : 0;

  // Receipt Stats (Counts)
  const membershipReceipts = await Member.countDocuments({
    paymentStatus: "Paid",
  });
  const visitorDonationReceipts = await VisitorDonation.countDocuments({
    status: "SUCCESS",
  });
  const cashDonationReceipts = await CashDonation.countDocuments();

  // Manager Stats
  const totalManagers = await Manager.countDocuments();
  const blockedManagers = await Manager.countDocuments({ status: "Blocked" });

  res.json({
    members: {
      total: totalMembers,
      active: activeMembers,
      new: newMembers,
      blocked: blockedMembers,
    },
    donations: {
      membershipFee: membershipFeeTotal,
      visitorDonation: visitorDonationTotal,
      cashDonation: cashDonationTotal,
      userDonation: 0, // Placeholder
    },
    receipts: {
      membership: membershipReceipts,
      visitor: visitorDonationReceipts,
      cash: cashDonationReceipts,
      userDonation: 0, // Placeholder
    },
    managers: {
      total: totalManagers,
      blocked: blockedManagers,
    },
  });
});

export { getDashboardStats };
