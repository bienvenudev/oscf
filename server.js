const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
require("dotenv").config();

const app = express();

// CORS configuration
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://www.bienvenudev.tech"]
        : [
            "http://127.0.0.1:5500",
            "http://127.0.0.1:5501",
            "http://localhost:5500",
            "http://localhost:5501",
          ],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json());
app.use(express.static(".")); // Serve your static files

// Production logging middleware
app.use((req, res, next) => {
  if (process.env.NODE_ENV === "production") {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  }
  next();
});

app.post("/api/summarize", async (req, res) => {
  try {
    if (!req.body || !req.body.text) {
      return res.status(400).json({ error: "Missing text in request body" });
    }

    const { text, isContributing } = req.body;

    const response = await fetch(
      "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`,
        },
        body: JSON.stringify({
          inputs: text,
          parameters: {
            max_length: 150,
            min_length: 30,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Hugging Face API error:", errorText);
      throw new Error(`Hugging Face API request failed: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error in summarize endpoint:", error.message);
    res.status(500).json({ error: "Failed to summarize text" });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  if (process.env.NODE_ENV !== "production") {
    console.log(
      "Hugging Face API token:",
      process.env.HUGGINGFACE_API_TOKEN ? "Present" : "Missing"
    );
  }
});
