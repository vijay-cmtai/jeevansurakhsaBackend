// File: controllers/admin/reportController.js

import asyncHandler from "express-async-handler";
import exceljs from "exceljs";
import Member from "../../models/memberModel.js";

/**
 * @desc    Generate and download member data as an Excel report
 * @route   GET /api/reports/download/members
 * @access  Private/Admin
 */
const downloadMemberReport = asyncHandler(async (req, res) => {
  const { type } = req.query; // This will be 'pending' or 'active' from the frontend

  let members;
  let fileName;
  let reportTitle;

  // --- 🚨 CRITICAL FIX HERE 🚨 ---
  // Changed 'new' to 'pending' to match what the frontend is sending.
  if (type === "pending") {
    members = await Member.find({ membershipStatus: "Pending" })
      .sort({ createdAt: -1 })
      .lean(); // .lean() for better performance
    fileName = "new-memberships-report.xlsx";
    reportTitle = "New Memberships Report";
  } else if (type === "active") {
    members = await Member.find({ membershipStatus: "Active" })
      .sort({ createdAt: -1 })
      .lean();
    fileName = "active-members-report.xlsx";
    reportTitle = "Active Members Report";
  } else {
    // If the type is invalid, send a clear error.
    res.status(400).json({
      message: "Invalid report type specified. Use 'pending' or 'active'.",
    });
    return; // Stop execution
  }

  // Check if any members were found BEFORE trying to create the Excel file.
  if (!members || members.length === 0) {
    res.status(404).json({
      message: `No members found for the report type: '${type}'`,
    });
    return;
  }

  // --- Excel File Generation with ALL DETAILS ---
  const workbook = new exceljs.Workbook();
  const worksheet = workbook.addWorksheet(reportTitle);

  // Define comprehensive headers for the report
  worksheet.columns = [
    { header: "Sr.No.", key: "sr", width: 8 },
    { header: "Registration No", key: "registrationNo", width: 20 },
    { header: "Full Name", key: "fullName", width: 30 },
    { header: "Email", key: "email", width: 35 },
    { header: "Phone", key: "phone", width: 20 },
    { header: "Date of Birth", key: "dateOfBirth", width: 18 },
    { header: "State", key: "state", width: 25 },
    { header: "District", key: "district", width: 25 },
    { header: "Full Address", key: "address", width: 50 },
    { header: "Pincode", key: "pincode", width: 15 },
    { header: "PAN Number", key: "panNumber", width: 18 },
    { header: "Volunteer Code", key: "volunteerCode", width: 20 },
    { header: "Nominees", key: "nominees", width: 60 },
    { header: "Employment Type", key: "empType", width: 25 },
    { header: "Company Name", key: "empCompany", width: 30 },
    { header: "Membership Status", key: "membershipStatus", width: 20 },
    { header: "Payment Status", key: "paymentStatus", width: 20 },
    { header: "Registration Date", key: "createdAt", width: 20 },
  ];

  // Style the header row
  worksheet.getRow(1).font = { bold: true };

  // Add data rows
  members.forEach((member, index) => {
    // Helper to format nominees into a readable string
    const nomineesString = (member.nominees || [])
      .map((n) => `${n.name} (${n.relation}, ${n.age}yrs, ${n.percentage}%)`)
      .join("; ");

    worksheet.addRow({
      sr: index + 1,
      registrationNo: member.registrationNo || "N/A",
      fullName: member.fullName,
      email: member.email,
      phone: member.phone,
      dateOfBirth: member.dateOfBirth
        ? new Date(member.dateOfBirth).toLocaleDateString("en-GB")
        : "N/A",
      state: member.state,
      district: member.district,
      address: member.address
        ? `${member.address.houseNumber || ""}, ${member.address.street || ""}, ${member.address.cityVillage || ""}`
            .replace(/^,|,$/g, "")
            .trim()
        : "N/A",
      pincode: member.address?.pincode || "N/A",
      panNumber: member.panNumber || "N/A",
      volunteerCode: member.volunteerCode || "N/A",
      nominees: nomineesString || "N/A",
      empType: member.employment?.type || "N/A",
      empCompany: member.employment?.companyName || "N/A",
      membershipStatus: member.membershipStatus,
      paymentStatus: member.paymentStatus,
      createdAt: new Date(member.createdAt).toLocaleDateString("en-GB"),
    });
  });

  // Set response headers to trigger the download
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

  // Write the workbook to the response stream and end it.
  await workbook.xlsx.write(res);
  res.end();
});

export { downloadMemberReport };
