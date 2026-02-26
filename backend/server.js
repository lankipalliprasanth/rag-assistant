const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { cosineSimilarity } = require("./utils/vector_math");

const app = express();
app.use(cors());
app.use(express.json());

const sessions = {};

function preprocess(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);
}

function createTFIDFEmbedding(text, vocabulary, idf) {
  const words = preprocess(text);
  const vector = new Array(vocabulary.length).fill(0);

  words.forEach(word => {
    const index = vocabulary.indexOf(word);
    if (index !== -1) {
      vector[index] += idf[word] || 0;
    }
  });

  return vector;
}

const vectorStorePath = path.join(__dirname, "data/vector_store.json");
const storedData = JSON.parse(fs.readFileSync(vectorStorePath, "utf-8"));

const vocabulary = storedData.vocabulary;
const idf = storedData.idf;
const vectorStore = storedData.documents;

app.post("/api/chat", (req, res) => {
  try {
    const { sessionId, message } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required" });
    }

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    if (!sessions[sessionId]) {
      sessions[sessionId] = [];
    }

    sessions[sessionId].push({ role: "user", message });

    const queryEmbedding = createTFIDFEmbedding(message, vocabulary, idf);

    const scoredDocs = vectorStore.map(doc => ({
      ...doc,
      score: cosineSimilarity(queryEmbedding, doc.embedding)
    }));

    scoredDocs.sort((a, b) => b.score - a.score);

    const topResults = scoredDocs.slice(0, 3);

    if (!topResults.length || topResults[0].score < 0.2) {
      return res.json({
        reply: "I don't have enough information to answer that.",
        retrievedChunks: 0,
        similarityScore: 0
      });
    }

    const combinedContext = topResults
      .map((doc, index) => `${index + 1}. ${doc.content}`)
      .join("\n\n");

    const reply = `Based on our policies:\n\n${combinedContext}`;

    sessions[sessionId].push({ role: "assistant", message: reply });

    console.log("Top similarity score:", topResults[0].score);

    return res.json({
      reply,
      retrievedChunks: topResults.length,
      similarityScore: topResults[0].score
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});