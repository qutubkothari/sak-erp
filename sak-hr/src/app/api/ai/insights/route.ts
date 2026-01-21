import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type InsightRequest = {
  prompt: string;
  metrics: unknown;
};

const buildPrompt = (prompt: string, metrics: unknown) => {
  const context = JSON.stringify(metrics, null, 2);
  return `You are an HR analytics advisor for a UAE enterprise. ${prompt}\n\nMetrics:\n${context}`;
};

const callGemini = async (apiKey: string, prompt: string) => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 400 },
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Gemini request failed');
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
};

const callOpenAi = async (apiKey: string, prompt: string) => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an HR analytics advisor for a UAE enterprise.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 400,
    }),
  });

  if (!response.ok) {
    throw new Error('OpenAI request failed');
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content ?? '';
};

export async function POST(request: Request) {
  const body = (await request.json()) as InsightRequest;

  if (!body?.prompt) {
    return NextResponse.json({ message: 'Prompt is required.' }, { status: 400 });
  }

  const prompt = buildPrompt(body.prompt, body.metrics ?? {});
  const geminiKey = process.env.GEMINI_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;

  try {
    if (geminiKey) {
      const summary = await callGemini(geminiKey, prompt);
      return NextResponse.json({ summary });
    }
    if (openAiKey) {
      const summary = await callOpenAi(openAiKey, prompt);
      return NextResponse.json({ summary });
    }

    return NextResponse.json({ message: 'No AI provider configured.' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ message: 'AI request failed.' }, { status: 500 });
  }
}
