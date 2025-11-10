const User = require("../models/userModel");
const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const sendEmail = require("./emailController");

const forgotPasswordToken = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error("User not found with this email");
  }

  const token = await user.createPasswordResetToken();
  await user.save();

  const resetLink = `https://user-ten-kohl.vercel.app/reset-password/${token}`;
  await sendEmail(user.email, "Reset Your Password", "reset", {
    resetLink,
    userName: user.fullName,
  });
  res.json({ message: "Reset link sent to your email" });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { password, confirmPassword } = req.body;
  const { token } = req.params;

  if (!password || !confirmPassword) {
    return res.status(400).json({ error: "Both fields are required" });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: "Passwords do not match" });
  }
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({ error: "Token expired or invalid" });
  }

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.passwordChangedAt = Date.now();

  await user.save();

  return res
    .status(200)
    .json({ message: "Password has been reset successfully" });
});

const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("password");

  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!(await user.isPasswordMatched(currentPassword))) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: "Passwords do not match" });
  }

  user.password = newPassword;
  user.passwordChangedAt = Date.now();
  await user.save();

  res.status(200).json({ message: "Password changed successfully" });
});

module.exports = { forgotPasswordToken, resetPassword, changePassword };
