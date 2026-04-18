// utils/embedding_service.js
// Service for generating and managing embeddings
//
// CURRENT APPROACH: Deterministic hash-based embeddings for MVP
// These maintain consistency but lack semantic similarity benefits.
// TODO: Integrate with OpenAI or Google Vertex AI embeddings in production.

import crypto from "crypto";

/**
 * Generate a deterministic embedding based on text hash
 * Useful for testing/backfill without external API dependencies
 * @param {string} text - Text to embed
 * @returns {number[]} - Fixed-size vector embedding (1536 dimensions)
 */
function generateMockEmbedding(text) {
  const hash = crypto.createHash("sha256").update(text).digest();

  // Generate 1536-dimensional vector from hash
  // 1536 dimensions is standard for many embedding models (OpenAI, Cohere, etc.)
  const embedding = [];
  for (let i = 0; i < 1536; i++) {
    // Use different bytes from hash to create variation
    const byteIndex = i % hash.length;
    const byte = hash[byteIndex];

    // Convert byte to normalized value (-1 to 1)
    embedding.push(byte / 127.5 - 1);
  }

  return embedding;
}

/**
 * Generate embedding for text using Gemini API (with fallback to mock)
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} - Vector embedding
 */
export const generateEmbedding = async (text) => {
  if (!text || typeof text !== "string") {
    throw new Error("Invalid text for embedding");
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  // Try Gemini API first
  if (GEMINI_API_KEY && process.env.USE_REAL_EMBEDDINGS !== "false") {
    try {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1/models/text-embedding-004:embedContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": GEMINI_API_KEY,
          },
          body: JSON.stringify({
            model: "models/text-embedding-004",
            content: {
              parts: [
                {
                  text: text.substring(0, 2000),
                },
              ],
            },
          }),
          timeout: 30000,
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.embedding?.values && Array.isArray(data.embedding.values)) {
          console.log("   ✅ Using Gemini API embedding");
          return data.embedding.values;
        }
      }
    } catch (error) {
      console.log(
        `   ⚠️  Gemini API unavailable (${error.message}), using mock embeddings`,
      );
    }
  }

  // Fallback: Mock embedding for MVP/testing
  console.log("   📊 Using deterministic mock embedding");
  return generateMockEmbedding(text);
};

/**
 * Batch generate embeddings for multiple texts
 * @param {Array} items - Array of {id, text}
 * @returns {Promise<Array>} - Array of {id, embedding}
 */
export const batchGenerateEmbeddings = async (items) => {
  if (!items || items.length === 0) {
    return [];
  }

  const results = [];

  // Process in batches of 5 to avoid overwhelming the API
  for (let i = 0; i < items.length; i += 5) {
    const batch = items.slice(i, i + 5);

    const promises = batch.map(async (item) => {
      try {
        const embedding = await generateEmbedding(item.text);
        return { id: item.id, embedding, success: true };
      } catch (error) {
        console.error(`Failed to embed item ${item.id}:`, error);
        return { id: item.id, embedding: null, success: false };
      }
    });

    const batchResults = await Promise.all(promises);
    results.push(...batchResults);

    // Small delay between batches to avoid rate limiting
    if (i + 5 < items.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return results;
};

/**
 * Generate embedding for forum (title + content)
 * @param {string} title - Forum title
 * @param {string} content - Forum content
 * @returns {Promise<number[]>} - Vector embedding
 */
export const generateForumEmbedding = async (title, content) => {
  if (!title || !content) {
    throw new Error("Title and content required for forum embedding");
  }

  // Combine title and content with emphasis on title
  const combinedText = `${title}. ${content}`;
  return generateEmbedding(combinedText);
};
