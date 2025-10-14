// voice-service/voice/voiceMethods.js

function attachVoiceMethods(userSchema) {
  const MAX_ENROLL_SAMPLES = 3;

  // Add voice embedding
  userSchema.methods.addVoiceEmbedding = async function (
    embedding,
    phrase = null,
    audioUrl = null,
    consentGiven = false
  ) {
    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error("Invalid embedding");
    }

    this.voiceProfile = this.voiceProfile || {};
    this.voiceProfile.embeddings = this.voiceProfile.embeddings || [];

    if (this.voiceProfile.embeddings.length >= MAX_ENROLL_SAMPLES) {
      throw new Error(`Maximum enrollment samples reached (${MAX_ENROLL_SAMPLES})`);
    }

    this.voiceProfile.embeddings.push(embedding);

    if (phrase) {
      this.voiceProfile.enrollmentPhrases = this.voiceProfile.enrollmentPhrases || [];
      this.voiceProfile.enrollmentPhrases.push(phrase);
    }

    if (audioUrl) {
      this.voiceProfile.audioUrls = this.voiceProfile.audioUrls || [];
      this.voiceProfile.audioUrls.push(audioUrl);
    }

    if (consentGiven && !this.voiceProfile.consentGiven) {
      this.voiceProfile.consentGiven = true;
      this.voiceProfile.consentAt = new Date();
    }

    this.voiceProfile.lastEnrolledAt = new Date();
    this.voiceProfile.averagedEmbedding = computeAverageEmbedding(this.voiceProfile.embeddings);
    this.voiceProfile.enrollmentComplete = this.voiceProfile.embeddings.length >= MAX_ENROLL_SAMPLES;

    await this.save();
    return this.voiceProfile;
  };

  // Compute average embedding manually
  userSchema.methods.computeAverageEmbedding = async function () {
    this.voiceProfile = this.voiceProfile || {};
    const avg = computeAverageEmbedding(this.voiceProfile.embeddings || []);
    this.voiceProfile.averagedEmbedding = avg;
    await this.save();
    return avg;
  };

  // Verify voice
  userSchema.methods.verifyVoiceEmbedding = async function (embedding, options = {}) {
    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error("Invalid embedding for verification");
    }

    this.voiceProfile = this.voiceProfile || {};
    const storedEmbeddings = this.voiceProfile.embeddings || [];
    if (storedEmbeddings.length === 0) {
      return { verified: false, score: 0, bestIndex: null, reason: "no-enrollment" };
    }

    const method = options.method || "max";
    const threshold =
      typeof options.threshold === "number"
        ? options.threshold
        : this.voiceProfile.verificationThreshold || 0.75;

    const normEmbedding = l2NormalizeArray(embedding);
    let bestScore = -Infinity;
    let bestIndex = null;

    if (method === "avg" && Array.isArray(this.voiceProfile.averagedEmbedding) && this.voiceProfile.averagedEmbedding.length > 0) {
      bestScore = cosineSimilarityArrays(normEmbedding, l2NormalizeArray(this.voiceProfile.averagedEmbedding));
      bestIndex = null;
    } else {
      for (let i = 0; i < storedEmbeddings.length; i++) {
        const s = storedEmbeddings[i];
        if (!Array.isArray(s) || s.length === 0) continue;
        const score = cosineSimilarityArrays(normEmbedding, l2NormalizeArray(s));
        if (score > bestScore) {
          bestScore = score;
          bestIndex = i;
        }
      }
    }

    const verified = bestScore >= threshold;

    this.voiceProfile.verificationHistory = this.voiceProfile.verificationHistory || [];
    this.voiceProfile.verificationHistory.push({
      at: new Date(),
      score: bestScore,
      passed: verified,
    });
    if (this.voiceProfile.verificationHistory.length > 50) {
      this.voiceProfile.verificationHistory = this.voiceProfile.verificationHistory.slice(-50);
    }

    this.voiceProfile.lastVerifiedAt = new Date();
    await this.save();

    return { verified, score: bestScore, bestIndex, threshold };
  };

  // Clear voice profile
  userSchema.methods.clearVoiceProfile = async function () {
    const keep = {
      method: this.voiceProfile?.method || "speechbrain-ecapa",
      verificationThreshold: this.voiceProfile?.verificationThreshold || 0.75,
    };

    this.voiceProfile = {
      method: keep.method,
      embeddings: [],
      averagedEmbedding: null,
      enrollmentPhrases: [],
      audioUrls: [],
      lastEnrolledAt: null,
      verificationThreshold: keep.verificationThreshold,
      verificationHistory: [],
      consentGiven: false,
      consentAt: null,
      notes: "cleared",
      enrollmentComplete: false,
    };

    await this.save();
    return this.voiceProfile;
  };
}

// --- Utils ---

function l2NormalizeArray(arr) {
  const eps = 1e-12;
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    const v = Number(arr[i]) || 0;
    sum += v * v;
  }
  const norm = Math.sqrt(sum) + eps;
  return arr.map((v) => (Number(v) || 0) / norm);
}

function cosineSimilarityArrays(a, b) {
  if (!a || !b || a.length !== b.length) return -1;
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  return dot;
}

function computeAverageEmbedding(listOfEmbeddings) {
  if (!Array.isArray(listOfEmbeddings) || listOfEmbeddings.length === 0) return null;
  const n = listOfEmbeddings.length;
  const dim = listOfEmbeddings[0].length;
  const sum = new Array(dim).fill(0);
  for (let i = 0; i < n; i++) {
    const emb = listOfEmbeddings[i] || [];
    for (let j = 0; j < dim; j++) sum[j] += Number(emb[j]) || 0;
  }
  for (let j = 0; j < dim; j++) sum[j] /= n;
  return l2NormalizeArray(sum);
}

module.exports = attachVoiceMethods;
