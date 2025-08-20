import asyncHandler from "express-async-handler";
import ContributionGroup from "../../models/contributionPlanModel.js";

const createOrUpdateContributionGroup = asyncHandler(async (req, res) => {
  const { _id, employmentType, companies } = req.body;

  if (
    !employmentType ||
    !companies ||
    !Array.isArray(companies) ||
    companies.length === 0
  ) {
    res.status(400);
    throw new Error(
      "Employment type and a non-empty array of companies are required."
    );
  }

  const companiesData = companies.map((company) => ({
    companyName: company.companyName,
    departments: company.departments.map((dept) => ({
      departmentName: dept.departmentName,
      plans: dept.plans.map((plan) => ({
        planDetails: plan.planDetails,
      })),
    })),
  }));

  let group;

  if (_id) {
    group = await ContributionGroup.findById(_id);
    if (!group) {
      res.status(404);
      throw new Error("Contribution group not found for updating.");
    }
    group.employmentType = employmentType;
    group.companies = companiesData;
  } else {
    group = new ContributionGroup({
      employmentType,
      companies: companiesData,
      createdBy: req.user._id,
    });
  }

  const savedGroup = await group.save();
  res.status(_id ? 200 : 201).json(savedGroup);
});

const getAllContributionGroups = asyncHandler(async (req, res) => {
  const groups = await ContributionGroup.find({}).sort({ createdAt: -1 });
  res.json(groups);
});

const getContributionGroupById = asyncHandler(async (req, res) => {
  const group = await ContributionGroup.findById(req.params.id);
  if (group) {
    res.json(group);
  } else {
    res.status(404);
    throw new Error("Contribution Group not found");
  }
});

const deleteContributionGroup = asyncHandler(async (req, res) => {
  const group = await ContributionGroup.findById(req.params.id);
  if (group) {
    await group.deleteOne();
    res.json({ message: "Contribution Group removed successfully" });
  } else {
    res.status(404);
    throw new Error("Contribution Group not found");
  }
});

export {
  createOrUpdateContributionGroup,
  getAllContributionGroups,
  getContributionGroupById,
  deleteContributionGroup,
};
