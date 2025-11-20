// controllers/adminController.js
const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");

const registerAdminUser = asyncHandler(async (req, res) => {
  const { fullName, email, password, confirmPassword, roles } = req.body;

  // Only one superadmin allowed
  if (roles === "superadmin") {
    const existing = await User.findOne({ roles: "superadmin" });
    if (existing) {
      return res.status(403).json({ error: "A superadmin already exists" });
    }
  }

  if (!["faculty", "superadmin"].includes(roles)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  if (password !== confirmPassword)
    return res.status(400).json({ error: "Passwords do not match" });

  const userExists = await User.findOne({ email });
  if (userExists)
    return res.status(400).json({ error: "Email already registered" });

  const user = await User.create({
    fullName,
    email,
    password,
    roles,
    isVerified: true,
  });

  res
    .status(201)
    .json({ message: `${roles} created successfully`, userId: user._id });
});

const listPendingFaculty = asyncHandler(async (req, res) => {
  const pending = await User.find({
    roles: "faculty",
    isApproved: false,
  }).select("-password");

  res.status(200).json({ pending });
});

const approvedFaculty = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const faculty = await User.findById(id);
  if (!faculty) {
    return res.status(404).json({ error: "Faculty not found" });
  }
  if (faculty.roles !== "faculty") {
    return res.status(400).json({ error: "User is not a faculty" });
  }

  faculty.isApproved = true;
  faculty.approvalStatus = "approved";
  faculty.approvedBy = req.user._id;
  faculty.approvedAt = new Date();
  faculty.rejectionReason = undefined;
  await faculty.save();

  res.status(200).json({ message: "Faculty approved", userId: faculty._id });
});

const rejectFaculty = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const { reason } = req.body;

  const faculty = await User.findById(id);

  if (!faculty) {
    return res.status(404).json({ error: "Faculty not found" });
  }

  if (faculty.roles !== "faculty") {
    return res.status(400).json({ error: "User is not a faculty" });
  }

  faculty.isApproved = false;
  faculty.approvalStatus = "rejected"; // IMPORTANT
  faculty.rejectionReason = reason || "No reason provided";
  faculty.approvedBy = req.user._id;
  faculty.approvedAt = new Date();

  await faculty.save();

  res.status(200).json({
    message: "Faculty request rejected",
    userId: faculty._id,
    status: faculty.approvalStatus,
    reason: faculty.rejectionReason,
  });
});

module.exports = {
  registerAdminUser,
  listPendingFaculty,
  approvedFaculty,
  rejectFaculty,
};
