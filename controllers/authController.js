const User = require("../models/userModel");
const asyncHandler = require("express-async-handler");
// const { generateRefreshToken } = require("../config/refreshToken");
const { generateToken } = require("../config/jwtoken");
const { validateSignup } = require("../validator/authValidator");

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, password, confirmPassword } = req.body;

  const { error } = validateSignup({ fullName, email, password });
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: "Passwords do not match" });
  }

  if (!fullName || !email || !password) {
    res.status(400);
    throw new Error("All fields are required");
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({ error: "Email already registered" });
  }

  const user = await User.create({ fullName, email, password });
  const token = generateToken(user._id);
  res.cookie("token", token),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 3600000,
    };
  res.status(201).json({
    message: "User registered successfully",
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
    },
    token,
  });
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const isMatch = await user.isPasswordMatched(password);
  if (!isMatch) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = generateToken(user._id);
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 3600000,
  });

  res.status(200).json({
    message: "Login Successfully",
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
    },
    token,
  });
});

module.exports = { registerUser, loginUser };
