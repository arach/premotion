'use client';

import { useMemo } from 'react';
import { Music, Play } from 'lucide-react';
import { useCatalog } from '../Provider';

export function MusicView() {
  const { data } = useCatalog();

  const audioFiles = useMemo(() => {
    const vids = data?.videos ?? [];
    return vids.filter(v =>
      v.filename?.endsWith('.mp3') || v.filename?.endsWith('.wav') || v.filename?.endsWith('.aac')
    );
  }, [data]);

  return (
    <div className="px-6 py-5">
      <div className="flex items-center gap-6 pb-5 mb-5 border-b border-white/[0.04]">
        <div className="flex flex-col">
          <span className="text-[22px] font-mono tabular-nums text-white/80">{audioFiles.length}</span>
          <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-white/25 mt-0.5">Audio tracks</span>
        </div>
      </div>

      {audioFiles.length === 0 ? (
        <div className="py-16 text-center">
          <Music size={32} className="mx-auto mb-4 text-white/10" />
          <div className="text-white/20 text-[12px] font-mono tracking-wider uppercase">No audio assets in catalog</div>
          <div className="text-white/12 text-[11px] font-mono mt-2">
            Audio files (.mp3, .wav) in static/demos/ will appear here
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {audioFiles.map(a => (
            <div
              key={a.id}
              className="flex items-center gap-3 px-4 py-3 rounded-sm border border-white/[0.04] hover:border-white/[0.1] bg-white/[0.015] hover:bg-white/[0.03] transition-colors"
            >
              <Music size={14} className="text-white/25 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-white/75 truncate">{a.id}</div>
                <div className="text-[10px] font-mono text-white/30 mt-0.5">{a.filename}</div>
              </div>
              <span className="text-[10px] font-mono text-white/30">{a.sizeMB?.toFixed(1)} MB</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
