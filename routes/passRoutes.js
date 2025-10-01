const express = require("express");
const {
  changePassword,
  forgotPasswordToken,
  resetPassword,
} = require("../controllers/passwordCtrl");
const router = express.Router();

router.post("/forgot-password", forgotPasswordToken);
router.post("/reset-password/:token", resetPassword);
router.post("/change-password", changePassword);

module.exports = router;
