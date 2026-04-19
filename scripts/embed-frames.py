#!/usr/bin/env python3
"""
Embed video keyframes using CLIP (ViT-B/32) for semantic search.

Usage:
    python embed-frames.py                    # embed all storyboard frames
    python embed-frames.py --search "dashboard with stats"  # text search
    python embed-frames.py --search "diff view red green"   # text search
    python embed-frames.py --reindex          # force re-embed everything

Stores embeddings in catalog/embeddings.json alongside frame metadata.
"""

import argparse
import json
import os
import sys
import glob
from pathlib import Path

import torch
import open_clip
from PIL import Image
import numpy as np

SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
DEMOS_DIR = PROJECT_DIR / "public" / "demos"
CATALOG_DIR = PROJECT_DIR / "catalog"
EMBEDDINGS_FILE = CATALOG_DIR / "embeddings.json"

# Use ViT-B/32 — fast, good enough for frame search at our scale
MODEL_NAME = "ViT-B-32"
PRETRAINED = "openai"


def load_model():
    """Load CLIP model and preprocessing."""
    print("Loading CLIP model (ViT-B/32)...")
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    model, _, preprocess = open_clip.create_model_and_transforms(
        MODEL_NAME, pretrained=PRETRAINED
    )
    model = model.to(device)
    model.eval()
    tokenizer = open_clip.get_tokenizer(MODEL_NAME)
    print(f"  → Model loaded on {device}")
    return model, preprocess, tokenizer, device


def embed_image(model, preprocess, image_path, device):
    """Embed a single image, return 512-dim vector."""
    img = Image.open(image_path).convert("RGB")
    img_tensor = preprocess(img).unsqueeze(0).to(device)
    with torch.no_grad():
        features = model.encode_image(img_tensor)
        features = features / features.norm(dim=-1, keepdim=True)
    return features.cpu().numpy()[0].tolist()


def embed_text(model, tokenizer, text, device):
    """Embed a text query, return 512-dim vector."""
    tokens = tokenizer([text]).to(device)
    with torch.no_grad():
        features = model.encode_text(tokens)
        features = features / features.norm(dim=-1, keepdim=True)
    return features.cpu().numpy()[0].tolist()


def cosine_similarity(a, b):
    """Cosine similarity between two vectors."""
    a = np.array(a)
    b = np.array(b)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


def find_storyboard_frames():
    """Find all keyframe images in storyboard directories."""
    frames = []
    storyboard_dirs = sorted(glob.glob(str(DEMOS_DIR / "storyboard-*")))

    for sdir in storyboard_dirs:
        sdir_path = Path(sdir)
        storyboard_name = sdir_path.name

        # Read EDL if available for scene metadata
        edl_path = sdir_path / "edl.json"
        edl = None
        if edl_path.exists():
            with open(edl_path) as f:
                edl = json.load(f)

        for frame_file in sorted(glob.glob(str(sdir_path / "frame_*.jpg"))):
            frame_path = Path(frame_file)
            frame_idx = int(frame_path.stem.split("_")[1]) - 1

            # Get scene info from EDL if available
            scene_desc = ""
            scene_time = 0
            if edl and frame_idx < len(edl.get("scenes", [])):
                scene = edl["scenes"][frame_idx]
                scene_desc = scene.get("description", "")
                scene_time = scene.get("start", 0)

            frames.append({
                "path": str(frame_path),
                "storyboard": storyboard_name,
                "frame": frame_path.name,
                "index": frame_idx,
                "time": scene_time,
                "description": scene_desc,
                "source": edl.get("source", "") if edl else "",
            })

    return frames


def index_frames(reindex=False):
    """Embed all storyboard frames and save to catalog."""
    # Load existing embeddings
    existing = {}
    if EMBEDDINGS_FILE.exists() and not reindex:
        with open(EMBEDDINGS_FILE) as f:
            data = json.load(f)
            existing = {e["path"]: e for e in data.get("frames", [])}

    frames = find_storyboard_frames()
    new_count = sum(1 for f in frames if f["path"] not in existing)

    if new_count == 0 and not reindex:
        print(f"All {len(frames)} frames already embedded. Use --reindex to force.")
        return

    print(f"Found {len(frames)} keyframes across {len(set(f['storyboard'] for f in frames))} storyboards")
    print(f"  → {new_count} new frames to embed")

    model, preprocess, tokenizer, device = load_model()

    results = []
    for i, frame in enumerate(frames):
        if frame["path"] in existing and not reindex:
            results.append(existing[frame["path"]])
            continue

        sys.stdout.write(f"\r  → Embedding frame {i+1}/{len(frames)}...")
        sys.stdout.flush()

        embedding = embed_image(model, preprocess, frame["path"], device)
        frame["embedding"] = embedding
        results.append(frame)

    print(f"\n  → {len(results)} frames embedded ({MODEL_NAME})")

    # Save
    CATALOG_DIR.mkdir(exist_ok=True)
    output = {
        "_meta": {
            "model": MODEL_NAME,
            "pretrained": PRETRAINED,
            "dimensions": len(results[0]["embedding"]) if results else 0,
            "totalFrames": len(results),
            "storyboards": len(set(f["storyboard"] for f in results)),
        },
        "frames": results,
    }
    with open(EMBEDDINGS_FILE, "w") as f:
        json.dump(output, f)
    size_mb = EMBEDDINGS_FILE.stat().st_size / 1024 / 1024
    print(f"  → Saved to {EMBEDDINGS_FILE.name} ({size_mb:.1f} MB)")


def search(query, top_k=10):
    """Search frames by text query."""
    if not EMBEDDINGS_FILE.exists():
        print("No embeddings found. Run without --search first to index.")
        sys.exit(1)

    with open(EMBEDDINGS_FILE) as f:
        data = json.load(f)

    frames = data["frames"]
    print(f"Searching {len(frames)} frames for: \"{query}\"\n")

    model, preprocess, tokenizer, device = load_model()
    query_vec = embed_text(model, tokenizer, query, device)

    # Score all frames
    scored = []
    for frame in frames:
        sim = cosine_similarity(query_vec, frame["embedding"])
        scored.append((sim, frame))

    scored.sort(key=lambda x: x[0], reverse=True)

    # Print results
    print(f"{'#':>3}  {'Score':>6}  {'Storyboard':<45}  {'Frame':<15}  {'Time':>6}  Description")
    print("─" * 120)
    for i, (sim, frame) in enumerate(scored[:top_k]):
        time_str = f"{frame['time']:.0f}s" if frame.get("time") else ""
        desc = (frame.get("description") or "")[:50]
        print(f"{i+1:>3}  {sim:>6.3f}  {frame['storyboard']:<45}  {frame['frame']:<15}  {time_str:>6}  {desc}")

    return scored[:top_k]


def main():
    parser = argparse.ArgumentParser(description="CLIP frame embeddings for video catalog")
    parser.add_argument("--search", "-s", help="Text query to search frames")
    parser.add_argument("--reindex", action="store_true", help="Force re-embed everything")
    parser.add_argument("--top", "-k", type=int, default=10, help="Number of results (default: 10)")
    args = parser.parse_args()

    if args.search:
        search(args.search, args.top)
    else:
        index_frames(args.reindex)


if __name__ == "__main__":
    main()
