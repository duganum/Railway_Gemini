// ─────────────────────────────────────────────
//  FE Exam Tutor — Gemini Optimized Backend
//  Project: Railway_Gemini
// ─────────────────────────────────────────────

const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Gemini API 설정 (Railway Variables에서 GEMINI_API_KEY를 가져옵니다)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(cors());
app.use(express.json());

// ── Health Check ─────────────────────────────
app.get("/", (req, res) => {
  res.json({ status: "Gemini 1.5 Flash Engine is running ✅" });
});

// ── Main Chat Endpoint ────────────────────────
app.post("/api/chat", async (req, res) => {
  const { messages, system, model } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array is required" });
  }

  // Gemini 1.5 Flash를 기본 모델로 사용 (비용 절감 및 자동 캐싱)
  const selectedModel = "gemini-1.5-flash"; 

  try {
    const modelInstance = genAI.getGenerativeModel({ 
      model: selectedModel,
      // 이 systemInstruction이 캐싱의 핵심 대상입니다. (나중에 핸드북 삽입 위치)
      systemInstruction: system || "You are a professional engineering tutor. Use Socratic method.", 
    });

    // 2. 대화 이력 변환 (Claude 형식을 Gemini 형식으로 매핑)
    const chat = modelInstance.startChat({
      history: messages.slice(0, -1).map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
    });

    // 3. 마지막 메시지 전송 및 응답 수신
    const lastMessage = messages[messages.length - 1].content;
    const result = await chat.sendMessage(lastMessage);
    const response = await result.response;
    const reply = response.text();

    res.json({ reply });

  } catch (err) {
    console.error("Gemini Server error:", err);
    res.status(500).json({ error: "Internal server error. Check GEMINI_API_KEY." });
  }
});

// ── Start Server ──────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Gemini Backend running on port ${PORT}`);
});