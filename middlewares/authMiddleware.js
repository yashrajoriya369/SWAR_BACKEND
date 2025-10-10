const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ error: "User no longer exists" });

    if (user.passwordChangedAt) {
      const changedTimestamp = parseInt(
        user.passwordChangedAt.getTime() / 1000,
        10
      );
      if (decoded.iat < changedTimestamp) {
        return res.status(401).json({
          error: "Password changed recently. Please login again.",
        });
      }
    }
    req.user = user;
    next();
  } catch (error) {
    console.error("Protect Middleware error: ", error);
    return res.status(401).json({ error: "Token failed or expired" });
  }
});

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });

    // If user has multiple roles (array) or single role (string)
    const userRoles = Array.isArray(req.user.roles)
      ? req.user.roles
      : [req.user.roles];

    const hasAccess = userRoles.some((role) => allowedRoles.includes(role));
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    next();
  };
};

const requireApprovedFaculty = asyncHandler(async (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  if (req.user.roles !== "faculty")
    return res
      .status(403)
      .json({ error: "Only faculty can perform this action" });
  // refresh user from DB to ensure up-to-date isApproved (optional)
  const User = require("../models/userModel");
  const user = await User.findById(req.user._id).select("isApproved roles");
  if (!user) return res.status(401).json({ error: "User not found" });
  if (!user.isApproved)
    return res.status(403).json({ error: "Account pending approval" });
  next();
});

module.exports = { protect, authorizeRoles, requireApprovedFaculty };
