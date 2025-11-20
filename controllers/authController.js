const User = require("../models/userModel");
const asyncHandler = require("express-async-handler");
const { generateToken } = require("../config/jwtoken");
const { setTokenCookie, clearTokenCookie } = require("../utils/cookies");
const crypto = require("crypto");
const sendEmail = require("./emailController");
const { registerSchema } = require("../utils/validationSchema");
const EmailOTP = require("../models/emailModel");
const jwt = require("jsonwebtoken");
const FacultyInvite = require("../models/facultyInviteModel");

const registerUser = asyncHandler(async (req, res) => {
  const { error } = registerSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { fullName, email, password, confirmPassword, roles } = req.body;

  if (password !== confirmPassword)
    return res.status(400).json({ error: "Passwords do not match" });

  if (req.body.roles === "superadmin") {
    return res
      .status(403)
      .json({ error: "You cannot create a superadmin account." });
  }

  // Check if user already exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({ error: "Email already registered" });
  }

  // Ensure OTP is verified
  const emailOTP = await EmailOTP.findOne({ email });
  if (!emailOTP) return res.status(400).json({ error: "Email not verified" });

  const userRole = roles === "faculty" ? "faculty" : "student";

  const isFaculty = userRole === "faculty";
  // Create user
  const user = await User.create({
    fullName,
    email,
    password,
    roles: userRole,
    isVerified: true,
    isApproved: isFaculty ? false : true,
  });

  // Delete OTP record
  await EmailOTP.deleteOne({ email });

  await sendEmail(user.email, "Welcome to SYNRX", "notification", {
    title: `Welcome, ${user.fullName}!`,
    message:
      "Your account has been successfully created. Start exploring your dashboard now.",
    buttonText: "Go to Dashboard",
    buttonLink: "https://user-ten-kohl.vercel.app",
  });

  return res.status(201).json({
    message: isFaculty
      ? "Signed up - waiting for admin approval."
      : "Registration successful. You can now log in.",
  });
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password, role } = req.body;

  const user = await User.findOne({ email }).select(
    "+password +isApproved +roles +isVerified"
  );

  // Check Credentials
  if (!user || !(await user.isPasswordMatched(password))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  // Verify Email
  if (!user.isVerified) {
    return res
      .status(403)
      .json({ error: "Please verify your email using OTP before logging in." });
  }

   // Faculty Approval Check
  if (user.roles === "faculty" && !user.isApproved) {
    return res.status(403).json({
      error:
        "Your account is not approved yet. Please wait for admin approval.",
    });
  }

  // // Role Validation
  if (role && user.roles !== role) {
    return res.status(403).json({
      error: `Access denied. This account is registered as a ${user.roles}, not a ${role}`,
    });
  }

  // // Generate Token
  const token = generateToken(user);
  setTokenCookie(res, token);

  res.status(200).json({
    message: "Login Successfully",
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      roles: user.roles,
      isApproved: user.isApproved,
    },
  });
});

const logoutUser = asyncHandler(async (req, res) => {
  clearTokenCookie(res);
  res.status(200).json({ message: "Logged out successfully" });
});

const checkCurrentUser = asyncHandler(async (req, res) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ loggedIn: false });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select(
      "-password -voiceProfile"
    );

    if (!user) return res.status(401).json({ loggedIn: false });

    res.json({
      loggedIn: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        roles: user.roles,
        isApproved: user.isApproved,
      },
    });
  } catch (error) {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
    res.status(401).json({ loggedIn: false });
  }
});

const fetchAllUsers = asyncHandler(async (req, res) => {
  try {
    const users = await User.find({ roles: "student" }).select(
      "-passwordChangedAt -failedLoginAttempts -isApproved -createdAt -updatedAt"
    );
    res.status(200).json({
      success: true,
      total: users.length,
      users,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

const sendFacultyInvite = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ error: "Email is required" });

  await FacultyInvite.deleteMany({ email });

  const inviteToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

  await FacultyInvite.create({
    email,
    inviteToken,
    expiresAt,
  });

  const registrationLink = `http://localhost:5173/faculty/register/${inviteToken}`;

  await sendEmail(email, "Faculty Registration Invitation", "notification", {
    title: "Faculty Invitation",
    message:
      "You have been invited to register as faculty. This link will expire in 24 hours.",
    buttonText: "Register Now",
    buttonLink: registrationLink,
  });

  return res.status(200).json({ message: "Invitation sent successfully" });
});

const registerFaculty = asyncHandler(async (req, res) => {
  const { fullName, email, password, confirmPassword } = req.body;

  if (!fullName || !email || !password || !confirmPassword) {
    return res.status(400).json({ error: "All fields are required" });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: "Passwords do not match" });
  }

  const superAdminExists = await User.findOne({ email, roles: "superadmin" });
  if (superAdminExists)
    return res.status(403).json({ error: "Cannot create a superadmin" });

  const emailExists = await User.findOne({ email });
  if (emailExists)
    return res.status(400).json({ error: "Email already registered" });

  const emailOTP = await EmailOTP.findOne({ email });
  if (!emailOTP)
    return res.status(400).json({ error: "Email not verified using OTP" });
  const faculty = await User.create({
    fullName,
    email,
    password,
    roles: "faculty",
    isVerified: true,
    isApproved: false,
  });

  await EmailOTP.deleteOne({ email });

  await sendEmail(faculty.email, "Faculty Account Created", "notification", {
    title: `Welcome, ${faculty.fullName}!`,
    message:
      "Your faculty account has been created. Please wait for admin approval before logging in.",
    buttonText: "Visit Website",
    buttonLink: "https://yourwebsite.com",
  });

  return res.status(201).json({
    message: "Faculty account created. Pending admin approval.",
    facultyId: faculty._id,
  });
});

const completeFacultyRegistration = asyncHandler(async (req, res) => {
  const { inviteToken, fullName, password, confirmPassword } = req.body;

  if (!inviteToken)
    return res.status(400).json({ error: "Invalid or missing token" });

  // Check invite
  const invite = await FacultyInvite.findOne({ inviteToken });

  if (!invite) return res.status(400).json({ error: "Invalid invite token" });

  if (invite.isUsed)
    return res
      .status(400)
      .json({ error: "This invitation has already been used" });

  if (invite.expiresAt < Date.now())
    return res
      .status(400)
      .json({ error: "Invitation expired. Please contact admin." });

  if (password !== confirmPassword)
    return res.status(400).json({ error: "Passwords do not match" });

  // Create faculty
  const user = await User.create({
    fullName,
    email: invite.email,
    password,
    roles: "faculty",
    isVerified: true,
    isApproved: false, // Admin will approve later
  });

  invite.isUsed = true;
  await invite.save();

  return res.status(201).json({
    message: "Registration complete. Waiting for admin approval.",
  });
});

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  checkCurrentUser,
  fetchAllUsers,
  sendFacultyInvite,
  registerFaculty,
  completeFacultyRegistration,
};
