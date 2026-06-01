'use client';

import { useState, useEffect } from 'react';

interface Project {
  id: string;
  title: string;
  synopsis: string | null;
  createdAt: string;
  _count?: { chapters: number };
}

interface Chapter {
  id: string;
  title: string;
  index: number;
  wordCount: number;
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [title, setTitle] = useState('');
  const [chapterTitle, setChapterTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setProjects(data);
      setError(null);
    } catch {
      setError('无法加载项目列表');
    }
  };

  const fetchChapters = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/chapters`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setChapters(data);
    } catch {
      setError('无法加载章节列表');
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const createProject = async () => {
    if (!title.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() }),
      });
      if (!res.ok) throw new Error('Failed');
      setTitle('');
      await fetchProjects();
      setError(null);
    } catch {
      setError('创建项目失败');
    } finally {
      setLoading(false);
    }
  };

  const createChapter = async () => {
    if (!chapterTitle.trim() || !selectedProject) return;
    setLoading(true);
    try {
      const nextIndex = chapters.length + 1;
      const res = await fetch(`/api/projects/${selectedProject.id}/chapters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: chapterTitle.trim(), index: nextIndex }),
      });
      if (!res.ok) throw new Error('Failed');
      setChapterTitle('');
      await fetchChapters(selectedProject.id);
      setError(null);
    } catch {
      setError('创建章节失败');
    } finally {
      setLoading(false);
    }
  };

  const selectProject = (project: Project) => {
    setSelectedProject(project);
    fetchChapters(project.id);
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-wider text-gray-900">AI Novel</h1>
          <p className="text-gray-500">小说创作助手 · Phase 0 — 地基</p>
          <p className="text-xs text-gray-400">帮你想清楚，不替你写</p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">关闭</button>
          </div>
        )}

        {/* Create Project */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-gray-800">新建项目</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createProject()}
              placeholder="输入小说标题…"
              className="flex-1 rounded-lg border px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
            />
            <button
              onClick={createProject}
              disabled={loading || !title.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '创建中…' : '创建'}
            </button>
          </div>
        </div>

        {/* Project List */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-gray-800">
            项目列表 ({projects.length})
          </h2>
          {projects.length === 0 ? (
            <p className="text-sm text-gray-400">暂无项目，创建一个吧</p>
          ) : (
            <ul className="space-y-1">
              {projects.map((p) => (
                <li
                  key={p.id}
                  onClick={() => selectProject(p)}
                  className={`cursor-pointer rounded-lg px-3 py-2 text-sm transition ${
                    selectedProject?.id === p.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <span className="font-medium">{p.title}</span>
                  {p._count && (
                    <span className="ml-2 text-xs text-gray-400">({p._count.chapters} 章)</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Selected Project & Chapters */}
        {selectedProject && (
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-gray-800">
              「{selectedProject.title}」— 章节
            </h2>
            <div className="mb-4 flex gap-2">
              <input
                type="text"
                value={chapterTitle}
                onChange={(e) => setChapterTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createChapter()}
                placeholder="输入章节标题…"
                className="flex-1 rounded-lg border px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              />
              <button
                onClick={createChapter}
                disabled={loading || !chapterTitle.trim()}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                添加章
              </button>
            </div>
            {chapters.length === 0 ? (
              <p className="text-sm text-gray-400">此项目暂无章节</p>
            ) : (
              <ul className="space-y-1">
                {chapters.map((ch) => (
                  <li key={ch.id} className="rounded-lg border px-3 py-2 text-sm text-gray-700">
                    第{ch.index}章 · {ch.title}
                    <span className="ml-2 text-xs text-gray-400">({ch.wordCount} 字)</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Health Check */}
        <p className="text-center text-xs text-gray-400">
          API: GET /api/health →{' '}
          <a href="/api/health" target="_blank" className="underline">
            /api/health
          </a>
        </p>
      </div>
    </main>
  );
}
