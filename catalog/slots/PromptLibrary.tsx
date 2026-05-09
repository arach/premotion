'use client';

import { useCallback, useMemo, useState } from 'react';
import { BookOpen, Check, Copy, Music, Film, Sparkles, Tag } from 'lucide-react';

// ─── Data ─────────────────────────────────────────────────────────────────────

type PromptCategory = 'video' | 'music' | 'lyrics' | 'system';

interface Prompt {
  id: string;
  title: string;
  category: PromptCategory;
  subcategory: string;
  text: string;
  tags: string[];
  notes?: string;
}

const PROMPTS: Prompt[] = [
  // ── Video ──────────────────────────────────────────────────────────────────
  {
    id: 'v-product-demo-30s',
    title: 'Product Demo · 30s',
    category: 'video',
    subcategory: 'Product Demo',
    text: 'Create a polished 30 second product demo. Give the important interaction moments breathing room, use tactical labels sparingly, and emphasize the user action clearly.',
    tags: ['demo', '30s', 'product'],
    notes: 'Default video prompt in NewComposition.',
  },
  {
    id: 'v-product-demo-60s',
    title: 'Product Demo · 60s',
    category: 'video',
    subcategory: 'Product Demo',
    text: 'Create a polished 60 second product demo. Open with the key value prop, walk through 2–3 core workflows with clear labels, and close on a moment of delight. Let each beat land before moving on.',
    tags: ['demo', '60s', 'product'],
  },
  {
    id: 'v-feature-highlight',
    title: 'Feature Highlight',
    category: 'video',
    subcategory: 'Product Demo',
    text: 'Create a focused feature highlight. Open with the problem, show the solution in one fluid action sequence, and end on the outcome. Keep it under 20 seconds. No narration — let the UI speak.',
    tags: ['demo', 'feature', 'short'],
  },
  {
    id: 'v-saas-montage',
    title: 'SaaS Highlights Montage',
    category: 'video',
    subcategory: 'Montage',
    text: 'Create a fast-paced highlights montage from the source clips. Lead with the most visually striking moment, cut to a rhythm of 2–4 seconds per beat, favor action over static screens, and end on a confident hold.',
    tags: ['montage', 'reel', 'fast'],
  },
  {
    id: 'v-ambient-loop',
    title: 'Ambient Brand Loop',
    category: 'video',
    subcategory: 'Abstract',
    text: 'Create a looping ambient brand video. No UI detail needed — focus on color, motion blur, light leaks, and a sense of effortless forward momentum. Should feel premium and calm, like a product landing page hero.',
    tags: ['ambient', 'loop', 'branding'],
  },
  {
    id: 'v-ai-demo',
    title: 'AI Feature Demo',
    category: 'video',
    subcategory: 'Product Demo',
    text: 'Create a demo highlighting an AI-powered feature. Show the before state briefly, then the AI action, then the result. Emphasize the speed and quality of the output. Use subtle but clear visual indicators for AI activity.',
    tags: ['demo', 'ai', 'feature'],
  },
  {
    id: 'v-onboarding',
    title: 'Onboarding Walkthrough',
    category: 'video',
    subcategory: 'Product Demo',
    text: 'Create a friendly onboarding walkthrough. Start from zero, show 3 key setup steps with generous pauses, use warm labels to reassure the viewer. End on the first "aha" moment. Feel approachable, not tutorial-dry.',
    tags: ['onboarding', 'walkthrough', 'tutorial'],
  },
  {
    id: 'v-storyboard-cinematic',
    title: 'Cinematic Storyboard',
    category: 'video',
    subcategory: 'Storyboard',
    text: 'Treat each shot as a cinematic frame. Suggest camera angles, transitions, and pacing notes. Favor establishing → mid → close-up structure. Include beat timing relative to the audio.',
    tags: ['storyboard', 'cinematic', 'pacing'],
  },

  // ── Music ──────────────────────────────────────────────────────────────────
  {
    id: 'm-jp-hiphop-demo',
    title: 'Tokyo Demo · Japanese Hip-Hop',
    category: 'music',
    subcategory: 'Hip-Hop',
    text: 'Japanese hip hop, Tokyo night drive, tight trap drums, warm 808 bass, shamisen plucks, sparse koto accents, confident product demo energy, complete 30 second hook with intro and outro',
    tags: ['japanese', 'hip-hop', 'trap', '30s'],
    notes: 'Default soundtrack prompt in NewComposition.',
  },
  {
    id: 'm-synthwave-ui',
    title: 'Synthwave · UI Demo',
    category: 'music',
    subcategory: 'Synthwave',
    text: 'Futuristic synthwave, clean digital energy, arpeggiated lead synth, punchy kick, sidechain compression, cool blue atmosphere, product demo confidence, complete 30 second loop with clear intro',
    tags: ['synthwave', 'electronic', 'ui', '30s'],
  },
  {
    id: 'm-minimal-ambient',
    title: 'Minimal Ambient · Focus',
    category: 'music',
    subcategory: 'Ambient',
    text: 'Minimal ambient, soft pad textures, slow filter sweeps, no percussion, warm and focused, background listening for deep work, 60 second loop, fades gracefully at end',
    tags: ['ambient', 'minimal', 'focus', '60s'],
  },
  {
    id: 'm-cinematic-trailer',
    title: 'Cinematic Trailer',
    category: 'music',
    subcategory: 'Cinematic',
    text: 'Cinematic trailer music, orchestral hits, rising tension, climactic brass swell, punchy hybrid drums, epic product reveal energy, 30 seconds, builds to peak at 20s then releases',
    tags: ['cinematic', 'trailer', 'epic', '30s'],
  },
  {
    id: 'm-lofi-chill',
    title: 'Lo-Fi Chill · Demo BG',
    category: 'music',
    subcategory: 'Lo-Fi',
    text: 'Lo-fi hip hop, dusty vinyl crackle, mellow jazz chords, lazy boom-bap beat, warm and approachable, perfect background for a calm software demo, 45 second loop',
    tags: ['lofi', 'hip-hop', 'chill', 'background'],
  },
  {
    id: 'm-dark-neon',
    title: 'Dark Neon · Cyberpunk',
    category: 'music',
    subcategory: 'Electronic',
    text: 'Dark neon cyberpunk, dystopian bass stabs, glitchy hi-hats, haunting female vocal chops, neon-drenched atmosphere, fast-paced visual energy, 30 second banger with hard drop',
    tags: ['cyberpunk', 'dark', 'electronic', 'bass'],
  },
  {
    id: 'm-jp-city-pop',
    title: 'City Pop · Retro Japan',
    category: 'music',
    subcategory: 'City Pop',
    text: 'Japanese city pop, 80s retro, warm analog synths, smooth bass, funky guitar strums, summer nostalgia, polished and aspirational, 30 second hook that loops seamlessly',
    tags: ['japanese', 'city-pop', '80s', 'retro'],
  },
  {
    id: 'm-techno-build',
    title: 'Techno Build · Launch',
    category: 'music',
    subcategory: 'Techno',
    text: 'Driving techno, relentless four-on-the-floor kick, industrial synth layers, tension build over 20 seconds then full release, product launch energy, no vocals, pure momentum',
    tags: ['techno', 'electronic', 'launch', 'build'],
  },

  // ── Lyrics ─────────────────────────────────────────────────────────────────
  {
    id: 'l-tokyo-flow',
    title: 'Tokyo Flow · Default',
    category: 'lyrics',
    subcategory: 'Hip-Hop',
    text: `[Intro]
Mouse up, words wake

[Hook]
Te no naka de flow, click kara go
Kotoba ga hashiru, screen ni glow
Review, confirm, then enter the zone
Mouse dake de send, control

[Outro]
Click up, send now
Flow locks in, lights down`,
    tags: ['japanese', 'hip-hop', 'short', 'demo'],
    notes: 'Default lyrics in NewComposition.',
  },
  {
    id: 'l-ai-verse',
    title: 'AI Verse · Product',
    category: 'lyrics',
    subcategory: 'Hip-Hop',
    text: `[Verse]
Type the thought, watch it form
Every word lands like a storm
AI hears it, builds the frame
Nothing manual, nothing tame

[Hook]
One prompt in, the output's clean
Best demo you've ever seen
Click to send, no delays
This is how the future plays`,
    tags: ['ai', 'product', 'hip-hop'],
  },
  {
    id: 'l-neon-tokyo',
    title: 'Neon Tokyo · Ambient',
    category: 'lyrics',
    subcategory: 'Electronic',
    text: `[Verse]
Lights reflect on rain-wet streets
Neon pulse and city beats
Code flows through the midnight air
Digital dreams beyond compare

[Hook]
Tokyo nights, electric dreams
Nothing's quite as fast as it seems
Scroll through futures, screens aglow
Where we're going, only flow`,
    tags: ['japanese', 'neon', 'ambient', 'electronic'],
  },

  // ── System ─────────────────────────────────────────────────────────────────
  {
    id: 's-video-director',
    title: 'Video Director Agent',
    category: 'system',
    subcategory: 'Agent',
    text: `You are a video composition director specializing in SaaS product demos.

You receive screen recordings and output structured Remotion composition specs. Your output should include: scene list with timings, transition types, label placement, music cue points, and any motion graphic notes.

Keep pacing tight — most product demos should be under 45 seconds unless explicitly requested otherwise. Favor action over explanation.`,
    tags: ['system', 'agent', 'director'],
  },
  {
    id: 's-music-producer',
    title: 'Music Producer Agent',
    category: 'system',
    subcategory: 'Agent',
    text: `You are a music producer crafting background tracks for SaaS product demo videos.

Given a video description and vibe, you output a detailed music prompt optimized for AI music generation tools (Suno, Udio). Include: genre, instrumentation, BPM range, mood, structure (intro/hook/outro), duration.

Keep music complementary to the video — it should enhance without distracting.`,
    tags: ['system', 'agent', 'music', 'producer'],
  },
  {
    id: 's-lyrics-writer',
    title: 'Lyrics Writer Agent',
    category: 'system',
    subcategory: 'Agent',
    text: `You write short, punchy song lyrics for AI-generated tracks accompanying product demo videos.

Style: confident, modern, minimal rhyme-forced lines. Mix English and Japanese phrases naturally. Structure with [Intro], [Verse], [Hook], [Outro]. Keep total length under 200 words.

The lyrics should feel like they belong in the product's world — reference the core workflow, not generic hype.`,
    tags: ['system', 'agent', 'lyrics', 'writing'],
  },
];

