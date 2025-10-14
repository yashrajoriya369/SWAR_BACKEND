const crypto = require("crypto");

async function getEmbeddingFromAudio(buffer, dim = 192) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error("Invalid audio buffer");
  }

  const seed = crypto.createHash("sha1").update(buffer).digest();
  const embedding = new Array(dim);

  for (let i = 0; i < dim; i++) {
    embedding[i] = (seed[i % seed.length] / 255) * 2 - 1;
  }
  return embedding;
}

module.exports = { getEmbeddingFromAudio };
