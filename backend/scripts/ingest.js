const fs = require("fs");
const path = require("path");

function preprocess(text) {
  const stopwords = [
    "the","is","are","a","an","of","to","within",
    "from","can","how","i","my","in","on","for",
    "and","that","this","with","be","their"
  ];

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(word => word && !stopwords.includes(word));
}

function buildVocabulary(docs) {
  const vocabSet = new Set();
  docs.forEach(doc => {
    preprocess(doc.content).forEach(word => vocabSet.add(word));
  });
  return Array.from(vocabSet);
}

function calculateIDF(docs, vocabulary) {
  const idf = {};
  const totalDocs = docs.length;

  vocabulary.forEach(word => {
    const docsContainingWord = docs.filter(doc =>
      preprocess(doc.content).includes(word)
    ).length;

    idf[word] = Math.log(totalDocs / (1 + docsContainingWord));
  });

  return idf;
}

function createTFIDFEmbedding(text, vocabulary, idf) {
  const words = preprocess(text);
  const vector = new Array(vocabulary.length).fill(0);

  words.forEach(word => {
    const index = vocabulary.indexOf(word);
    if (index !== -1) {
      vector[index] += idf[word];
    }
  });

  return vector;
}

async function generateEmbeddings() {
  const docsPath = path.join(__dirname, "../data/docs.json");
  const vectorStorePath = path.join(__dirname, "../data/vector_store.json");

  const docs = JSON.parse(fs.readFileSync(docsPath, "utf-8"));

  const vocabulary = buildVocabulary(docs);
  const idf = calculateIDF(docs, vocabulary);

  const vectorStore = docs.map(doc => ({
    ...doc,
    embedding: createTFIDFEmbedding(doc.content, vocabulary, idf)
  }));

  fs.writeFileSync(
    vectorStorePath,
    JSON.stringify({ vocabulary, idf, documents: vectorStore }, null, 2)
  );

  console.log("✅ Vector store created with TF-IDF!");
}

generateEmbeddings();