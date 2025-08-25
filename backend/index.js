import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import multer from "multer";
import Tesseract from "tesseract.js";
import axios from "axios";
import dotenv from "dotenv";
import { calculateConfidenceScores } from "./utils/scoring.js";

dotenv.config();

const app = express();
const upload = multer({ dest: "uploads/" });
app.use(cors());
app.use(express.json());

// Serve React build static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const buildPath = path.join(__dirname, "../ai-multi-model/build");
app.use(express.static(buildPath));

// Fallback for React Router
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) return;
  res.sendFile(path.join(buildPath, "index.html"));
});

const MODELS = [
  { name: "DeepSeek", id: "deepseek/deepseek-r1-0528:free", weight: 0.9 },
  { name: "Kimi", id: "moonshotai/kimi-k2:free", weight: 0.85 },
  { name: "Qwen", id: "qwen/qwen3-coder:free", weight: 0.8 },
  { name: "Gemma", id: "google/gemma-3-4b-it:free", weight: 0.75 }
];

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

async function queryModel(modelId, question) {
  try {
    // Ask model to answer and estimate probability
    const prompt = `${question}\n\nAfter your answer, estimate the probability (0-100%) that your answer is correct. Format: Answer: <your answer>\nProbability: <number>%`;
    const response = await axios.post(
      OPENROUTER_URL,
      {
        model: modelId,
        messages: [{ role: "user", content: prompt }]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );
    return response.data.choices[0].message.content;
  } catch (err) {
    return `Error from ${modelId}: ${err.message}`;
  }
}

app.post("/api/ask", upload.single("image"), async (req, res) => {
  let question = req.body.question || "";
  if (req.file) {
    // OCR extraction
    try {
      const { data: { text } } = await Tesseract.recognize(req.file.path, "eng");
      question = text.trim();
    } catch (err) {
      return res.status(500).json({ error: "OCR failed", details: err.message });
    }
  }
  if (!question) {
    return res.status(400).json({ error: "No question provided." });
  }
  // Query all models in parallel
  const modelPromises = MODELS.map(m => queryModel(m.id, question));
  const rawResponses = await Promise.all(modelPromises);
  // Parse answers and probabilities
  const parsed = rawResponses.map((resp, i) => {
    let answer = resp;
    let probability = null;
    // Try to extract answer and probability
    const answerMatch = resp.match(/Answer:\s*(.*)/i);
    if (answerMatch) answer = answerMatch[1].trim();
    const probMatch = resp.match(/Probability:\s*(\d{1,3})%/i);
    if (probMatch) probability = Math.max(0, Math.min(100, parseInt(probMatch[1])));
    return {
      model: MODELS[i].name,
      answer,
      probability: probability !== null ? probability : null,
      raw: resp
    };
  });
  // Choose best answer by highest probability
  const best = parsed.reduce((a, b) => (a.probability > b.probability ? a : b));

  // Add Consensus AI answer at the end
  let consensusText = "";
  if (best && typeof best.probability === 'number') {
    consensusText = `Based on the model probabilities, the most likely correct answer is: "${best.answer}" (${best.probability}%).`;
    if (best.probability > 80) {
      consensusText += " This answer is highly reliable.";
    } else if (best.probability > 50) {
      consensusText += " This answer is somewhat reliable.";
    } else {
      consensusText += " This answer has low reliability; consider reviewing other model responses.";
    }
  } else {
    consensusText = "Consensus AI could not determine a reliable answer from the models.";
  }
  const consensusResult = {
    model: "Consensus AI",
    answer: consensusText,
    probability: best?.probability ?? null,
    raw: consensusText
  };
  const allResults = [...parsed, consensusResult];
  res.json({
    question,
    results: allResults,
    bestAnswer: best,
    consensus: consensusResult
  });
});

app.listen(5000, () => {
  console.log("Backend running on http://localhost:5000");
});
