// utils/vector_utils.js
// Vector operations for embeddings

/**
 * Calculate cosine similarity between two vectors
 * Returns value between -1 and 1, where 1 = identical
 */
export const cosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
};

/**
 * Calculate average of multiple vectors
 * Used for combining user activity vectors into interest vector
 */
export const averageVectors = (vectors) => {
  if (!vectors || vectors.length === 0) {
    return null;
  }

  const validVectors = vectors.filter((v) => v && Array.isArray(v));
  if (validVectors.length === 0) {
    return null;
  }

  const dimensions = validVectors[0].length;
  const result = new Array(dimensions).fill(0);

  for (const vector of validVectors) {
    for (let i = 0; i < dimensions; i++) {
      result[i] += vector[i];
    }
  }

  for (let i = 0; i < dimensions; i++) {
    result[i] /= validVectors.length;
  }

  return result;
};

/**
 * Calculate weighted average of vectors
 * Weights: { upvote: 2, save: 2, comment: 1, downvote: -0.5 }
 */
export const weightedAverageVectors = (activitiesWithVectors, weights = {}) => {
  const defaultWeights = {
    upvote: 2,
    save: 2,
    comment: 1,
    downvote: -0.5,
  };

  const finalWeights = { ...defaultWeights, ...weights };

  if (!activitiesWithVectors || activitiesWithVectors.length === 0) {
    return null;
  }

  const validActivities = activitiesWithVectors.filter(
    (a) => a.embedding && Array.isArray(a.embedding),
  );

  if (validActivities.length === 0) {
    return null;
  }

  const dimensions = validActivities[0].embedding.length;
  const result = new Array(dimensions).fill(0);
  let totalWeight = 0;

  for (const activity of validActivities) {
    const weight = finalWeights[activity.action_type] || 0;
    totalWeight += Math.abs(weight);

    for (let i = 0; i < dimensions; i++) {
      result[i] += activity.embedding[i] * weight;
    }
  }

  if (totalWeight === 0) {
    return null;
  }

  for (let i = 0; i < dimensions; i++) {
    result[i] /= totalWeight;
  }

  return result;
};

/**
 * Normalize a vector (make magnitude = 1)
 */
export const normalizeVector = (vector) => {
  if (!vector || !Array.isArray(vector)) {
    return null;
  }

  let magnitude = 0;
  for (const val of vector) {
    magnitude += val * val;
  }
  magnitude = Math.sqrt(magnitude);

  if (magnitude === 0) {
    return null;
  }

  return vector.map((v) => v / magnitude);
};

/**
 * Convert vector to buffer for storage (if needed)
 */
export const vectorToBuffer = (vector) => {
  if (!vector || !Array.isArray(vector)) {
    return null;
  }
  return Buffer.from(Float32Array.from(vector));
};

/**
 * Convert buffer back to vector
 */
export const bufferToVector = (buffer) => {
  if (!buffer) {
    return null;
  }
  return Array.from(new Float32Array(buffer));
};
