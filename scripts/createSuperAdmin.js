require("dotenv").config({ quiet: true })
const mongoose = require("mongoose");
const User = require("../models/userModel");

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
};

// Create superadmin only if none exists
const createSuperAdmin = async () => {
  try {
    const existing = await User.findOne({ roles: "superadmin" });
    if (existing) {
      console.log("Superadmin already exists:", existing.email);
      return process.exit(0); // Exit without creating another
    }

    const superAdmin = await User.create({
      fullName: "Super Admin",
      email: "superadmin@example.com",
      password: "SuperAdmin123!", // Change to a strong password
      roles: "superadmin",
      isVerified: true,
    });

    console.log("Superadmin created successfully:", superAdmin.email);
    process.exit(0);
  } catch (err) {
    console.error("Error creating superadmin:", err);
    process.exit(1);
  }
};

const run = async () => {
  await connectDB();
  await createSuperAdmin();
};

run();
