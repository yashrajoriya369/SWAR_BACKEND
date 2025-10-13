const {
  l2NormalizeArray,
  cosineSimilarityArrays,
  computeAverageEmbedding,
} = require("./voiceUtils");

function attachVoiceMethods(userSchema) {
  userSchema.methods.addVoiceEmbedding = async function (
    embedding /* Array<Number> */,
    phrase = null,
    audioUrl = null
  ) {
    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error("Invalid embedding array");
    }

    // push raw embedding
    this.voiceProfile.embeddings = this.voiceProfile.embeddings || [];
    this.voiceProfile.embeddings.push(embedding);

    if (phrase) {
      this.voiceProfile.enrollmentPhrases =
        this.voiceProfile.enrollmentPhrases || [];
      this.voiceProfile.enrollmentPhrases.push(phrase);
    }

    if (audioUrl) {
      this.voiceProfile.audioUrls = this.voiceProfile.audioUrls || [];
      this.voiceProfile.audioUrls.push(audioUrl);
    }

    this.voiceProfile.lastEnrolledAt = new Date();
    // recompute averaged embedding for faster compare
    this.voiceProfile.averagedEmbedding = computeAverageEmbedding(
      this.voiceProfile.embeddings
    );

    await this.save();
    return this.voiceProfile;
  };

  /**
   * Compute and set averaged embedding from stored embeddings.
   * Call when you want to recalc (e.g., after deletions).
   */
  userSchema.methods.computeAverageEmbedding = async function () {
    const avg = computeAverageEmbedding(this.voiceProfile.embeddings || []);
    this.voiceProfile.averagedEmbedding = avg;
    await this.save();
    return avg;
  };

  /**
   * Verify a provided embedding against stored profile.
   * - embedding: Array<Number>
   * - options: { method: 'max'|'avg', threshold: Number (override per-user default) }
   *
   * Returns: { verified: Boolean, score: Number, bestIndex: Number|null }
   */
  userSchema.methods.verifyVoiceEmbedding = async function (
    embedding /* Array<Number> */,
    options = {}
  ) {
    const method = options.method || "max"; // 'max' compares against each enrolled embedding, 'avg' compares against averagedEmbedding
    const threshold =
      typeof options.threshold === "number"
        ? options.threshold
        : this.voiceProfile.verificationThreshold || 0.75;

    const storedEmbeddings = this.voiceProfile.embeddings || [];
    if (!storedEmbeddings || storedEmbeddings.length === 0) {
      return {
        verified: false,
        score: 0,
        bestIndex: null,
        reason: "no-enrollment",
      };
    }

    if (!Array.isArray(embedding) || embedding.length === 0) {
      return {
        verified: false,
        score: 0,
        bestIndex: null,
        reason: "invalid-embedding",
      };
    }

    // normalize input embedding
    const normEmbedding = l2NormalizeArray(embedding);

    let bestScore = -Infinity;
    let bestIndex = null;

    if (
      method === "avg" &&
      Array.isArray(this.voiceProfile.averagedEmbedding) &&
      this.voiceProfile.averagedEmbedding.length > 0
    ) {
      const avg = l2NormalizeArray(this.voiceProfile.averagedEmbedding);
      bestScore = cosineSimilarityArrays(normEmbedding, avg);
      bestIndex = null;
    } else {
      // compare against each stored embedding
      for (let i = 0; i < storedEmbeddings.length; i++) {
        const s = storedEmbeddings[i];
        if (!Array.isArray(s) || s.length === 0) continue;
        const score = cosineSimilarityArrays(
          normEmbedding,
          l2NormalizeArray(s)
        );
        if (score > bestScore) {
          bestScore = score;
          bestIndex = i;
        }
      }
    }

    const verified = bestScore >= threshold;

    // log verification attempt
    this.voiceProfile.verificationHistory =
      this.voiceProfile.verificationHistory || [];
    this.voiceProfile.verificationHistory.push({
      at: new Date(),
      score: bestScore,
      passed: Boolean(verified),
    });

    // cap history length (e.g., keep last 50 attempts)
    if (this.voiceProfile.verificationHistory.length > 50) {
      this.voiceProfile.verificationHistory =
        this.voiceProfile.verificationHistory.slice(-50);
    }

    await this.save();

    return { verified, score: bestScore, bestIndex };
  };

  /**
   * Clear voice profile (useful for GDPR / user deletion requests).
   */
  userSchema.methods.clearVoiceProfile = async function () {
    this.voiceProfile = {
      method: this.voiceProfile?.method || "speechbrain-ecapa",
      embeddings: [],
      averagedEmbedding: null,
      enrollmentPhrases: [],
      audioUrls: [],
      lastEnrolledAt: null,
      verificationThreshold: this.voiceProfile?.verificationThreshold || 0.75,
      verificationHistory: [],
      consentGiven: false,
      consentAt: null,
      notes: "cleared",
    };
    await this.save();
    return this.voiceProfile;
  };
}

module.exports = attachVoiceMethods;
