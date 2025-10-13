const mongoose = require("mongoose")

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
    // store multiple enrollment embeddings (arrays of numbers)
    embeddings: {
      type: [[Number]],
      default: [],
    },
    // optional cached averaged embedding (computed from embeddings)
    averagedEmbedding: {
      type: [Number],
      default: null,
    },
    // phrases used during enrollment (for audit)
    enrollmentPhrases: {
      type: [String],
      default: [],
    },
    // optional URLs for raw audio clips (if you choose to store them)
    audioUrls: {
      type: [String],
      default: [],
    },
    // when the profile was last enrolled / updated
    lastEnrolledAt: Date,
    // threshold for verification (0..1). Default recommended 0.75
    verificationThreshold: {
      type: Number,
      default: 0.75,
    },
    // verification attempts log
    verificationHistory: {
      type: [VerificationHistorySchema],
      default: [],
    },
    // whether user gave explicit consent to store biometric voice data
    consentGiven: {
      type: Boolean,
      default: false,
    },
    consentAt: Date,
    // small note field for admin or audit
    notes: String,
  },
  {
    _id: false,
  }
);

module.exports = voiceProfileSchema;
