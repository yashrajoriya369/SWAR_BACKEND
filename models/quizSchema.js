// const mongoose = require("mongoose");

// var questionSchema = new mongoose.Schema(
//   {
//     questionText: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     questionType: {
//       type: String,
//       enum: ["Multiple Choice", "True/False"],
//       required: true,
//     },
//     marks: {
//       type: Number,
//       default: 1,
//       min: 0,
//     },
//     options: {
//       type: [String],
//       validate: {
//         validator: function (v) {
//           // Make sure the question is Multiple Choice and has at least 2 non-empty options
//           return (
//             this.questionType !== "Multiple Choice" ||
//             (Array.isArray(v) &&
//               v.filter((opt) => opt.trim() !== "").length >= 2)
//           );
//         },
//         message:
//           "Multiple choice question must have at least 2 non-empty options.",
//       },
//       required: true,
//     },
//     correctAnswer: {
//       type: String,
//       required: true,
//       validate: {
//         validator: function (value) {
//           if (this.questionType === "Multiple Choice") {
//             return Array.isArray(this.options) && this.options.includes(value);
//           }
//           return true;
//         },
//         message: "Correct answer must be one of the questions.",
//       },
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// var quizSchema = new mongoose.Schema(
//   {
//     subjectId: {
//       type: String,
//       required: true,
//     },
//     quizName: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     attemptType: {
//       type: String,
//       enum: ["Single", "Multiple"],
//       required: true,
//     },
//     startTime: { type: Date, required: true },
//     endTime: {
//       type: Date,
//       required: true,
//     },
//     durationMinutes: { type: Number, required: true, min: 1 },
//     status: {
//       type: String,
//       enum: ["Active", "Draft", "Archived"],
//       default: "Draft",
//     },
//     questions: {
//       type: [questionSchema],
//       validate: {
//         validator: function (arr) {
//           return arr.length > 0;
//         },
//         message: "Quiz must have at least one question.",
//       },
//     },
//     attempts: [
//       {
//         user: {
//           type: mongoose.Schema.Types.ObjectId,
//           ref: "User",
//         },
//         score: Number,
//         completedAt: Date,
//       },
//     ],
//   },
//   {
//     timestamps: true,
//   }
// );

// quizSchema.virtual("runtimeStatus").get(function () {
//   const now = new Date();
//   if (now < this.startTime) return "Upcoming";
//   if (now >= this.startTime && now <= this.endTime) return "Running";
//   return "Ended";
// });

// quizSchema.set("toJSON", { virtuals: true });
// quizSchema.set("toObject", { virtuals: true });

// module.exports = mongoose.model("Quiz", quizSchema);

const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  questionText: { type: String, required: true, trim: true },
  questionType: { type: String, enum: ["Multiple Choice", "True/False"], required: true },
  marks: { type: Number, default: 1, min: 0 },
  options: {
    type: [String],
    validate: {
      validator: function (v) {
        if (this.questionType === "Multiple Choice") {
          return Array.isArray(v) && v.filter(Boolean).length >= 2;
        }
        return true;
      },
      message: "Multiple choice question must have at least 2 non-empty options.",
    },
    required: function () { return this.questionType === "Multiple Choice"; },
  },
  correctAnswer: {
    type: String,
    required: true,
    validate: {
      validator: function (value) {
        if (this.questionType === "Multiple Choice") {
          return Array.isArray(this.options) && this.options.includes(value);
        }
        if (this.questionType === "True/False") {
          return ["True", "False", "true", "false"].includes(String(value));
        }
        return true;
      },
      message: "Correct answer must be valid for the question type.",
    },
  },
}, { timestamps: true });

const quizSchema = new mongoose.Schema({
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true, index: true },
  quizName: { type: String, required: true, trim: true, index: true },
  attemptType: { type: String, enum: ["Single", "Multiple"], required: true },
  startTime: { type: Date, required: true, index: true },
  endTime: { type: Date, required: true },
  durationMinutes: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ["Active", "Draft", "Archived"], default: "Draft", index: true },
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
}, { timestamps: true });

quizSchema.pre("validate", function (next) {
  if (this.endTime && this.startTime && new Date(this.endTime) <= new Date(this.startTime)) {
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

