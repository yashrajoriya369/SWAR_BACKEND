const express = require("express");
const {
  registerUser,
  loginUser,
  logoutUser,
  socialLogin,
} = require("../controllers/authController");
const { protect } = require("../middlewares/authMiddleware");
const router = express.Router();

router.post("/signup", registerUser);
router.post("/login", loginUser);
router.post("/social-login", socialLogin);
router.post("/logout", protect, logoutUser);

module.exports = router;
