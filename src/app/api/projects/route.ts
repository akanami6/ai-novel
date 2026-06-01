import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// GET /api/projects — list all projects
export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      include: { _count: { select: { chapters: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(projects);
  } catch (error) {
    console.error('GET /api/projects error:', error);
    return NextResponse.json({ error: 'Failed to list projects' }, { status: 500 });
  }
}

// POST /api/projects — create a project
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, synopsis, targetWords } = body;

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    // Phase 0 placeholder: use a fixed user ID
    const DEFAULT_USER_ID = 'dev-user';

    // Ensure dev user exists
    await prisma.user.upsert({
      where: { id: DEFAULT_USER_ID },
      update: {},
      create: { id: DEFAULT_USER_ID },
    });

    const project = await prisma.project.create({
      data: {
        title,
        synopsis: synopsis ?? null,
        targetWords: targetWords ?? null,
        userId: DEFAULT_USER_ID,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('POST /api/projects error:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
