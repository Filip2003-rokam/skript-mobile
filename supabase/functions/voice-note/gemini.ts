const geminiTimeoutMs = 40_000;
const defaultModel = 'gemini-3.6-flash';

export type VoiceDraft = {
  note: string;
  topic: string;
  followUpDate: string | null;
  subject: string;
  body: string;
  fullName: string;
  jobTitle: string;
  company: string;
  email: string;
  phone: string;
};

export async function transcribeAudio(audio: string, mime: string, today: string): Promise<VoiceDraft | null> {
  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) {
    console.error('GEMINI_API_KEY nije podešen.');
    throw new Error('Beleška nije obrađena. Pokušaj ponovo.');
  }

  const model = Deno.env.get('GEMINI_MODEL')?.trim() || defaultModel;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    signal: AbortSignal.timeout(geminiTimeoutMs),
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [
          { text: prompt(today) },
          { inlineData: { mimeType: mime, data: audio } },
        ],
      }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            note: { type: 'STRING' },
            topic: { type: 'STRING' },
            follow_up_date: { type: 'STRING' },
            email_subject: { type: 'STRING' },
            email_body: { type: 'STRING' },
            full_name: { type: 'STRING' },
            job_title: { type: 'STRING' },
            company: { type: 'STRING' },
            email: { type: 'STRING' },
            phone: { type: 'STRING' },
          },
          required: ['note', 'topic', 'follow_up_date', 'email_subject', 'email_body', 'full_name', 'job_title', 'company', 'email', 'phone'],
        },
      },
    }),
  });

  if (!response.ok) {
    console.error(`Gemini je vratio ${response.status}: ${await geminiError(response, key)}`);
    throw new Error('Beleška nije obrađena. Pokušaj ponovo.');
  }

  const body = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
  return parseDraft(text);
}

export async function draftFromText(note: string, name: string, company: string, event: string, tone: string): Promise<{ subject: string; body: string } | null> {
  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) {
    console.error('GEMINI_API_KEY nije podešen.');
    throw new Error('Beleška nije obrađena. Pokušaj ponovo.');
  }
  const model = Deno.env.get('GEMINI_MODEL')?.trim() || defaultModel;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    signal: AbortSignal.timeout(geminiTimeoutMs),
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: textPrompt(note, name, company, event, tone) }] }],
      generationConfig: {
        temperature: tone === 'plain' ? 0.2 : 0.4,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: { email_subject: { type: 'STRING' }, email_body: { type: 'STRING' } },
          required: ['email_subject', 'email_body'],
        },
      },
    }),
  });
  if (!response.ok) {
    console.error(`Gemini je vratio ${response.status}: ${await geminiError(response, key)}`);
    throw new Error('Beleška nije obrađena. Pokušaj ponovo.');
  }
  const payload = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const raw = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
  return parseMail(raw);
}

function textPrompt(note: string, name: string, company: string, event: string, tone: string): string {
  const style = tone === 'shorter' ? 'Neka mejl bude kraći, u dve ili tri rečenice.' : tone === 'formal' ? 'Neka mejl bude formalniji, i dalje na ti.' : 'Neka mejl bude kratak i prijatan.';
  return [
    'Pišeš follow-up mejl posle razgovora na konferenciji. Srpski, latinica, na ti.',
    `Ime: ${name || 'nepoznato'}. Firma: ${company || 'nije navedena'}. Event: ${event || 'nije naveden'}.`,
    `Beleška: ${note}`,
    style,
    'Ne izmišljaj dogovore, brojke ni detalje kojih nema u belešci. Ne piši da je mejl već poslat.',
    'Vrati email_subject i email_body.',
  ].join('\n');
}

function parseMail(raw: string): { subject: string; body: string } | null {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    const row = JSON.parse(trimmed) as { email_subject?: unknown; email_body?: unknown };
    const subject = clip(row.email_subject, 160);
    const body = clip(row.email_body, 2000);
    if (!subject && !body) return null;
    return { subject, body };
  } catch {
    return null;
  }
}

function prompt(today: string): string {
  return [
    'Čuješ glasovnu belešku posle razgovora na konferenciji. Piši na srpskom, latinica, na ti.',
    'Vrati samo ono što je izgovoreno. Ne izmišljaj ime, firmu, brojke, dogovore ni detalje kojih nema u snimku.',
    'note: kratka beleška razgovora. topic: tema u nekoliko reči.',
    `follow_up_date: YYYY-MM-DD. Ako datum nije izgovoren, predloži tri radna dana od danas. Danas je ${today}. Preskoči subotu i nedelju.`,
    'email_subject i email_body: kratak follow-up mejl. Ne piši da je mejl već poslat.',
    'full_name, job_title, company, email i phone popuni samo ako su izgovoreni. Inače prazan string.',
    'Ako se ništa razumljivo ne čuje, note je prazan string.',
  ].join('\n');
}

function parseDraft(raw: string): VoiceDraft | null {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const row = parsed as Record<string, unknown>;
  const note = clip(row.note, 2000);
  if (!note) return null;
  return {
    note,
    topic: clip(row.topic, 160),
    followUpDate: isoDate(row.follow_up_date),
    subject: clip(row.email_subject, 160),
    body: clip(row.email_body, 2000),
    fullName: clip(row.full_name, 120),
    jobTitle: clip(row.job_title, 120),
    company: clip(row.company, 120),
    email: clip(row.email, 160),
    phone: clip(row.phone, 40),
  };
}

function clip(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  const text = value.trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function isoDate(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return value;
}

async function geminiError(response: Response, key: string): Promise<string> {
  const raw = await response.text();
  let message = raw.slice(0, 500);
  try {
    const body = JSON.parse(raw) as { error?: { message?: string } };
    if (body.error?.message) message = body.error.message;
  } catch {
    // Telo nije JSON. Ostaje skraćen tekst.
  }
  return message.replaceAll(key, '');
}
