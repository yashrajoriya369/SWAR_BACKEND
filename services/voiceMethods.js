// voice-service/voice/voiceMethods.js
// Updated version with improvements

function attachVoiceMethods(userSchema) {
  const MAX_ENROLL_SAMPLES = 5; // Increased from 3 for better robustness

  /**
   * Add voice embedding during enrollment
   * @param {Array<Number>} embedding - 192-dimensional ECAPA-TDNN embedding
   * @param {String} phrase - Optional enrollment phrase
   * @param {String} audioUrl - Optional audio URL
   * @param {Boolean} consentGiven - User consent for biometric data
   */
  userSchema.methods.addVoiceEmbedding = async function (
    embedding,
    phrase = null,
    audioUrl = null,
    consentGiven = false
  ) {
    // Validate embedding
    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error("Invalid embedding: must be a non-empty array");
    }

    // Validate embedding dimensions (ECAPA-TDNN produces 192-dim embeddings)
    if (embedding.length !== 192) {
      throw new Error(
        `Invalid embedding dimension: expected 192, got ${embedding.length}`
      );
    }

    // Check for invalid values (NaN, Infinity)
    const hasInvalidValues = embedding.some((v) => !isFinite(v) || isNaN(v));
    if (hasInvalidValues) {
      throw new Error("Invalid embedding: contains NaN or Infinity values");
    }

    // Initialize voice profile if needed
    this.voiceProfile = this.voiceProfile || {};
    this.voiceProfile.embeddings = this.voiceProfile.embeddings || [];
    this.voiceProfile.enrollmentPhrases =
      this.voiceProfile.enrollmentPhrases || [];
    this.voiceProfile.audioUrls = this.voiceProfile.audioUrls || [];

    // Check maximum enrollment limit
    if (this.voiceProfile.embeddings.length >= MAX_ENROLL_SAMPLES) {
      throw new Error(
        `Maximum enrollment samples reached (${MAX_ENROLL_SAMPLES})`
      );
    }

    // Normalize embedding before storing
    const normalizedEmbedding = l2NormalizeArray(embedding);

    this.voiceProfile.embeddings.push(normalizedEmbedding);

    if (phrase) {
      this.voiceProfile.enrollmentPhrases.push(phrase);
    }

    if (audioUrl) {
      this.voiceProfile.audioUrls.push(audioUrl);
    }

    // Handle consent
    if (consentGiven && !this.voiceProfile.consentGiven) {
      this.voiceProfile.consentGiven = true;
      this.voiceProfile.consentAt = new Date();
    }

    // Update enrollment timestamp
    this.voiceProfile.lastEnrolledAt = new Date();

    // Automatically compute averaged embedding
    this.voiceProfile.averagedEmbedding = computeAverageEmbedding(
      this.voiceProfile.embeddings
    );

    return {
      success: true,
      enrollmentCount: this.voiceProfile.embeddings.length,
      maxSamples: MAX_ENROLL_SAMPLES,
      message: `Successfully enrolled sample ${this.voiceProfile.embeddings.length}/${MAX_ENROLL_SAMPLES}`,
    };
  };

  /**
   * Verify voice against enrolled profile
   * @param {Array<Number>} embedding - 192-dimensional embedding to verify
   * @param {Object} options - Verification options
   * @returns {Object} Verification result with score and decision
   */
  userSchema.methods.verifyVoiceEmbedding = async function (
    embedding,
    options = {}
  ) {
    const {
      method = "avg", // Changed default from "max" to "avg" for better performance
      threshold = this.voiceProfile?.verificationThreshold || 0.75,
      ip = null,
      note = null,
    } = options;

    // Validate embedding
    if (!Array.isArray(embedding) || embedding.length !== 192) {
      throw new Error("Invalid embedding for verification");
    }

    // Check if embeddings exist
    if (
      !this.voiceProfile ||
      !this.voiceProfile.embeddings ||
      this.voiceProfile.embeddings.length === 0
    ) {
      throw new Error("No voice profile enrolled for this user");
    }

    // Check consent
    if (!this.voiceProfile.consentGiven) {
      throw new Error("User consent not given for voice verification");
    }

    // Normalize the incoming embedding
    const normalizedEmbedding = l2NormalizeArray(embedding);

    let bestScore = -1;
    let bestIndex = -1;

    // Method 1: Compare against averaged embedding (recommended)
    if (method === "avg" && this.voiceProfile.averagedEmbedding) {
      bestScore = cosineSimilarityArrays(
        normalizedEmbedding,
        this.voiceProfile.averagedEmbedding
      );
      bestIndex = -1; // Indicates averaged embedding was used
    }
    // Method 2: Compare against all embeddings and take maximum
    else if (method === "max") {
      for (let i = 0; i < this.voiceProfile.embeddings.length; i++) {
        const score = cosineSimilarityArrays(
          normalizedEmbedding,
          this.voiceProfile.embeddings[i]
        );

        if (score > bestScore) {
          bestScore = score;
          bestIndex = i;
        }

        // Early stopping for near-perfect match
        if (score >= 0.99) {
          break;
        }
      }
    } else {
      throw new Error(
        `Invalid verification method: ${method}. Use 'avg' or 'max'`
      );
    }

    // Make verification decision
    const verified = bestScore >= threshold;

    // Record verification attempt in history
    this.voiceProfile.verificationHistory =
      this.voiceProfile.verificationHistory || [];
    this.voiceProfile.verificationHistory.push({
      at: new Date(),
      score: bestScore,
      passed: verified,
      method: method,
      threshold: threshold,
      matchedIndex: bestIndex,
      ip: ip,
      note: note,
    });

    // Keep only last 100 verification attempts to prevent unbounded growth
    if (this.voiceProfile.verificationHistory.length > 100) {
      this.voiceProfile.verificationHistory =
        this.voiceProfile.verificationHistory.slice(-100);
    }

    return {
      verified,
      score: bestScore,
      threshold,
      method,
      confidence: (bestScore * 100).toFixed(2) + "%",
      matchedSampleIndex: bestIndex >= 0 ? bestIndex : "averaged",
    };
  };

  /**
   * Manually recompute averaged embedding
   */
  userSchema.methods.computeAverageEmbedding = function () {
    if (
      !this.voiceProfile ||
      !this.voiceProfile.embeddings ||
      this.voiceProfile.embeddings.length === 0
    ) {
      throw new Error("No embeddings to average");
    }

    this.voiceProfile.averagedEmbedding = computeAverageEmbedding(
      this.voiceProfile.embeddings
    );

    return {
      success: true,
      samplesAveraged: this.voiceProfile.embeddings.length,
    };
  };

  /**
   * Clear voice profile (for re-enrollment)
   */
  userSchema.methods.clearVoiceProfile = function () {
    const consentGiven = this.voiceProfile?.consentGiven;
    const consentAt = this.voiceProfile?.consentAt;
    const threshold = this.voiceProfile?.verificationThreshold || 0.75;

    this.voiceProfile = {
      method: "speechbrain-ecapa",
      embeddings: [],
      averagedEmbedding: null,
      enrollmentPhrases: [],
      audioUrls: [],
      lastEnrolledAt: null,
      verificationThreshold: threshold,
      verificationHistory: [],
      consentGiven: consentGiven || false,
      consentAt: consentAt || null,
      notes: "",
    };

    return { success: true, message: "Voice profile cleared" };
  };

  /**
   * Get verification statistics
   */
  userSchema.methods.getVerificationStats = function () {
    if (!this.voiceProfile || !this.voiceProfile.verificationHistory) {
      return {
        totalAttempts: 0,
        successfulAttempts: 0,
        failedAttempts: 0,
        successRate: 0,
        averageScore: 0,
      };
    }

    const history = this.voiceProfile.verificationHistory;
    const successful = history.filter((h) => h.passed).length;
    const total = history.length;
    const avgScore =
      total > 0 ? history.reduce((sum, h) => sum + h.score, 0) / total : 0;

    return {
      totalAttempts: total,
      successfulAttempts: successful,
      failedAttempts: total - successful,
      successRate:
        total > 0 ? ((successful / total) * 100).toFixed(2) + "%" : "0%",
      averageScore: avgScore.toFixed(4),
      lastAttempt: total > 0 ? history[history.length - 1].at : null,
    };
  };
}

