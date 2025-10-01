const sendEmail = require("../controllers/emailController");
const EmailOTP = require("../models/emailModel");
const User = require("../models/userModel");
const asyncHandler = require("express-async-handler");
const crypto = require("crypto");

const requestOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Check Email exists or not
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ error: "email already registered" });
  }

  // Create OTP
  let emailOTP = await EmailOTP.findOne({ email });
  if (!emailOTP) emailOTP = new EmailOTP({ email });

  const otp = emailOTP.createOTP();
  await emailOTP.save();

  // Send OTP
  await sendEmail(email, "Verify your email", "otp", { otp });
  res.status(200).json({ message: "otp sent" });
});

const verifyEmailOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const emailOTP = await EmailOTP.findOne({ email });
  if (!emailOTP)
    return res.status(400).json({ error: "opt not found. request again." });

  if (emailOTP.expiresAt < Date.now())
    return res.status(400).json({ error: "OTP expired" });

  const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");
  if (hashedOTP !== emailOTP.otp)
    return res.status(400).json({ error: "Invalid OTP" });
  res.status(200).json({ message: "email is verified" });
});

const resendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;

  let emailOTP = await EmailOTP.findOne({ email });

  if (!emailOTP) {
    return res.status(400).json({ error: "resend otp failed" });
  }

  const otp = emailOTP.createOTP();
  await emailOTP.save();

  await sendEmail(email, "Resend OTP", "otp", { otp });

  res.status(200).json({ message: "otp resend successfully" });
});

module.exports = { requestOTP, verifyEmailOTP, resendOTP };
