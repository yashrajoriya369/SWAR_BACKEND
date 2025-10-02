const { required, types } = require("joi");
const mongoose = require("mongoose");

var quizAttemptSchema = new mongoose.Schema({
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
  // optionally store answers for replay/analytics:
  // answers: [{ questionIndex: Number, answer: String, timeSpentMs: Number }]
});

// Optional compound index - speeds up queries by quiz+user
quizAttemptSchema.index({ quizId: 1, userId: 1 });

//Export the model
module.exports = mongoose.model("Attempt", quizAttemptSchema);
