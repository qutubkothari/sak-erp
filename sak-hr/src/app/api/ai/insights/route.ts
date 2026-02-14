import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type InsightRequest = {
  prompt: string;
  metrics: unknown;
};

const INSIGHTS_SYSTEM_PROMPT =
  'You are an HR analytics advisor for a UAE enterprise. Provide concise, executive-ready analysis from provided metrics. Do not ask follow-up questions. Do not run questionnaires. If data is missing, state assumptions briefly and continue with best-effort recommendations.';

const buildPrompt = (prompt: string, metrics: unknown) => {
  const context = JSON.stringify(metrics, null, 2);
  return [
    `Task: ${prompt}`,
    'Output format:',
    '- 3 to 6 bullets only',
    '- Cover trends, risks, and recommended actions',
    '- No follow-up questions',
    '- No conversational filler',
    '',
    'Metrics:',
    context,
  ].join('\n');
};

const sanitizeSummary = (text: string) => {
  if (!text) return '';

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const line of lines) {
    const normalized = line
      .toLowerCase()
      .replace(/[—–-]/g, '-')
      .replace(/\s+/g, ' ')
      .trim();

    if (seen.has(normalized)) continue;
    seen.add(normalized);
    deduped.push(line);
  }

  return deduped.join('\n').slice(0, 4000);
};

const callGemini = async (apiKey: string, systemPrompt: string, prompt: string) => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 320 },
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Gemini request failed');
  }

  const data = await response.json();
  return sanitizeSummary(data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '');
};

const callOpenAi = async (apiKey: string, systemPrompt: string, prompt: string) => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 320,
    }),
  });

  if (!response.ok) {
    throw new Error('OpenAI request failed');
  }

  const data = await response.json();
  return sanitizeSummary(data?.choices?.[0]?.message?.content ?? '');
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
      const summary = await callGemini(geminiKey, INSIGHTS_SYSTEM_PROMPT, prompt);
      return NextResponse.json({ summary });
    }
    if (openAiKey) {
      const summary = await callOpenAi(openAiKey, INSIGHTS_SYSTEM_PROMPT, prompt);
      return NextResponse.json({ summary });
    }

    return NextResponse.json({ message: 'No AI provider configured.' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ message: 'AI request failed.' }, { status: 500 });
  }
}
