import asyncHandler from "express-async-handler";
import ContributionGroup from "../../models/contributionPlanModel.js";

/**
 * @desc    Create a new contribution group or update an existing one.
 *          This function handles nested arrays of companies, departments, and plans.
 * @route   POST /api/contribution-plans
 * @access  Private/Admin
 */
const createOrUpdateContributionGroup = asyncHandler(async (req, res) => {
  // Data ab is naye structure mein aayega
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

  // Group ko dhoondhein ya naya banayein
  let group = await ContributionGroup.findOne({ employmentType });
  if (!group) {
    group = new ContributionGroup({
      employmentType,
      createdBy: req.user._id, // Assumes user is available from 'protect' middleware
      companies: [],
    });
  }

  // Har company ke liye loop
  for (const incomingCompany of companies) {
    if (
      !incomingCompany.companyName ||
      typeof incomingCompany.companyName !== "string" ||
      incomingCompany.companyName.trim() === ""
    )
      continue;

    // Group ke andar company ko dhoondhein
    let company = group.companies.find(
      (c) => c.companyName === incomingCompany.companyName.trim()
    );

    // Agar company nahi milti to nayi banayein
    if (!company) {
      const newCompanyData = {
        companyName: incomingCompany.companyName.trim(),
        departments: [],
      };
      group.companies.push(newCompanyData);
      company = group.companies[group.companies.length - 1]; // Nayi company ka reference lein
    }

    // Har department ke liye loop
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

        // Company ke andar department ko dhoondhein
        let department = company.departments.find(
          (d) => d.departmentName === incomingDept.departmentName.trim()
        );

        // Agar department nahi milta to naya banayein
        if (!department) {
          const newDeptData = {
            departmentName: incomingDept.departmentName.trim(),
            plans: [],
          };
          company.departments.push(newDeptData);
          department = company.departments[company.departments.length - 1]; // Naye department ka reference lein
        }

        // Har plan ke liye loop
        if (incomingDept.plans && Array.isArray(incomingDept.plans)) {
          for (const incomingPlan of incomingDept.plans) {
            if (
              incomingPlan &&
              typeof incomingPlan === "string" &&
              incomingPlan.trim() !== "" &&
              !department.plans.some(
                (p) => p.planDetails === incomingPlan.trim()
              )
            ) {
              department.plans.push({ planDetails: incomingPlan.trim() });
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
  createOrUpdateContributionGroup, // Hum ab is naye function ko export karenge
  getAllContributionGroups,
  getContributionGroupById,
  deleteContributionGroup,
};
