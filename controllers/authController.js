const User = require("../models/userModel");
const asyncHandler = require("express-async-handler");
// const { generateRefreshToken } = require("../config/refreshToken");
const { generateToken } = require("../config/jwtoken");
const { validateSignup } = require("../validator/authValidator");

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, password } = req.body;

  const { error } = validateSignup({ fullName, email, password });
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  if (!fullName || !email || !password) {
    res.status(400);
    throw new Error("All fields are required");
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({ error: "Email already registered" });
  }

  // Create User
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

// const registerUser = async (req, res) => {
//   try {
//     const { fullName, email, password } = req.body;

//     if (!fullName || !email || !password) {
//       return res.status(400).json({ error: "All fields are required" });
//     }

//     const userExists = await User.findOne({ email });
//     if (userExists) {
//       return res.status(400).json({ error: "Email already registered" });
//     }

//     const user = await User.create({ fullName, email, password });
//     res.status(201).json({
//       message: "User registered successfully",
//       user: {
//         id: user._id,
//         fullName: user.fullName,
//         email: user.email
//       },
//       token: generateToken(user._id),
//     });
//   } catch (err) {
//     res.status(500).json({ error: "Server error", details: err.message });
//   }
// };

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.matchPassword(password))) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    res.json({ message: "Login successful", token: generateToken(user._id) });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Cannot fetch profile", details: err.message });
  }
};
// Create New User
// const createUser = asyncHandler(async (req, res) => {
//   const email = req.body.email;
//   const findUser = await User.findOne({ email: email });
//   if (!findUser) {
//     const newUser = await User.create(req.body);
//     res.json(newUser);
//   } else {
//     throw new Error("User Already Exists");
//   }
// });

// Login user
// const loginUser = asyncHandler(async (req, res) => {
//   const { username, email, mobile, password } = req.body;
//   const findUser = await User.findOne({
//     $or: [{ email }, { username }, { mobile }],
//   });
//   if (findUser && (await findUser.isPasswordMatched(password))) {
//     const refreshToken = await generateRefreshToken(findUser?._id);
//     res.cookie("refreshToken", refreshToken, {
//       httpOnly: true,
//       maxAge: 72 * 60 * 60 * 1000,
//     });

//     res.json({
//       _id: findUser?._id,
//       firstname: findUser?.firstname,
//       lastname: findUser?.lastname,
//       email: findUser?.email,
//       username: findUser?.username,
//       mobile: findUser?.mobile,
//       token: generateToken(findUser?._id),
//     });
//   } else {
//     throw new Error("Invalid Credentials");
//   }
// });

// module.exports = { createUser, loginUser };
module.exports = { registerUser, loginUser, getProfile };
