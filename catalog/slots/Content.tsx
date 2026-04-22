'use client';

import { useCatalog } from '../Provider';
import { AssetsView } from './AssetsView';
import { CatalogGrid } from './CatalogGrid';
import { CodePanel } from './CodePanel';
import { FrameViewer } from './FrameViewer';
import { MusicView } from './MusicView';
import { NewComposition } from './NewComposition';
import { QueueView } from './QueueView';
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

  if (view === 'new') {
    return <NewComposition />;
  }

  if (view === 'queue') {
    return <QueueView />;
  }

  if (view === 'assets') {
    return <AssetsView />;
  }

  if (view === 'music') {
    return <MusicView />;
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
