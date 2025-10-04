const User = require("../models/userModel");
const asyncHandler = require("express-async-handler");
const { generateToken } = require("../config/jwtoken");
const { setTokenCookie, clearTokenCookie } = require("../utils/cookies");
const crypto = require("crypto");
const sendEmail = require("./emailController");
const { registerSchema } = require("../utils/validationSchema");
const EmailOTP = require("../models/emailModel");
const admin = require("../firebase/firebaseAdmin");

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

  const token = generateToken(user._id);
  setTokenCookie(res, token);
  console.log("Login headers: ", res.getHeader());

  res.status(200).json({
    message: "Login Successfully",
    token,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
    },
  });
});

const socialLogin = asyncHandler(async (req, res) => {
  try {
    const idToken =
      req.headers.authorization?.split(" ")[1] || req.body.idToken;
    if (!idToken) return res.status(400).json({ error: "Token required" });

    // Verify Firebase ID token
    const decoded = await admin.auth().verifyIdToken(idToken);

    let user = await User.findOne({ email: decoded.email });

    if (!user) {
      // Create user with random password
      user = await User.create({
        fullName: decoded.name,
        email: decoded.email,
        password: crypto.randomBytes(16).toString("hex"),
        isVerified: true,
        avatar: decoded.picture,
        authProvider: decoded.firebase.sign_in_provider,
      });
    }

    const jwt = generateToken(user._id);
    setTokenCookie(res, jwt);

    res.status(200).json({
      message: "Login successful",
      token: jwt,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        provider: user.authProvider,
      },
    });
  } catch (err) {
    console.error("Social Login Error:", err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

const logoutUser = asyncHandler(async (req, res) => {
  clearTokenCookie(res);
  res.status(200).json({ message: "Logged out successfully" });
});

module.exports = {
  registerUser,
  loginUser,
  socialLogin,
  logoutUser,
};
