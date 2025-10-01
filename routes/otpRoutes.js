const express = require("express");
const {
  requestOTP,
  verifyEmailOTP,
  resendOTP,
} = require("../controllers/otpCtrl");
const router = express.Router();

router.post("/verify-otp", verifyEmailOTP);
router.post("/request-otp", requestOTP);
router.post("/resend-otp", resendOTP);

module.exports = router;
