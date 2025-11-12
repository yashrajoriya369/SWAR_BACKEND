const express = require("express");
const {
  registerUser,
  loginUser,
  logoutUser,
  check,
} = require("../controllers/authController");
const { protect } = require("../middlewares/authMiddleware");
const router = express.Router();

router.post("/signup", registerUser);
router.post("/login", loginUser);
router.post("/logout", protect, logoutUser);
router.get("/check", check);

module.exports = router;
