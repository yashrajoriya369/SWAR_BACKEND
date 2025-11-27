const User = require("../models/userModel");
const EmailOTP = require("../models/emailModel");
const Course = require("../models/courseModel");
const FacultyInvite = require("../models/facultyInviteModel");
const sendEmail = require("./emailController");
const asyncHandler = require("express-async-handler");
const { generateToken } = require("../config/jwtoken");
const { setTokenCookie, clearTokenCookie } = require("../utils/cookies");
const crypto = require("crypto");
const { registerSchema } = require("../utils/validationSchema");
const jwt = require("jsonwebtoken");

// Register User
const registerUser = asyncHandler(async (req, res) => {
  const { error } = registerSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const { fullName, email, password, confirmPassword, roles } = req.body;

  if (password !== confirmPassword)
    return res.status(400).json({ error: "Passwords do not match" });

  if (req.body.roles === "superadmin") {
    return res
      .status(403)
      .json({ error: "You cannot create a superadmin account." });
  }

  const userExists = await User.findOne({ email });
  if (userExists)
    return res.status(400).json({ error: "Email already registered" });

  const emailOTP = await EmailOTP.findOne({ email });
  if (!emailOTP) return res.status(400).json({ error: "Email not verified" });

  const userRole = roles === "faculty" ? "faculty" : "student";
  const isFaculty = userRole === "faculty";

  const user = await User.create({
    fullName,
    email,
    password,
    roles: userRole,
    isVerified: true,
    isApproved: isFaculty ? false : true,
  });

  await EmailOTP.deleteOne({ email });

  await sendEmail(user.email, "Welcome to SYNRX", "notification", {
    title: `Welcome, ${user.fullName}!`,
    message:
      "Your account has been successfully created. Start exploring your dashboard now.",
    buttonText: "Go to Dashboard",
    buttonLink: "https://superproject-chi.vercel.app",
  });

  return res.status(201).json({
    message: isFaculty
      ? "Signed up - waiting for admin approval."
      : "Registration successful. You can now log in.",
    userId: user._id,
    profileCompleted: false,
  });
});

// Login User
const loginUser = asyncHandler(async (req, res) => {
  const { email, password, role } = req.body;

  const user = await User.findOne({ email }).select(
    "+password +isApproved +roles +isVerified +studentProfile"
  );

  if (!user || !(await user.isPasswordMatched(password)))
    return res.status(401).json({ error: "Invalid email or password" });

  if (!user.isVerified)
    return res
      .status(403)
      .json({ error: "Please verify your email using OTP before logging in." });

  if (user.roles === "faculty" && !user.isApproved)
    return res.status(403).json({
      error:
        "Your account is not approved yet. Please wait for admin approval.",
    });

  if (role && user.roles !== role)
    return res.status(403).json({ error: `Access denied for role ${role}` });

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
      profileCompleted: !!user.studentProfile,
    },
  });
});

// Logout User
const logoutUser = asyncHandler(async (req, res) => {
  clearTokenCookie(res);
  res.status(200).json({ message: "Logged out successfully" });
});

// Check Current User
const checkCurrentUser = asyncHandler(async (req, res) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ loggedIn: false });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) return res.status(401).json({ loggedIn: false });

    res.json({
      loggedIn: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        roles: user.roles,
        isApproved: user.isApproved,
        profileCompleted: !user.studentProfile,
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

// Fetch all Students
const fetchAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ roles: "student" }).select(
    "-passwordChangedAt -failedLoginAttempts -isApproved -createdAt -updatedAt"
  );
  res.status(200).json({
    success: true,
    total: users.length,
    users,
  });
});

// Complete Student Profile
const completeStudentProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { enrollmentNumber, section, year, department, program } = req.body;

  let student = await Course.findOne({ user: userId });

  if (student) {
    student.enrollmentNumber = enrollmentNumber;
    student.section = section;
    student.year = year;
    student.department = department;
    student.program = program;

    await student.save();
  } else {
    student = await Course.create({
      user: userId,
      enrollmentNumber,
      section,
      year,
      department,
      program,
    });
  }

  await User.findByIdAndUpdate(userId, { studentProfile: student._id });

  res.status(201).json({ message: "Profile completed successfully" }, student);
});

// Send Invite
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

// Register Faculty
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

// Approve Invite
const completeFacultyRegistration = asyncHandler(async (req, res) => {
  const { inviteToken, fullName, password, confirmPassword } = req.body;

  if (!inviteToken)
    return res.status(400).json({ error: "Invalid or missing token" });

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
  completeStudentProfile,
};
