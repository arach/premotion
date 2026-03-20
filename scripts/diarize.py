#!/usr/bin/env python3
"""
Speaker diarization + transcription script using pyannote and whisper.

Usage:
    python diarize.py <video_or_audio_file> [--output <output_dir>]

Requires:
    - HuggingFace token with access to pyannote models
    - Set HF_TOKEN environment variable or create ~/.huggingface/token

First time setup:
    1. Accept pyannote terms at https://huggingface.co/pyannote/speaker-diarization-3.1
    2. Accept pyannote terms at https://huggingface.co/pyannote/segmentation-3.0
    3. Set your HF token: export HF_TOKEN=your_token_here
"""

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

def check_dependencies():
    """Check if required packages are installed."""
    missing = []
    try:
        import torch
    except ImportError:
        missing.append("torch")
    try:
        import whisper
    except ImportError:
        missing.append("openai-whisper")
    try:
        from pyannote.audio import Pipeline
    except ImportError:
        missing.append("pyannote.audio")

    if missing:
        print(f"Missing dependencies: {', '.join(missing)}")
        print("Install with: pip install -r scripts/requirements.txt")
        sys.exit(1)

def extract_audio(video_path: Path, output_path: Path) -> Path:
    """Extract audio from video file using ffmpeg."""
    audio_path = output_path / f"{video_path.stem}.wav"

    if audio_path.exists():
        print(f"Audio already extracted: {audio_path}")
        return audio_path

    print(f"Extracting audio from {video_path}...")
    cmd = [
        "ffmpeg", "-i", str(video_path),
        "-vn",  # no video
        "-acodec", "pcm_s16le",  # PCM 16-bit
        "-ar", "16000",  # 16kHz sample rate (required by whisper)
        "-ac", "1",  # mono
        "-y",  # overwrite
        str(audio_path)
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    print(f"Audio extracted to: {audio_path}")
    return audio_path

def run_diarization(audio_path: Path, hf_token: str):
    """Run pyannote speaker diarization."""
    from pyannote.audio import Pipeline

    print("Loading pyannote pipeline...")
    pipeline = Pipeline.from_pretrained(
        "pyannote/speaker-diarization-3.1",
        token=hf_token
    )

    # Use GPU if available
    import torch
    if torch.cuda.is_available():
        pipeline.to(torch.device("cuda"))
    elif torch.backends.mps.is_available():
        pipeline.to(torch.device("mps"))

    print("Running speaker diarization...")
    result = pipeline(str(audio_path))

    # Handle both old and new pyannote API
    diarization = getattr(result, 'speaker_diarization', result)

    # Convert to list of segments
    segments = []
    for turn, _, speaker in diarization.itertracks(yield_label=True):
        segments.append({
            "start": turn.start,
            "end": turn.end,
            "speaker": speaker
        })

    print(f"Found {len(set(s['speaker'] for s in segments))} speakers")
    return segments

def run_transcription(audio_path: Path, model_size: str = "base"):
    """Run whisper transcription."""
    import whisper

    print(f"Loading whisper model ({model_size})...")
    model = whisper.load_model(model_size)

    print("Transcribing audio...")
    result = model.transcribe(
        str(audio_path),
        word_timestamps=True,
        verbose=False,
        language="en"
    )

    return result

def merge_diarization_transcription(diarization_segments, transcription_result):
    """Merge speaker labels with transcription."""
    merged = []

    for segment in transcription_result.get("segments", []):
        start = segment["start"]
        end = segment["end"]
        text = segment["text"].strip()

        # Find the speaker for this segment
        speaker = "UNKNOWN"
        max_overlap = 0

        for d_seg in diarization_segments:
            # Calculate overlap
            overlap_start = max(start, d_seg["start"])
            overlap_end = min(end, d_seg["end"])
            overlap = max(0, overlap_end - overlap_start)

            if overlap > max_overlap:
                max_overlap = overlap
                speaker = d_seg["speaker"]

        merged.append({
            "start": start,
            "end": end,
            "speaker": speaker,
            "text": text
        })

    return merged

def format_timestamp(seconds: float) -> str:
    """Format seconds as SRT timestamp."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"

def write_srt(segments, output_path: Path):
    """Write segments to SRT file."""
    with open(output_path, "w") as f:
        for i, seg in enumerate(segments, 1):
            f.write(f"{i}\n")
            f.write(f"{format_timestamp(seg['start'])} --> {format_timestamp(seg['end'])}\n")
            f.write(f"[{seg['speaker']}] {seg['text']}\n")
            f.write("\n")
    print(f"SRT written to: {output_path}")

def write_json(segments, output_path: Path):
    """Write segments to JSON file."""
    with open(output_path, "w") as f:
        json.dump(segments, f, indent=2)
    print(f"JSON written to: {output_path}")

def main():
    parser = argparse.ArgumentParser(description="Speaker diarization + transcription")
    parser.add_argument("input", help="Video or audio file to process")
    parser.add_argument("--output", "-o", help="Output directory", default="./transcripts")
    parser.add_argument("--model", "-m", help="Whisper model size", default="base",
                       choices=["tiny", "base", "small", "medium", "large"])
    parser.add_argument("--skip-diarization", action="store_true",
                       help="Skip speaker diarization (transcription only)")
    args = parser.parse_args()

    check_dependencies()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: File not found: {input_path}")
        sys.exit(1)

    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Get HF token
    hf_token = os.environ.get("HF_TOKEN")
    if not hf_token:
        token_file = Path.home() / ".huggingface" / "token"
        if token_file.exists():
            hf_token = token_file.read_text().strip()

    if not hf_token and not args.skip_diarization:
        print("Warning: No HuggingFace token found. Set HF_TOKEN or use --skip-diarization")
        print("Get token at: https://huggingface.co/settings/tokens")
        sys.exit(1)

    # Extract audio if video
    if input_path.suffix.lower() in [".mp4", ".mov", ".avi", ".mkv", ".webm"]:
        audio_path = extract_audio(input_path, output_dir)
    else:
        audio_path = input_path

    # Run transcription
    transcription = run_transcription(audio_path, args.model)

    # Run diarization (if not skipped)
    if args.skip_diarization:
        segments = [{
            "start": s["start"],
            "end": s["end"],
            "speaker": "SPEAKER",
            "text": s["text"].strip()
        } for s in transcription.get("segments", [])]
    else:
        diarization = run_diarization(audio_path, hf_token)
        segments = merge_diarization_transcription(diarization, transcription)

    # Write outputs
    base_name = input_path.stem
    write_json(segments, output_dir / f"{base_name}.json")
    write_srt(segments, output_dir / f"{base_name}.srt")

    print("\nDone!")
    print(f"Full text:\n")
    current_speaker = None
    for seg in segments:
        if seg["speaker"] != current_speaker:
            current_speaker = seg["speaker"]
            print(f"\n[{current_speaker}]")
        print(seg["text"], end=" ")
    print()

if __name__ == "__main__":
    main()
