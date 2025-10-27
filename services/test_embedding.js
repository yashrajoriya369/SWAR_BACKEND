const axios = require("axios");
const fs = require("fs");
const cosineSim = require("compute-cosine-similarity");
const FormData = require("form-data");

// Path to your audio files
const referenceAudioPath = "C:\\Users\\yashr\\OneDrive\\Desktop\\Recording (3).m4a";
const verifyAudioPath = "C:\\Users\\yashr\\OneDrive\\Desktop\\Recording (3).m4a"; // same or different clip

// In-memory user object to store embedding
const user = {
  voiceEmbedding: null
};

// Function to get embedding from your Flask embedding service
async function getEmbedding(audioPath) {
  const formData = new FormData();
  formData.append("audio", fs.createReadStream(audioPath));

  const response = await axios.post(
    "http://127.0.0.1:5001/api/extract-embedding",
    formData,
    { headers: formData.getHeaders() }
  );

  if (!response.data.success) {
    throw new Error(`Embedding service error: ${response.data.message}`);
  }

  return response.data.embedding;
}

// Store reference embedding
async function storeReferenceEmbedding() {
  const embedding = await getEmbedding(referenceAudioPath);
  console.log("Reference embedding length:", embedding.length);

  user.voiceEmbedding = embedding; // store for later verification
  console.log("Reference embedding stored successfully!");
}

// Verify new audio against stored embedding
async function verifyAudio() {
  if (!user.voiceEmbedding) {
    throw new Error("No reference embedding stored for this user.");
  }

  const currentEmbedding = await getEmbedding(verifyAudioPath);
  console.log("Current embedding length:", currentEmbedding.length);

  if (user.voiceEmbedding.length !== currentEmbedding.length) {
    throw new Error("Embedding length mismatch.");
  }

  const score = cosineSim(user.voiceEmbedding, currentEmbedding);
  const threshold = 0.75;

  console.log({
    success: true,
    verified: score >= threshold,
    score: score,
    threshold: threshold,
    confidence: `${(score * 100).toFixed(2)}%`
  });
}

// Run the flow
(async () => {
  try {
    await storeReferenceEmbedding();
    await verifyAudio();
  } catch (err) {
    console.error("Error:", err.message);
  }
})();
