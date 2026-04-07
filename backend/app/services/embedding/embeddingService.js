import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

// Get the API key from your environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent";

/**
 * Generates an embedding vector for a given text using Google Gemini.
 * @param {string} text - The text to embed.
 * @returns {Promise<number[] | null>} - The embedding vector or null on error.
 */
export async function generateEmbedding(text) {
  if (!GEMINI_API_KEY) {
    console.error("Missing GEMINI_API_KEY");
    return null;
  }

  try {
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        model: "models/gemini-embedding-001",
        content: {
          parts: [{ text: text.slice(0, 8000) }],
        },
        outputDimensionality: 1536, // <-- truncate to 1536
      },
      {
        headers: { "Content-Type": "application/json" },
      },
    );
    return response.data.embedding.values;
  } catch (err) {
    console.error("Gemini embedding error:", err.response?.data || err.message);
    return null;
  }
}

export async function generateForumEmbedding(title, content) {
  const text = `${title}\n\n${content}`;
  return generateEmbedding(text);
}
