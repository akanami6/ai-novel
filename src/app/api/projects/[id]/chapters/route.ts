import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// POST /api/projects/[id]/chapters — create a chapter in a project
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params;
    const body = await req.json();
    const { title, index, goal, content } = body;

    if (!title || index === undefined) {
      return NextResponse.json({ error: 'title and index are required' }, { status: 400 });
    }

    // Verify project exists
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const chapter = await prisma.chapter.create({
      data: {
        title,
        index,
        goal: goal ?? null,
        content: content ?? '',
        wordCount: content ? countCJK(content) : 0,
        projectId,
      },
    });

    return NextResponse.json(chapter, { status: 201 });
  } catch (error) {
    console.error('POST /api/projects/[id]/chapters error:', error);
    return NextResponse.json({ error: 'Failed to create chapter' }, { status: 500 });
  }
}

// GET /api/projects/[id]/chapters — list chapters for a project
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params;
    const chapters = await prisma.chapter.findMany({
      where: { projectId },
      orderBy: { index: 'asc' },
    });
    return NextResponse.json(chapters);
  } catch (error) {
    console.error('GET /api/projects/[id]/chapters error:', error);
    return NextResponse.json({ error: 'Failed to list chapters' }, { status: 500 });
  }
}

// CJK character counter (Chinese, Japanese, Korean)
function countCJK(text: string): number {
  let count = 0;
  for (const char of text) {
    const code = char.codePointAt(0);
    if (
      code &&
      ((code >= 0x4e00 && code <= 0x9fff) || // CJK Unified
        (code >= 0x3400 && code <= 0x4dbf) || // CJK Ext-A
        (code >= 0x20000 && code <= 0x2a6df) || // CJK Ext-B
        (code >= 0xf900 && code <= 0xfaff) || // CJK Compat
        (code >= 0x3040 && code <= 0x309f) || // Hiragana
        (code >= 0x30a0 && code <= 0x30ff)) // Katakana
    ) {
      count++;
    }
  }
  return count;
}
