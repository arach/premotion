'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Eye, EyeOff, Loader2 } from 'lucide-react';

interface ProviderForm {
  format: 'anthropic' | 'openai';
  baseUrl: string;
  apiKey: string;
  model: string;
  name: string;
}

const PRESETS: { label: string; config: Partial<ProviderForm> }[] = [
  { label: 'MiniMax (Anthropic-compat)', config: { format: 'anthropic', baseUrl: 'https://api.minimax.io/anthropic', model: 'MiniMax-M2.7', name: 'MiniMax' } },
  { label: 'Anthropic', config: { format: 'anthropic', baseUrl: '', model: 'claude-sonnet-4-20250514', name: 'Anthropic' } },
  { label: 'OpenAI', config: { format: 'openai', baseUrl: '', model: 'gpt-4o', name: 'OpenAI' } },
  { label: 'Groq', config: { format: 'openai', baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile', name: 'Groq' } },
  { label: 'Together', config: { format: 'openai', baseUrl: 'https://api.together.xyz/v1', model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', name: 'Together' } },
  { label: 'Fireworks', config: { format: 'openai', baseUrl: 'https://api.fireworks.ai/inference/v1', model: 'accounts/fireworks/models/llama-v3p3-70b-instruct', name: 'Fireworks' } },
  { label: 'DeepSeek', config: { format: 'openai', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat', name: 'DeepSeek' } },
];

export function SettingsView() {
  const [form, setForm] = useState<ProviderForm>({
    format: 'anthropic',
    baseUrl: '',
    apiKey: '',
    model: '',
    name: '',
  });
  const [hasKey, setHasKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [keyEdited, setKeyEdited] = useState(false);

  useEffect(() => {
    fetch('/api/settings/provider')
      .then(r => r.json())
      .then(data => {
        setForm({
          format: data.format ?? 'anthropic',
          baseUrl: data.baseUrl ?? '',
          apiKey: '',
          model: data.model ?? '',
          name: data.name ?? '',
        });
        setHasKey(data.hasKey ?? false);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const update = useCallback((patch: Partial<ProviderForm>) => {
    setForm(f => ({ ...f, ...patch }));
    setSaved(false);
  }, []);

  const applyPreset = useCallback((preset: typeof PRESETS[number]) => {
    setForm(f => ({ ...f, ...preset.config, apiKey: f.apiKey }));
    setKeyEdited(false);
    setSaved(false);
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    const body: Record<string, unknown> = {
      format: form.format,
      baseUrl: form.baseUrl,
      model: form.model,
      name: form.name,
    };
    if (keyEdited && form.apiKey) {
      body.apiKey = form.apiKey;
    }
    try {
      const res = await fetch('/api/settings/provider', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setHasKey(data.hasKey);
        setSaved(true);
        setKeyEdited(false);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }, [form, keyEdited]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-white/20 text-[12px] font-mono tracking-wider uppercase">
        Loading settings…
      </div>
    );
  }

  return (
    <div className="px-6 py-5 max-w-xl">
      <h2 className="text-[16px] font-medium text-white/90 mb-1">Model Provider</h2>
      <p className="text-[11px] text-white/35 mb-6">
        Bring your own API key. Works with any provider that speaks the Anthropic or OpenAI wire format.
      </p>

      {/* Presets */}
      <div className="mb-6">
        <label className="text-[9px] font-mono uppercase tracking-[0.15em] text-white/25 mb-2 block">
          Quick setup
        </label>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className={`px-2.5 py-1.5 text-[10px] font-mono rounded-sm border transition-colors ${
                form.name === p.config.name && form.format === p.config.format
                  ? 'bg-cyan-500/10 text-cyan-300 border-cyan-400/20'
                  : 'text-white/40 hover:text-white/60 border-white/[0.06] hover:border-white/[0.12] bg-white/[0.02]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Format */}
      <Field label="Wire format">
        <div className="flex gap-2">
          {(['anthropic', 'openai'] as const).map(f => (
            <button
              key={f}
              onClick={() => update({ format: f })}
              className={`flex-1 px-3 py-2 text-[11px] font-mono rounded-sm border transition-colors ${
                form.format === f
                  ? 'bg-white/[0.06] text-white/80 border-white/[0.15]'
                  : 'text-white/30 border-white/[0.06] hover:border-white/[0.1] hover:text-white/50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </Field>

      {/* Base URL */}
      <Field label="Base URL" hint="Leave empty for the provider's default endpoint">
        <input
          type="text"
          value={form.baseUrl}
          onChange={e => update({ baseUrl: e.target.value })}
          placeholder={form.format === 'anthropic' ? 'https://api.anthropic.com' : 'https://api.openai.com/v1'}
          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-sm px-3 py-2 text-[12px] font-mono text-white/70 placeholder:text-white/15 outline-none focus:border-white/[0.2] transition-colors"
        />
      </Field>

      {/* API Key */}
      <Field label="API Key">
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={keyEdited ? form.apiKey : (hasKey ? '••••••••••••••••' : '')}
            onChange={e => { update({ apiKey: e.target.value }); setKeyEdited(true); }}
            onFocus={() => { if (!keyEdited) { update({ apiKey: '' }); setKeyEdited(true); } }}
            placeholder="sk-..."
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-sm px-3 py-2 pr-10 text-[12px] font-mono text-white/70 placeholder:text-white/15 outline-none focus:border-white/[0.2] transition-colors"
          />
          <button
            onClick={() => setShowKey(s => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
          >
            {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        {hasKey && !keyEdited && (
          <div className="text-[10px] text-emerald-400/60 mt-1 font-mono">Key configured</div>
        )}
      </Field>

      {/* Model */}
      <Field label="Model ID">
        <input
          type="text"
          value={form.model}
          onChange={e => update({ model: e.target.value })}
          placeholder="e.g. MiniMax-M2.7, gpt-4o, claude-sonnet-4-20250514"
          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-sm px-3 py-2 text-[12px] font-mono text-white/70 placeholder:text-white/15 outline-none focus:border-white/[0.2] transition-colors"
        />
      </Field>

      {/* Display name */}
      <Field label="Display name" hint="Shown in queue activity logs">
        <input
          type="text"
          value={form.name}
          onChange={e => update({ name: e.target.value })}
          placeholder="e.g. MiniMax, Groq, My Provider"
          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-sm px-3 py-2 text-[12px] font-mono text-white/70 placeholder:text-white/15 outline-none focus:border-white/[0.2] transition-colors"
        />
      </Field>

      {/* Save */}
      <button
        onClick={save}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 mt-2 rounded-sm text-[11px] font-mono uppercase tracking-wider bg-cyan-400/[0.08] border border-cyan-400/20 text-cyan-300/90 hover:bg-cyan-400/[0.12] hover:text-cyan-200 transition-all disabled:opacity-50"
      >
        {saving ? <Loader2 size={12} className="animate-spin" /> : saved ? <Check size={12} /> : null}
        {saved ? 'Saved' : 'Save'}
      </button>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="text-[9px] font-mono uppercase tracking-[0.15em] text-white/25 mb-1.5 block">
        {label}
      </label>
      {children}
      {hint && <div className="text-[10px] text-white/15 mt-1">{hint}</div>}
    </div>
  );
}
