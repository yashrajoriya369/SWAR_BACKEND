const express = require("express");
// const { createUser, loginUser } = require("../controllers/authController");
const {
  registerUser,
  loginUser,
  getProfile,
} = require("../controllers/authController");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");

// router.post("/register", createUser);
// router.post("/login", loginUser);

router.post("/signup", registerUser);
router.post("/login", loginUser);
router.get("/profile", protect, getProfile);

module.exports = router;
