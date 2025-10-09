const User = require("../models/userModel");
const asyncHandler = require("express-async-handler");
const { generateToken } = require("../config/jwtoken");
const { setTokenCookie, clearTokenCookie } = require("../utils/cookies");
const crypto = require("crypto");
const sendEmail = require("./emailController");
const { registerSchema } = require("../utils/validationSchema");
const EmailOTP = require("../models/emailModel");

const registerUser = asyncHandler(async (req, res) => {
  const { error } = registerSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { fullName, email, password, confirmPassword } = req.body;

  if (password !== confirmPassword)
    return res.status(400).json({ error: "Passwords do not match" });

  // Check if user already exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({ error: "Email already registered" });
  }

  // Ensure OTP is verified
  const emailOTP = await EmailOTP.findOne({ email });
  if (!emailOTP) return res.status(400).json({ error: "Email not verified" });

  // Create user
  const user = await User.create({
    fullName,
    email,
    password,
    roles: "student",
    isVerified: true,
  });

  // Delete OTP record
  await EmailOTP.deleteOne({ email });

  await sendEmail(user.email, "Welcome to PrepMaster 🎉", "notification", {
    title: `Welcome, ${user.fullName}!`,
    message:
      "Your account has been successfully created. Start exploring your dashboard now.",
    buttonText: "Go to Dashboard",
    buttonLink: "https://user-gold-omega.vercel.app",
  });

  res
    .status(201)
    .json({ message: "Registration successful. You can now log in." });
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.isPasswordMatched(password))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  if (!user.isVerified) {
    return res
      .status(403)
      .json({ error: "Please verify your email using OTP before logging in." });
  }

  const token = generateToken(user);
  setTokenCookie(res, token);

  res.status(200).json({
    message: "Login Successfully",
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      roles: user.roles,
    },
  });
});

const logoutUser = asyncHandler(async (req, res) => {
  clearTokenCookie(res);
  res.status(200).json({ message: "Logged out successfully" });
});

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
};
