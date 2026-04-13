import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, { status: string; ms?: number }> = {};

  // MongoDB check
  const mongoStart = Date.now();
  try {
    const conn = await dbConnect();
    await conn.connection.db?.admin().ping();
    checks.mongodb = { status: 'ok', ms: Date.now() - mongoStart };
  } catch {
    checks.mongodb = { status: 'error', ms: Date.now() - mongoStart };
  }

  const allOk = Object.values(checks).every((c) => c.status === 'ok');

  return NextResponse.json(
    {
      status: allOk ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: allOk ? 200 : 503 }
  );
}
