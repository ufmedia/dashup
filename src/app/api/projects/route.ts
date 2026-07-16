import { NextRequest, NextResponse } from 'next/server';
import { projectOps } from '@/lib/db';

export async function GET() {
  try {
    const projects = await projectOps.getAll();
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();
    
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const project = await projectOps.create(name.trim());
    return NextResponse.json(project, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating project:', error);
    if (error instanceof Error && error.message.includes('UNIQUE constraint')) {
      return NextResponse.json({ error: 'Project already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
