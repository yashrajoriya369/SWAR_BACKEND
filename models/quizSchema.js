const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    questionText: { type: String, required: true, trim: true },
    questionType: {
      type: String,
      enum: ["Multiple Choice", "True/False"],
      required: true,
    },
    marks: { type: Number, default: 1, min: 0 },
    options: {
      type: [{ type: String, trim: true }],
      validate: {
        validator: function (v) {
          if (this.questionType === "Multiple Choice") {
            return (
              Array.isArray(v) &&
              v.filter((s) => typeof s === "string" && s.trim() !== "")
                .length >= 2
            );
          }
          return true;
        },
        message:
          "Multiple choice question must have at least 2 non-empty options.",
      },
      required: function () {
        return this.questionType === "Multiple Choice";
      },
    },
    correctAnswer: {
      type: String,
      required: true,
      validate: {
        validator: function (value) {
          if (this.questionType === "Multiple Choice") {
            return (
              Array.isArray(this.options) &&
              this.options.includes(String(value))
            );
          }
          if (this.questionType === "True/False") {
            const v = String(value).toLowerCase();
            return ["true", "false"].includes(v) || typeof value === "boolean";
          }
          return true;
        },
        message: "Correct answer must be valid for the question type.",
      },
    },
  },
  { timestamps: true }
);

const quizSchema = new mongoose.Schema(
  {
    // subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true, index: true },
    subjectId: { type: String, required: true, index: true },
    quizName: { type: String, required: true, trim: true, index: true },
    attemptType: { type: String, enum: ["Single", "Multiple"], required: true },
    startTime: { type: Date, required: true, index: true },
    endTime: { type: Date, required: true },
    durationMinutes: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ["Active", "Draft", "Archived"],
      default: "Draft",
      index: true,
    },
    questions: {
      type: [questionSchema],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "Quiz must have at least one question.",
      },
    },
    // optional summary fields:
    attemptCount: { type: Number, default: 0 },
    completedCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

quizSchema.pre("validate", function (next) {
  if (
    this.endTime &&
    this.startTime &&
    new Date(this.endTime) <= new Date(this.startTime)
  ) {
    return next(new Error("endTime must be after startTime"));
  }
  next();
});

quizSchema.virtual("runtimeStatus").get(function () {
  const now = new Date();
  if (now < this.startTime) return "Upcoming";
  if (now >= this.startTime && now <= this.endTime) return "Running";
  return "Ended";
});

module.exports = mongoose.model("Quiz", quizSchema);