const CATEGORIES: { key: PromptCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'video', label: 'Video' },
  { key: 'music', label: 'Music' },
  { key: 'lyrics', label: 'Lyrics' },
  { key: 'system', label: 'System' },
];

const CATEGORY_ICONS: Record<PromptCategory, React.ReactNode> = {
  video: <Film size={11} />,
  music: <Music size={11} />,
  lyrics: <Sparkles size={11} />,
  system: <BookOpen size={11} />,
};

const CATEGORY_COLORS: Record<PromptCategory, string> = {
  video: 'text-cyan-300/70 bg-cyan-400/[0.08] border-cyan-400/20',
  music: 'text-violet-300/70 bg-violet-400/[0.08] border-violet-400/20',
  lyrics: 'text-amber-300/70 bg-amber-400/[0.08] border-amber-400/20',
  system: 'text-emerald-300/70 bg-emerald-400/[0.08] border-emerald-400/20',
};

// ─── PromptCard ───────────────────────────────────────────────────────────────

function PromptCard({ prompt }: { prompt: Prompt }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(prompt.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, [prompt.text]);

  const isMultiline = prompt.text.includes('\n');
  const preview = isMultiline
    ? prompt.text.split('\n').filter(Boolean)[0]
    : prompt.text.length > 120
    ? prompt.text.slice(0, 120) + '…'
    : prompt.text;

  return (
    <div
      onClick={() => setExpanded(e => !e)}
      className="flex flex-col gap-2 p-3 rounded border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] cursor-pointer transition-colors"
    >
      {/* Header */}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12px] font-medium text-white/80">{prompt.title}</span>
            <span className={`text-[8px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border flex items-center gap-1 ${CATEGORY_COLORS[prompt.category]}`}>
              {CATEGORY_ICONS[prompt.category]}
              {prompt.subcategory}
            </span>
          </div>
          {prompt.notes && (
            <p className="text-[9px] font-mono text-white/28 mt-0.5">{prompt.notes}</p>
          )}
        </div>

        <button
          onClick={handleCopy}
          className={`shrink-0 flex items-center gap-1.5 px-2 py-1 rounded border text-[9px] font-mono uppercase tracking-wider transition-all ${
            copied
              ? 'bg-emerald-400/[0.15] border-emerald-400/30 text-emerald-300'
              : 'bg-white/[0.04] border-white/[0.07] text-white/35 hover:bg-white/[0.08] hover:text-white/65'
          }`}
        >
          {copied ? <Check size={9} /> : <Copy size={9} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {/* Text */}
      <div className="text-[11px] text-white/50 leading-relaxed font-mono">
        {expanded ? (
          <pre className="whitespace-pre-wrap font-mono text-[11px] text-white/55">{prompt.text}</pre>
        ) : (
          <span>{preview}</span>
        )}
      </div>

      {/* Tags */}
      <div className="flex items-center gap-1 flex-wrap">
        <Tag size={8} className="text-white/18 shrink-0" />
        {prompt.tags.map(tag => (
          <span key={tag} className="text-[8px] font-mono text-white/25 bg-white/[0.04] px-1.5 py-0.5 rounded">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── PromptLibrary ────────────────────────────────────────────────────────────

export function PromptLibrary() {
  const [category, setCategory] = useState<PromptCategory | 'all'>('all');
  const [search, setSearch] = useState('');

  const categoryCounts = useMemo(() => {
    const m: Record<string, number> = { all: PROMPTS.length };
    PROMPTS.forEach(p => { m[p.category] = (m[p.category] ?? 0) + 1; });
    return m;
  }, []);

  const filtered = useMemo(() => {
    let list = PROMPTS;
    if (category !== 'all') list = list.filter(p => p.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        `${p.title} ${p.subcategory} ${p.text} ${p.tags.join(' ')}`.toLowerCase().includes(q)
      );
    }
    return list;
  }, [category, search]);

  const grouped = useMemo(() => {
    const m = new Map<string, Prompt[]>();
    filtered.forEach(p => {
      const key = `${p.category}:${p.subcategory}`;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(p);
    });
    return m;
  }, [filtered]);

  return (
    <div className="h-full flex overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[160px] shrink-0 border-r border-white/[0.06] flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto frame-scrollbar py-2">
          <div className="px-3 py-1.5 text-[9px] font-mono uppercase tracking-[0.15em] text-white/25">Category</div>
          {CATEGORIES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setCategory(key)}
              className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors ${
                category === key
                  ? 'bg-white/[0.06] text-white/85'
                  : 'text-white/40 hover:bg-white/[0.03] hover:text-white/60'
              }`}
            >
              <div className="flex items-center gap-2">
                {key !== 'all' && (
                  <span className={CATEGORY_COLORS[key as PromptCategory].split(' ')[0]}>
                    {CATEGORY_ICONS[key as PromptCategory]}
                  </span>
                )}
                <span className="text-[11px]">{label}</span>
              </div>
              <span className="text-[9px] font-mono text-white/22 shrink-0 ml-1">{categoryCounts[key] ?? 0}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Search bar */}
        <div className="shrink-0 px-4 py-2.5 border-b border-white/[0.06]">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search prompts…"
            className="w-full bg-white/[0.04] border border-white/[0.07] rounded-sm px-3 py-1.5 text-[11px] font-mono text-white/70 placeholder:text-white/20 outline-none focus:border-cyan-400/30 transition-colors"
          />
        </div>

        {/* Prompt grid */}
        <div className="flex-1 min-h-0 overflow-y-auto frame-scrollbar p-4">
          {filtered.length === 0 ? (
            <div className="py-20 text-center text-[11px] font-mono text-white/20">No prompts found</div>
          ) : search.trim() || category !== 'all' ? (
            <div className="grid gap-2.5 grid-cols-1 xl:grid-cols-2">
              {filtered.map(p => <PromptCard key={p.id} prompt={p} />)}
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {Array.from(grouped.entries()).map(([key, prompts]) => {
                const [cat, sub] = key.split(':') as [PromptCategory, string];
                return (
                  <section key={key}>
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className={`flex items-center gap-1 text-[9px] font-mono uppercase tracking-[0.12em] ${CATEGORY_COLORS[cat].split(' ')[0]}`}>
                        {CATEGORY_ICONS[cat]}
                        {cat}
                      </span>
                      <span className="text-[10px] font-mono text-white/35">{sub}</span>
                      <div className="flex-1 h-px bg-white/[0.05]" />
                      <span className="text-[9px] font-mono text-white/20">{prompts.length}</span>
                    </div>
                    <div className="grid gap-2.5 grid-cols-1 xl:grid-cols-2">
                      {prompts.map(p => <PromptCard key={p.id} prompt={p} />)}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
