const axios = require("axios");
const FormData = require("form-data");

// Configuration
const EMBEDDING_SERVICE_URL = process.env.EMBEDDING_SERVICE_URL || "http://localhost:8080";
const EMBEDDING_DIMENSION = 192; // ECAPA-TDNN produces 192-dimensional embeddings
const REQUEST_TIMEOUT = 30000; // 30 seconds

/**
 * Extract voice embedding from audio buffer using SpeechBrain ECAPA-TDNN
 * This sends the audio to a Python microservice that runs the actual model
 * 
 * @param {Buffer} buffer - Audio file buffer (WAV, MP3, FLAC, etc.)
 * @param {Object} options - Optional parameters
 * @returns {Promise<Array<Number>>} - 192-dimensional speaker embedding
 */
async function getEmbeddingFromAudio(buffer, options = {}) {
  try {
    // Validate input
    if (!Buffer.isBuffer(buffer)) {
      throw new Error("Invalid audio buffer: must be a Buffer object");
    }

    if (buffer.length === 0) {
      throw new Error("Empty audio buffer provided");
    }

    // Create form data for multipart upload
    const formData = new FormData();
    formData.append("audio", buffer, {
      filename: "audio.wav",
      contentType: "audio/wav"
    });

    // Optional: Add sample rate if known
    if (options.sampleRate) {
      formData.append("sample_rate", options.sampleRate.toString());
    }

    // Send request to Python microservice
    const response = await axios.post(
      `${EMBEDDING_SERVICE_URL}/api/extract-embedding`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: REQUEST_TIMEOUT,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    // Validate response
    if (!response.data || !response.data.embedding) {
      throw new Error("Invalid response from embedding service");
    }

    const embedding = response.data.embedding;

    // Validate embedding dimensions
    if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSION) {
      throw new Error(
        `Invalid embedding dimension: expected ${EMBEDDING_DIMENSION}, got ${embedding.length}`
      );
    }

    // Validate embedding values
    const hasInvalidValues = embedding.some(v => !isFinite(v) || isNaN(v));
    if (hasInvalidValues) {
      throw new Error("Embedding contains invalid values (NaN or Infinity)");
    }

    return embedding;

  } catch (error) {
    // Handle different error types
    if (error.code === "ECONNREFUSED") {
      throw new Error(
        `Cannot connect to embedding service at ${EMBEDDING_SERVICE_URL}. Please ensure the Python microservice is running.`
      );
    }

    if (error.code === "ETIMEDOUT" || error.message.includes("timeout")) {
      throw new Error(
        "Embedding extraction timed out. The audio file may be too large or the service is overloaded."
      );
    }

    if (error.response) {
      // HTTP error from the service
      const statusCode = error.response.status;
      const errorMessage = error.response.data?.error || error.message;
      throw new Error(
        `Embedding service error (${statusCode}): ${errorMessage}`
      );
    }

    // Re-throw other errors
    throw error;
  }
}

/**
 * Check if embedding service is available
 * @returns {Promise<Boolean>}
 */
async function checkServiceHealth() {
  try {
    const response = await axios.get(
      `${EMBEDDING_SERVICE_URL}/health`,
      { timeout: 5000 }
    );
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

/**
 * Get service information and model details
 * @returns {Promise<Object>}
 */
async function getServiceInfo() {
  try {
    const response = await axios.get(
      `${EMBEDDING_SERVICE_URL}/info`,
      { timeout: 5000 }
    );
    return response.data;
  } catch (error) {
    throw new Error("Failed to get service information: " + error.message);
  }
}

module.exports = { 
  getEmbeddingFromAudio,
  checkServiceHealth,
  getServiceInfo,
  EMBEDDING_DIMENSION
};
