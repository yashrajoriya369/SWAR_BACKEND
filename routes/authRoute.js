const express = require("express");
const {
  registerUser,
  loginUser,
} = require("../controllers/authController");
const router = express.Router();
// const { protect } = require("../middlewares/authMiddleware");


router.post("/signup", registerUser);
router.post("/login", loginUser);

module.exports = router;
