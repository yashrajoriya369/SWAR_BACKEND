const mongoose = require("mongoose");
const crypto = require("crypto");

const emailOTPSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  otp: { type: String, required: true }, // hashed OTP
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

emailOTPSchema.methods.createOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = crypto.createHash("sha256").update(otp).digest("hex");
  this.expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  return otp;
};

module.exports = mongoose.model("EmailOTP", emailOTPSchema);
