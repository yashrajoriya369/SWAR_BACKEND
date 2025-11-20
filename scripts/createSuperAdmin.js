require("dotenv").config({ path: "../.env" });
const mongoose = require("mongoose");
const User = require("../models/userModel");

const connectDB = async () => {
  try {
    console.log("MongoDB URL:", process.env.MONGODB_URL);
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
};

// Create superadmin
const createSuperAdmin = async () => {
  try {
    const existing = await User.findOne({ roles: "superadmin" });
    if (existing) {
      console.log("Superadmin already exists:", existing.email);
      return process.exit(0);
    }

    const superAdmin = await User.create({
      fullName: "Super Admin",
      email: "superadmin@example.com",
      password: "SuperAdmin123!",
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
