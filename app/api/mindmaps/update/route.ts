import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import { MindMap } from '@/lib/models';
import { apiErrorResponse } from '@/lib/errors/apiResponse';

export async function PUT(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);

    await dbConnect();

    // Verify user exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const sourceId = body.sourceId || body.videoId;
    const { nodes, edges } = body;

    if (!sourceId || !nodes || !edges) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update mind map
    const mindMap = await MindMap.findOneAndUpdate(
      { sourceId: sourceId, userId: user._id },
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
    return apiErrorResponse('MATERIAL_UNAVAILABLE', 500, 'We couldn\'t update your mind map. Please try again.');
  }
}