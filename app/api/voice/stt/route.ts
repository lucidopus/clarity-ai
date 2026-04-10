import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('jwt')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    jwt.verify(token, process.env.JWT_SECRET!);

    const form = await request.formData();
    const audio = form.get('audio');
    if (!audio || !(audio instanceof Blob)) {
      return NextResponse.json({ error: 'audio required' }, { status: 400 });
    }

    const file = audio instanceof File
      ? audio
      : new File([audio], 'recording.webm', { type: audio.type || 'audio/webm' });

    const transcription = await groq.audio.transcriptions.create({
      file,
      model: 'distil-whisper-large-v3-en',
    });

    return NextResponse.json({ text: transcription.text ?? '' });
  } catch (error) {
    console.error('STT route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
