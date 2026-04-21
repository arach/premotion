'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Check, FileCode2, Save } from 'lucide-react';
import { CodeEditor } from '@hudsonos/sdk/controls';
import type { CodeLanguage } from '@hudsonos/sdk/controls';
import { useCatalog } from '../Provider';

function langFromPath(path: string): CodeLanguage {
  if (path.endsWith('.tsx') || path.endsWith('.ts')) return 'typescript';
  if (path.endsWith('.js') || path.endsWith('.jsx')) return 'javascript';
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.css')) return 'css';
  return 'plain';
}

export function CodePanel() {
  const { viewingFile, closeFile } = useCatalog();
  const [code, setCode] = useState<string>('');
  const [savedCode, setSavedCode] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const dirty = code !== savedCode;

  useEffect(() => {
    if (!viewingFile) return;
    setLoading(true);
    setError(null);
    fetch(`/api/source?path=${encodeURIComponent(viewingFile)}`)
      .then(res => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      })
      .then(data => {
        setCode(data.content);
        setSavedCode(data.content);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [viewingFile]);

  const save = useCallback(async (content: string) => {
    if (!viewingFile) return;
    setSaving(true);
    try {
      const res = await fetch('/api/source', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: viewingFile, content }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setSavedCode(content);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [viewingFile]);

  if (!viewingFile) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.06]">
        <button onClick={closeFile} className="text-white/30 hover:text-white/60 transition-colors">
          <ArrowLeft size={14} />
        </button>
        <FileCode2 size={12} className="text-white/30" />
        <span className="text-[12px] font-mono text-white/60 truncate flex-1">
          {viewingFile}
          {dirty && <span className="text-amber-400/70 ml-1.5">*</span>}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {justSaved && (
            <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400/70">
              <Check size={10} /> Saved
            </span>
          )}
          {error && !loading && (
            <span className="text-[10px] font-mono text-red-400/60">{error}</span>
          )}
          <button
            onClick={() => save(code)}
            disabled={!dirty || saving}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-[10px] font-mono uppercase tracking-wider transition-all ${
              dirty
                ? 'bg-cyan-400/[0.08] border border-cyan-400/20 text-cyan-300/90 hover:bg-cyan-400/[0.12]'
                : 'bg-white/[0.02] border border-white/[0.06] text-white/20 cursor-not-allowed'
            }`}
          >
            <Save size={10} />
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full text-white/20 text-[11px] font-mono uppercase tracking-wider bg-[#0d0d0d]">
            Loading…
          </div>
        ) : (
          <CodeEditor
            code={code}
            language={langFromPath(viewingFile)}
            filename={undefined}
            onSave={save}
            onChange={setCode}
            showLineNumbers
            className="h-full border-0 rounded-none"
          />
        )}
      </div>

      {/* Status bar */}
      <div className="shrink-0 flex items-center justify-between px-4 py-1.5 border-t border-white/[0.06] bg-white/[0.01]">
        <span className="text-[9px] font-mono text-white/25">
          {code.split('\n').length} lines
          {dirty && ' · modified'}
        </span>
        <span className="text-[9px] font-mono text-white/25">
          ⌘S to save
        </span>
      </div>
    </div>
  );
}
