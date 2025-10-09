const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    selected: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    timeSpentMs: {
      type: Number,
      default: 0,
    },
    isCorrect: {
      type: Boolean,
      default: false,
    },
    marksObtained: {
      type: Number,
      default: 0,
    },
  },
  {
    _id: false,
  }
);

var quizAttemptSchema = new mongoose.Schema(
  {
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    score: {
      type: Number,
      default: 0,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    finishedAt: Date,
    userAgent: String,
    ip: String,
    answers: {
      type: [answerSchema],
      default: [],
    },
    autoGraded: {
      type: Boolean,
      default: true,
    },
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    gradedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Optional compound index - speeds up queries by quiz+user
quizAttemptSchema.index({ quizId: 1, userId: 1 }, { unique: true });
quizAttemptSchema.index({ completed: 1 });
quizAttemptSchema.index({ gradedBy: 1 });
//Export the model
module.exports = mongoose.model("Attempt", quizAttemptSchema);
