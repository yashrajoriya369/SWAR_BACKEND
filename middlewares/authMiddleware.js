const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");

const protect = asyncHandler(async (req, res, next) => {
  try {
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
      return res.status(401).json({ error: "nticated" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      console.error("JWT error: ", error.message);
      return res.status(401).json({ error: "Token failed or expired" });
    }

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

module.exports = { protect };
