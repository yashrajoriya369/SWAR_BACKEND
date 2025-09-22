const { required } = require("joi");
const mongoose = require("mongoose"); // Erase if already required

var questionSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      required: true,
    },
    questionType: {
      type: String,
      enum: ["Multiple Choice", "True/False"],
      require: true,
    },
    marks: {
      type: Number,
      default: 1,
    },
    options: [{
      type: String,
      required: true,
    }],
    correctAnswer: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Declare the Schema of the Mongo model
var quizSchema = new mongoose.Schema(
  {
    subjectId: {
      type: String,
      required: true,
    },
    quizName: {
      type: String,
      required: true,
    },
    attemptType: {
      type: String,
      enum: ["Single", "Multiple"],
      required: true,
    },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    durationMintutes: { type: Number, require: true },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Completed"],
      default: "Inactive",
    },
    questions: [questionSchema],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Quiz", quizSchema);
