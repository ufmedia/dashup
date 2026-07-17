import { NextResponse } from 'next/server';
import { userOps, sessionOps, teamMemberOps } from '@/lib/db';
import { hashToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const sessionTokenHash = hashToken(sessionToken);
    const session = await sessionOps.getByTokenHash(sessionTokenHash);

    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { name } = await request.json();

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Please enter your name' }, { status: 400 });
    }

    const trimmedName = name.trim();

    // Update user name
    await userOps.updateName(session.user.id, trimmedName);

    // Try to find or create a matching team member
    const teamMembers = await teamMemberOps.getAll();
    let teamMember = teamMembers.find(
      tm => tm.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (!teamMember) {
      // Create a new team member for this user
      teamMember = await teamMemberOps.create(trimmedName);
    }

    // Link user to team member
    await userOps.linkTeamMember(session.user.id, teamMember.id);

    return NextResponse.json({ 
      success: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: trimmedName,
        team_member_id: teamMember.id
      }
    });
  } catch (error) {
    console.error('Failed to complete registration:', error);
    return NextResponse.json({ error: 'Failed to complete registration' }, { status: 500 });
  }
}
