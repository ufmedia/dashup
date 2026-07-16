import { NextRequest, NextResponse } from 'next/server';
import { teamMemberOps } from '@/lib/db';

export async function GET() {
  try {
    const teamMembers = await teamMemberOps.getAll();
    return NextResponse.json(teamMembers);
  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();
    
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const teamMember = await teamMemberOps.create(name.trim());
    return NextResponse.json(teamMember, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating team member:', error);
    if (error instanceof Error && error.message.includes('UNIQUE constraint')) {
      return NextResponse.json({ error: 'Team member already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create team member' }, { status: 500 });
  }
}
