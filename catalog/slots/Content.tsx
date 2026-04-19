'use client';

import { useCatalog } from '../Provider';
import { CatalogGrid } from './CatalogGrid';
import { FrameViewer } from './FrameViewer';
import { ReviewPlayer } from './ReviewPlayer';
import { VideoDetail } from './VideoDetail';

export function CatalogContent() {
  const { loading, selectedVideo, frameIndex, reviewOpen } = useCatalog();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-white/20 text-[12px] font-mono tracking-wider uppercase">
        Loading catalog…
      </div>
    );
  }

  return (
    <>
      {selectedVideo && frameIndex != null && <FrameViewer />}
      {selectedVideo && reviewOpen && <ReviewPlayer />}
      {selectedVideo ? <VideoDetail video={selectedVideo} /> : <CatalogGrid />}
    </>
  );
}
