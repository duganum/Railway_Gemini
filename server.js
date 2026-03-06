const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.json({ status: "Gemini Backend v2" }));

// Register device on first launch
app.post("/api/register", async (req, res) => {
  const { device_id, email } = req.body;
  if (!device_id) return res.status(400).json({ error: "device_id required" });
  try {
    const { data: existing } = await supabase
      .from("licenses").select("*").eq("device_id", device_id).single();
    if (existing) {
      return res.json({ registered: true, expires_at: existing.expires_at, is_active: existing.is_active });
    }
    const { data, error } = await supabase
      .from("licenses").insert([{ device_id, email: email || null }]).select().single();
    if (error) throw error;
    res.json({ registered: true, expires_at: data.expires_at, is_active: data.is_active });
  } catch (err) {
    console.error("Register error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Check license validity
app.post("/api/check-license", async (req, res) => {
  const { device_id } = req.body;
  if (!device_id) return res.status(400).json({ error: "device_id required" });
  try {
    const { data, error } = await supabase
      .from("licenses").select("expires_at, is_active").eq("device_id", device_id).single();
    if (error || !data) return res.json({ valid: false, reason: "not_registered" });
    const expired = new Date(data.expires_at) < new Date();
    const valid = data.is_active && !expired;
    res.json({ valid, expires_at: data.expires_at, reason: !data.is_active ? "deactivated" : expired ? "expired" : null });
  } catch (err) {
    console.error("License error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// AI Chat
app.post("/api/chat", async (req, res) => {
  const { messages, system } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: "messages array required" });
  try {
    const modelInstance = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: system || "You are a professional engineering tutor. Use Socratic method.",
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
