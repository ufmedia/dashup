import { NextRequest, NextResponse } from 'next/server';
import { submissionOps } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { teamMemberId, blockedByText, projectIds, talkToRequests } = await request.json();
    
    if (!teamMemberId || typeof teamMemberId !== 'number') {
      return NextResponse.json({ error: 'Team member is required' }, { status: 400 });
    }

    if (!Array.isArray(projectIds) || projectIds.length === 0) {
      return NextResponse.json({ error: 'At least one project is required' }, { status: 400 });
    }

    // Normalize talkToRequests - support both old format (array of IDs) and new format (array of objects)
    const normalizedTalkToRequests = (talkToRequests || []).map((item: number | { memberId: number; priority: string }) => {
      if (typeof item === 'number') {
        return { memberId: item, priority: 'green' };
      }
      return item;
    });

    const submissionId = await submissionOps.create(
      teamMemberId,
      blockedByText || null,
      projectIds,
      normalizedTalkToRequests
    );

    return NextResponse.json({ id: submissionId }, { status: 201 });
  } catch (error) {
    console.error('Error creating submission:', error);
    return NextResponse.json({ error: 'Failed to create submission' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const submissions = await submissionOps.getTodaySubmissions();
    return NextResponse.json(submissions);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
  }
}