// ============ UTILITY FUNCTIONS ============

/**
 * L2 normalize an array (convert to unit length)
 * Essential for accurate cosine similarity computation
 */
function l2NormalizeArray(arr) {
  if (!Array.isArray(arr) || arr.length === 0) {
    throw new Error("Invalid array for L2 normalization");
  }

  const epsilon = 1e-12; // Prevent division by zero
  const sumSquares = arr.reduce((acc, val) => acc + val * val, 0);
  const norm = Math.sqrt(sumSquares) + epsilon;

  return arr.map((val) => val / norm);
}

/**
 * Compute cosine similarity between two normalized arrays
 * For L2-normalized vectors, this is simply the dot product
 */
function cosineSimilarityArrays(a, b) {
  if (!a || !b || a.length !== b.length || a.length === 0) {
    throw new Error(
      "Invalid vectors for cosine similarity: arrays must have same non-zero length"
    );
  }

  // For L2-normalized vectors, cosine similarity = dot product
  let dotProduct = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
  }

  // Clamp to [-1, 1] to handle floating point errors
  return Math.max(-1, Math.min(1, dotProduct));
}

/**
 * Compute average embedding from multiple embeddings
 * Each embedding is already L2-normalized
 */
function computeAverageEmbedding(embeddings) {
  if (!Array.isArray(embeddings) || embeddings.length === 0) {
    throw new Error("Cannot average empty embeddings array");
  }

  const dim = embeddings[0].length;
  const avg = new Array(dim).fill(0);

  // Sum all embeddings element-wise
  for (let i = 0; i < embeddings.length; i++) {
    for (let j = 0; j < dim; j++) {
      avg[j] += embeddings[i][j];
    }
  }

  // Average and normalize
  for (let j = 0; j < dim; j++) {
    avg[j] /= embeddings.length;
  }

  // L2 normalize the averaged embedding
  return l2NormalizeArray(avg);
}

module.exports = { attachVoiceMethods };