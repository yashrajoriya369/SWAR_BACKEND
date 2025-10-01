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
    options: {
      type: [String],
      validate: {
        validator: function (v) {
          // Make sure the question is Multiple Choice and has at least 2 non-empty options
          return (
            this.questionType !== "Multiple Choice" ||
            (Array.isArray(v) &&
              v.filter((opt) => opt.trim() !== "").length >= 2)
          );
        },
        message:
          "Multiple choice question must have at least 2 non-empty options.",
      },
      required: true,
    },
    correctAnswer: {
      type: String,
      required: true,
      validate: {
        validator: function (value) {
          if (this.questionType === "Multiple Choice") {
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
      // validate: {
      //   validator: function (value) {
      //     return value > this.startTime;
      //   },
      //   message: "End time must be after start time.",
      // },
    },
    durationMinutes: { type: Number, require: true, min: 1 },
    status: {
      type: String,
      enum: ["Active", "Draft", "Archived"],
      default: "Draft",
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

quizSchema.virtual("runtimeStatus").
  get(function () {
    const now = new Date();
    if (now < this.startTime) return "Upcoming";
    if (now >= this.startTime && now <= this.endTime) return "Running";
    return "Ended";
  });

quizSchema.set("toJSON", { virtuals: true });
quizSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Quiz", quizSchema);
