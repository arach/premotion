'use client';

import { useCatalog } from '../Provider';
import { AssetsView } from './AssetsView';
import { CatalogGrid } from './CatalogGrid';
import { CodePanel } from './CodePanel';
import { FrameViewer } from './FrameViewer';
import { FramesView } from './FramesView';
import { FxBrowser } from './FxBrowser';
import { LogoStudio } from './LogoStudio';
import { MusicView } from './MusicView';
import { NewComposition } from './NewComposition';
import { PromptLibrary } from './PromptLibrary';
import { QueueView } from './QueueView';
import { SettingsView } from './SettingsView';
import { VideoDetail } from './VideoDetail';

export function CatalogContent() {
  const { loading, selectedVideo, frameIndex, viewingFile, view } = useCatalog();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-white/20 text-[12px] font-mono tracking-wider uppercase">
        Loading catalog…
      </div>
    );
  }

  if (view === 'new' || view === 'new-music') {
    return <NewComposition initialMode={view === 'new-music' ? 'music' : undefined} />;
  }

  if (view === 'queue') {
    return <QueueView />;
  }

  if (view === 'assets') {
    if (selectedVideo) return <VideoDetail video={selectedVideo} />;
    return <AssetsView />;
  }

  if (view === 'frames') {
    return <FramesView />;
  }

  if (view === 'fx') {
    return <FxBrowser />;
  }

  if (view === 'music') {
    return <MusicView />;
  }

  if (view === 'logos') {
    return <LogoStudio />;
  }

  if (view === 'prompts') {
    return <PromptLibrary />;
  }

  if (view === 'settings') {
    return <SettingsView />;
  }

  if (viewingFile) {
    return <CodePanel />;
  }

  return (
    <>
      {selectedVideo && frameIndex != null && <FrameViewer />}
      {selectedVideo ? <VideoDetail video={selectedVideo} /> : <CatalogGrid />}
    </>
  );
}
