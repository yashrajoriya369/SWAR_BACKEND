const mongoose = require("mongoose");

const VerificationHistorySchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    score: Number,
    passed: Boolean,
    ip: String,
    note: String,
  },
  { _id: false }
);

const voiceProfileSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      default: "speechbrain-ecapa",
    },
    embeddings: {
      type: [[Number]],
      default: [],
    },
    averagedEmbedding: {
      type: [Number],
      default: null,
    },
    enrollmentPhrases: {
      type: [String],
      default: [],
    },
    audioUrls: {
      type: [String],
      default: [],
    },
    lastEnrolledAt: Date,
    verificationThreshold: {
      type: Number,
      default: 0.75,
    },
    verificationHistory: {
      type: [VerificationHistorySchema],
      default: [],
    },
    consentGiven: {
      type: Boolean,
      default: false,
    },
    consentAt: Date,
    notes: String,
  },
  {
    _id: false,
  }
);

module.exports = voiceProfileSchema;
