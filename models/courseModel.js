const mongoose = require("mongoose");

var courseSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    enrollmentNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    section: {
      type: String,
      enum: ["A", "B", "C", "D", "E", "F"],
      required: true,
    },

    year: {
      type: Number,
      min: 1,
      max: 4,
      required: true,
    },
    department: {
      type: String,
      enum: [
        "CSE",
        "ECE",
        "ME",
        "CE",
        "EE",
        "IT",
        "AI",
        "DS",
        "BBA",
        "MBA",
        "Other",
      ],
      required: true,
    },
    program: {
      type: String,
      enum: ["B.Tech", "M.Tech", "BBA", "MBA","MCA", "Diploma", "Other"],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

//Export the model
module.exports = mongoose.model("Course", courseSchema);
