import { NextRequest, NextResponse } from 'next/server';
import { submissionOps } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamMemberId = searchParams.get('teamMemberId');
    
    if (!teamMemberId) {
      return NextResponse.json({ error: 'Team member ID is required' }, { status: 400 });
    }

    const submission = await submissionOps.getTodaySubmissionForMember(parseInt(teamMemberId));
    
    return NextResponse.json({ submission });
  } catch (error) {
    console.error('Error fetching submission:', error);
    return NextResponse.json({ error: 'Failed to fetch submission' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { submissionId, blockedByText, projectIds, talkToRequests } = await request.json();
    
    if (!submissionId || typeof submissionId !== 'number') {
      return NextResponse.json({ error: 'Submission ID is required' }, { status: 400 });
    }

    if (!Array.isArray(projectIds) || projectIds.length === 0) {
      return NextResponse.json({ error: 'At least one project is required' }, { status: 400 });
    }

    // Normalize talkToRequests
    const normalizedTalkToRequests = (talkToRequests || []).map((item: number | { memberId: number; priority: string }) => {
      if (typeof item === 'number') {
        return { memberId: item, priority: 'green' };
      }
      return item;
    });

    await submissionOps.updateSubmission(
      submissionId,
      blockedByText || null,
      projectIds,
      normalizedTalkToRequests
    );

    return NextResponse.json({ id: submissionId, updated: true });
  } catch (error) {
    console.error('Error updating submission:', error);
    return NextResponse.json({ error: 'Failed to update submission' }, { status: 500 });
  }
}
