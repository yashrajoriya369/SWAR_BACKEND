const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

var userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
      index: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false,
    },
    passwordChangedAt: Date,
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },

    // OTP
    verifyOTP: { type: String },
    verifyOTPExpires: { type: Date },
    isVerified: { type: Boolean, default: false },

    roles: {
      type: String,
      enum: ["student", "faculty", "superadmin"],
      default: "student",
      index: true,
    },

    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: Date,
    lastLoginat: Date,
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Soft Delete
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },

    // Approval
    isApproved: {
      type: Boolean,
      default: false,
    },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: Date,
    rejectionReason: String,

    // Course
    studentProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Pasword Hasing
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = bcrypt.genSaltSync(10);
  this.password = await bcrypt.hash(this.password, salt);

  // Invoide old JWT after Password change
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// Compare Password
userSchema.methods.isPasswordMatched = async function (enterdPassword) {
  if (!this.password || !enterdPassword) return false;
  return await bcrypt.compare(enterdPassword, this.password);
};

// Check password
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Create password reset token
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

// Generate OTP
userSchema.methods.generateOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  this.verifyOTP = crypto.createHash("sha256").update(otp).digest("hex");
  this.verifyOTPExpires = Date.now() + 10 * 60 * 1000;

  return otp;
};

userSchema.methods.verifyOTPCheck = function (enteredOTP) {
  const hashed = crypto.createHash("sha256").update(enteredOTP).digest("hex");
  return hashed === this.verifyOTP;
};

// Account Lock
userSchema.methods.incrementFailedLogins = async function () {
  this.failedLoginAttempts += 1;

  if (this.failedLoginAttempts >= 5) {
    this.lockUntil = Date.now() + 15 * 60 * 1000; // 15 min
  }

  await this.save();
};

userSchema.methods.resetFailedLogins = async function () {
  this.failedLoginAttempts = 0;
  this.lockUntil = undefined;
  await this.save();
};

userSchema.methods.isLocked = function () {
  return this.lockUntil && this.lockUntil > Date.now();
};

// Soft delete
userSchema.methods.softDelete = async function () {
  this.deletedAt = Date.now();
  await this.save();
};

userSchema.methods.restoreAccount = async function () {
  this.deletedAt = null;
  await this.save();
};

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
