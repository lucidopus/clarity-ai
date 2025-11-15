import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { loadChatHistory, deleteChatHistory, loadChatHistoryByChannel, deleteChatHistoryByChannel } from '@/lib/chat-db';
import { generateSessionId, generateContextId } from '@/lib/types/chat';

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
 * Retrieve chat history for a specific video or problem
 * Query params:
 * - videoId (required)
 * - channel (optional): 'chatbot' or 'guide'
 * - problemId (optional): required if channel=guide
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
    const channel = searchParams.get('channel') as 'chatbot' | 'guide' | null;
    const problemId = searchParams.get('problemId');

    if (!videoId) {
      return NextResponse.json(
        { error: 'videoId is required' },
        { status: 400 }
      );
    }

    // 3. Load history based on channel
    let history;
    let sessionId: string | undefined;

    if (channel) {
      // NEW: Channel-based query
      if (channel === 'guide' && !problemId) {
        return NextResponse.json(
          { error: 'problemId is required for guide channel' },
          { status: 400 }
        );
      }

      const contextId = generateContextId(channel, videoId, problemId || undefined);
      history = await loadChatHistoryByChannel(decoded.userId, channel, contextId, 100);
    } else {
      // LEGACY: Session-based query (backward compatibility)
      sessionId = generateSessionId(decoded.userId, videoId);
      history = await loadChatHistory(sessionId, 100);
    }

    // 4. Return chat history
    return NextResponse.json({
      ...(sessionId && { sessionId }),
      ...(channel && { channel }),
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
 * Clear chat history for a specific video or problem
 * Query params:
 * - videoId (required)
 * - channel (optional): 'chatbot' or 'guide'
 * - problemId (optional): required if channel=guide
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
    const channel = searchParams.get('channel') as 'chatbot' | 'guide' | null;
    const problemId = searchParams.get('problemId');

    if (!videoId) {
      return NextResponse.json(
        { error: 'videoId is required' },
        { status: 400 }
      );
    }

    // 3. Delete history based on channel
    if (channel) {
      // NEW: Channel-based delete
      if (channel === 'guide' && !problemId) {
        return NextResponse.json(
          { error: 'problemId is required for guide channel' },
          { status: 400 }
        );
      }

      const contextId = generateContextId(channel, videoId, problemId || undefined);
      await deleteChatHistoryByChannel(decoded.userId, channel, contextId);
    } else {
      // LEGACY: Session-based delete (backward compatibility)
      const sessionId = generateSessionId(decoded.userId, videoId);
      await deleteChatHistory(sessionId);
    }

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
