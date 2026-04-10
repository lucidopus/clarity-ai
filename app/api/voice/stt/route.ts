import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('jwt')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    jwt.verify(token, process.env.JWT_SECRET!);

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'ElevenLabs not configured' }, { status: 503 });

    const form = await request.formData();
    const audio = form.get('audio') as Blob | null;
    if (!audio) return NextResponse.json({ error: 'audio required' }, { status: 400 });

    const body = new FormData();
    body.append('audio', audio, 'recording.webm');
    body.append('model_id', 'scribe_v1');

    const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
      body,
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('ElevenLabs STT error:', err);
      return NextResponse.json({ error: 'STT failed' }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({ text: data.text ?? '' });
  } catch (error) {
    console.error('STT route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
