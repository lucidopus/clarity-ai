import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import { MindMap } from '@/lib/models';

interface DecodedToken {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  iat: number;
  exp: number;
}

export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('jwt')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

    await dbConnect();

    // Verify user exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { videoId, nodes, edges } = body;

    if (!videoId || !nodes || !edges) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update mind map
    const mindMap = await MindMap.findOneAndUpdate(
      { videoId: videoId, userId: user._id },
      {
        nodes: nodes,
        edges: edges,
        'metadata.generatedBy': 'user-modified',
        'metadata.lastModifiedAt': new Date(),
      },
      { new: true }
    );

    if (!mindMap) {
      return NextResponse.json({ error: 'Mind map not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      mindMap: {
        nodes: mindMap.nodes,
        edges: mindMap.edges,
      },
    });
  } catch (error) {
    console.error('Error updating mind map:', error);
    return NextResponse.json({ error: 'Failed to update mind map' }, { status: 500 });
  }
}