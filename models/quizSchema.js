const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    questionText: { type: String, required: true, trim: true },
    questionType: {
      type: String,
      enum: ["Multiple Choice", "Checkbox"],
      required: true,
    },
    marks: { type: Number, default: 1, min: 0 },
    options: {
      type: [{ type: String, trim: true }],
      validate: {
        validator: function (v) {
          if (["Multiple Choice", "Checkbox"].includes(this.questionType)) {
            return (
              Array.isArray(v) &&
              v.filter((s) => typeof s === "string" && s.trim() !== "")
                .length >= 2
            );
          }
          return true;
        },
        message:
          "Questions must have at least 2 non-empty options for Multiple Choice or Checkbox.",
      },
      required: function () {
        return ["Multiple Choice", "Checkbox"].includes(this.questionType);
      },
    },
    correctAnswer: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      validate: {
        validator: function (value) {
          if (this.questionType === "Multiple Choice") {
            return (
              typeof value === "string" &&
              Array.isArray(this.options) &&
              this.options.includes(value)
            );
          }

          if (this.questionType === "Checkbox") {
            return (
              Array.isArray(value) &&
              value.length > 0 &&
              value.every((v) => this.options.includes(v))
            );
          }

          return true;
        },
        message:
          "Correct answer(s) must be valid and match available options for this question type.",
      },
    },
  },
  { timestamps: true }
);

const quizSchema = new mongoose.Schema(
  {
    // subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true, index: true },
    subjectId: { type: String, required: true, index: true }, // if you have Subject collection, switch to ObjectId ref
    quizName: { type: String, required: true, trim: true, index: true },
    attemptType: {
      type: String,
      enum: ["Single", "Multiple"],
      required: true,
      default: "Single",
    },
    maxAttemptsPerUser: {
      type: Number,
      min: 1,
    },
    startTime: { type: Date, required: true, index: true },
    endTime: { type: Date, required: true },
    durationMinutes: { type: Number, required: true, min: 1 },
    questions: {
      type: [questionSchema],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "Quiz must have at least one question.",
      },
      required: true,
    },
    attemptCount: { type: Number, default: 0 },
    completedCount: { type: Number, default: 0 },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    shuffleQuestions: { type: Boolean, default: false },
    shuffleOptions: { type: Boolean, default: false },
    visibility: {
      type: String,
      enum: ["public", "private", "group"],
      default: "private",
    },
    targetGroups: [{ type: String }],
    notes: { type: String },
  },
  { timestamps: true }
);
quizSchema.pre("validate", function (next) {
  if (!this.facultyId && this.createdBy) {
    this.facultyId = this.createdBy;
  }

  if (
    this.endTime &&
    this.startTime &&
    new Date(this.endTime) <= new Date(this.startTime)
  ) {
    return next(new Error("endTime must be after startTime"));
  }
  if (this.attemptType === "Single") {
    this.maxAttemptsPerUser = 1;
  } else {
    if (this.maxAttemptsPerUser === 0) {
      this.maxAttemptsPerUser = undefined;
    }
  }

  next();
});

quizSchema.virtual("runtimeStatus").get(function () {
  const now = new Date();
  if (now < this.startTime) return "Upcoming";
  if (now >= this.startTime && now <= this.endTime) return "Running";
  return "Ended";
});

quizSchema.methods.isOpen = function () {
  const now = new Date();
  return now >= this.startTime && now <= this.endTime;
};

quizSchema.methods.isAssignedTo = function (userId) {
  if (!this.assignedTo || this.assignedTo.length === 0) return true;
  return this.assignedTo.some((id) => id.toString() === userId.toString());
};

quizSchema.index({ createdBy: 1, startTime: 1 });
quizSchema.index({ quizName: "text" });
quizSchema.index({ quizName: 1, facultyId: 1 }, { unique: true });

module.exports = mongoose.model("Quiz", quizSchema);
