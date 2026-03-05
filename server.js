const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 1. 환경 변수에서 API 키 로드
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, systemContext } = req.body;

    // 2. Gemini 모델 설정 (Flash 1.5)
    const model = genAI.getGenerativeModel({ 
      model: "models/gemini-3-flash-preview",
      systemInstruction: systemContext // 시스템 프롬프트를 명령으로 전달
    });

    // 3. 메시지 형식 변환 (Gemini 전용 role 이름으로 변경)
    // 'assistant' -> 'model', 'user' -> 'user'
    let contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    // 4. [중요] 첫 번째 메시지가 'user'인지 확인하고 필터링
    // Gemini는 무조건 'user'의 질문으로 대화가 시작되어야 합니다.
    while (contents.length > 0 && contents[0].role !== 'user') {
      contents.shift();
    }

    // 5. 마지막 메시지는 현재 질문이므로 history에서 제외하고 prompt로 사용
    const lastMessage = contents.pop();
    
    // 6. 대화 시작
    const chat = model.startChat({
      history: contents,
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
      },
    });

    // 7. 응답 생성 및 전송
    const result = await chat.sendMessage(lastMessage.parts[0].text);
    const response = await result.response;
    const text = response.text();

    res.json({ message: text });

  } catch (error) {
    console.error("Gemini Server error:", error);
    res.status(500).json({ 
      error: "Internal Server Error", 
      details: error.message 
    });
  }
});

// 8. 포트 설정 (Railway 로그에 찍힌 8080 사용)
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ Gemini Backend running on port ${PORT}`);
});

// 9. 루트 접속 확인용 (브라우저 확인용)
app.get('/', (req, res) => {
  res.json({ status: "Gemini 1.5 Flash Engine is running ✅" });
});


