import asyncHandler from "express-async-handler";
import ContributionGroup from "../../models/contributionPlanModel.js";


const createOrUpdateContributionGroup = asyncHandler(async (req, res) => {
  const { employmentType, companies } = req.body;

  // --- Validation ---
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

  // Find the group by employmentType or create a new one
  let group = await ContributionGroup.findOne({ employmentType });
  if (!group) {
    group = new ContributionGroup({
      employmentType,
      createdBy: req.user._id, // Assumes user is available from 'protect' middleware
      companies: [],
    });
  }

  // Loop through each company from the request
  for (const incomingCompany of companies) {
    if (
      !incomingCompany.companyName ||
      typeof incomingCompany.companyName !== "string" ||
      incomingCompany.companyName.trim() === ""
    )
      continue;

    // Find the company within the group
    let company = group.companies.find(
      (c) => c.companyName === incomingCompany.companyName.trim()
    );

    // If company doesn't exist, create it
    if (!company) {
      const newCompanyData = {
        companyName: incomingCompany.companyName.trim(),
        departments: [],
      };
      group.companies.push(newCompanyData);
      company = group.companies[group.companies.length - 1];
    }

    // Loop through each department for the current company
    if (
      incomingCompany.departments &&
      Array.isArray(incomingCompany.departments)
    ) {
      for (const incomingDept of incomingCompany.departments) {
        if (
          !incomingDept.departmentName ||
          typeof incomingDept.departmentName !== "string" ||
          incomingDept.departmentName.trim() === ""
        )
          continue;

        // Find the department within the company
        let department = company.departments.find(
          (d) => d.departmentName === incomingDept.departmentName.trim()
        );

        // If department doesn't exist, create it
        if (!department) {
          const newDeptData = {
            departmentName: incomingDept.departmentName.trim(),
            plans: [],
          };
          company.departments.push(newDeptData);
          department = company.departments[company.departments.length - 1];
        }
        // The logic is updated to handle an array of objects: [{ planDetails: "..." }]
        if (incomingDept.plans && Array.isArray(incomingDept.plans)) {
          for (const incomingPlanObject of incomingDept.plans) {
            // 1. Check if it's a valid object with a 'planDetails' string property
            if (
              incomingPlanObject &&
              typeof incomingPlanObject === "object" &&
              typeof incomingPlanObject.planDetails === "string" &&
              incomingPlanObject.planDetails.trim() !== ""
            ) {
              const planDetailString = incomingPlanObject.planDetails.trim();

              // 2. Check if this plan already exists to avoid duplicates
              if (
                !department.plans.some(
                  (p) => p.planDetails === planDetailString
                )
              ) {
                // 3. Push the entire object { planDetails: "..." }
                department.plans.push({ planDetails: planDetailString });
              }
            }
          }
        }
       
      }
    }
  }

  const updatedGroup = await group.save();
  res.status(201).json(updatedGroup);
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
