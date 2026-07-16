import { NextResponse } from 'next/server';
import { submissionOps } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [
      projectCounts,
      membersPerProject,
      contextSwitchMinutes,
      talkToList,
      blockers,
      collaborationOpportunities
    ] = await Promise.all([
      submissionOps.getProjectCounts(),
      submissionOps.getMembersPerProject(),
      submissionOps.getContextSwitchMinutes(),
      submissionOps.getTalkToList(),
      submissionOps.getBlockers(),
      submissionOps.getCollaborationOpportunities()
    ]);

    return NextResponse.json({
      projectCounts,
      membersPerProject,
      contextSwitchMinutes,
      talkToList,
      blockers,
      collaborationOpportunities,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
