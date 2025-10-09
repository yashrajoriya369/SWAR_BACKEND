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

module.exports = { registerAdminUser };
