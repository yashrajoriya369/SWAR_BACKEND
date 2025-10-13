/**
 * L2-normalize a numeric array (returns new array)
 */
function l2NormalizeArray(arr) {
  const eps = 1e-12;
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    const v = Number(arr[i]) || 0;
    sum += v * v;
  }
  const norm = Math.sqrt(sum) + eps;
  const out = new Array(arr.length);
  for (let i = 0; i < arr.length; i++) {
    out[i] = (Number(arr[i]) || 0) / norm;
  }
  return out;
}

/**
 * Cosine similarity between two numeric arrays (assumes same length)
 */
function cosineSimilarityArrays(a, b) {
  if (!a || !b || a.length !== b.length) return -1;
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  return dot; // since arrays should be L2-normalized, dot is cosine similarity
}

/**
 * Compute average embedding from list of embeddings.
 * Returns null if none available.
 */
function computeAverageEmbedding(listOfEmbeddings) {
  if (!Array.isArray(listOfEmbeddings) || listOfEmbeddings.length === 0)
    return null;
  const n = listOfEmbeddings.length;
  const dim = listOfEmbeddings[0].length;
  const sum = new Array(dim).fill(0);
  for (let i = 0; i < n; i++) {
    const emb = listOfEmbeddings[i] || [];
    for (let j = 0; j < dim; j++) {
      sum[j] += Number(emb[j]) || 0;
    }
  }
  for (let j = 0; j < dim; j++) sum[j] /= n;
  return l2NormalizeArray(sum);
}

module.exports = {
  l2NormalizeArray,
  cosineSimilarityArrays,
  computeAverageEmbedding,
};
