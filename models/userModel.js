const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

var userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
    },
    password: {
      type: String,
    },
    passwordChangedAt: Date,
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },
    isVerified: { type: Boolean, default: false },
    verifyOTP: { type: String },
    verifyOTPExpires: { type: Date },

    roles: { type: String, enum: ["user", "admin"], default: "user" },

    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: Date,
  },
  {
    timestamps: true,
  }
);

// Hash Pasword
userSchema.pre("save", async function (next) {
  if (!this.password) return next();
  if (!this.isModified("password")) return next();

  const salt = bcrypt.genSaltSync(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare Password
userSchema.methods.isPasswordMatched = async function (enterdPassword) {
  return await bcrypt.compare(enterdPassword, this.password);
};

//
userSchema.methods.createPasswordResetToken = async function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

module.exports = mongoose.model("User", userSchema);
