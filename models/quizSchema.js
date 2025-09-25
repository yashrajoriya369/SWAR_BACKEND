const mongoose = require("mongoose");

var questionSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      required: true,
      trim: true,
    },
    questionType: {
      type: String,
      enum: ["Multiple Choice", "True/False"],
      required: true,
    },
    marks: {
      type: Number,
      default: 1,
      min: 0,
    },
    options: [
      {
        type: String,
        required: function () {
          return this.questionType === "Multiple Choice";
        },
        validate: {
          validator: function (arr) {
            return this.questionType === "Multiple Choice"
              ? arr.length >= 2
              : true;
          },
          message: "Multiple choice question must have at least 2 options.",
        },
      },
    ],
    correctAnswer: {
      type: String,
      required: true,
      validate: {
        validator: function (value) {
      if (this.questionType === "Multiple Choice") {
        console.log("Options:", this.options);
        console.log("Correct Answer:", value);
        return Array.isArray(this.options) && this.options.includes(value);
      }
      return true;
    },
        message: "Correct answer must be one of the questions.",
      },
    },
  },
  {
    timestamps: true,
  }
);

var quizSchema = new mongoose.Schema(
  {
    subjectId: {
      type: String,
      required: true,
    },
    quizName: {
      type: String,
      required: true,
      trim: true,
    },
    attemptType: {
      type: String,
      enum: ["Single", "Multiple"],
      required: true,
    },
    startTime: { type: Date, required: true },
    endTime: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return value > this.startTime;
        },
        message: "End time must be after start time.",
      },
    },
    durationMintutes: { type: Number, require: true, min: 1 },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Completed"],
      default: "Inactive",
    },
    questions: {
      type: [questionSchema],
      validate: {
        validator: function (arr) {
          return arr.length > 0;
        },
        message: "Quiz must have at least one question.",
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Quiz", quizSchema);
