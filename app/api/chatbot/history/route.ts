import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { loadChatHistory, deleteChatHistory } from '@/lib/chat-db';
import { generateSessionId } from '@/lib/types/chat';

interface DecodedToken {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  iat: number;
  exp: number;
}

/**
 * GET /api/chatbot/history
 * Retrieve chat history for a specific video
 * Query params: videoId (required)
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const token = request.cookies.get('jwt')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

    // 2. Parse query params
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json(
        { error: 'videoId is required' },
        { status: 400 }
      );
    }

    // 3. Generate session ID and load history
    const sessionId = generateSessionId(decoded.userId, videoId);
    const history = await loadChatHistory(sessionId, 100); // Last 100 messages

    // 4. Return chat history
    return NextResponse.json({
      sessionId,
      messages: history,
      count: history.length
    });

  } catch (error) {
    console.error('Failed to load chat history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/chatbot/history
 * Clear chat history for a specific video
 * Query params: videoId (required)
 */
export async function DELETE(request: NextRequest) {
  try {
    // 1. Authenticate
    const token = request.cookies.get('jwt')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

    // 2. Parse query params
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json(
        { error: 'videoId is required' },
        { status: 400 }
      );
    }

    // 3. Generate session ID and delete history
    const sessionId = generateSessionId(decoded.userId, videoId);
    await deleteChatHistory(sessionId);

    // 4. Return success
    return NextResponse.json({
      success: true,
      message: 'Chat history cleared successfully'
    });

  } catch (error) {
    console.error('Failed to delete chat history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
