const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = process.env.PORT || 3000;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.json({ status: "Gemini Backend v2" }));

app.post("/api/register", (req, res) => {
  res.json({ registered: true, message: "Supabase coming soon" });
});

app.post("/api/check-license", (req, res) => {
  res.json({ valid: true });
});

app.post("/api/chat", async (req, res) => {
  const { messages, system } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: "messages array required" });
  try {
    const modelInstance = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: system || "You are a professional engineering tutor.",
    });
    const history = messages.slice(0, -1).map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    const chat = modelInstance.startChat({ history });
    const result = await chat.sendMessage(messages[messages.length - 1].content);
    res.json({ reply: result.response.text() });
  } catch (err) {
    console.error("Chat error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log("Gemini Backend v2 on port " + PORT));