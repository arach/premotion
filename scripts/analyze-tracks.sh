#!/bin/bash
# Analyze tracks for duration, energy peaks, and transition-friendly segments
# Uses ffmpeg/ffprobe for audio analysis

TRACKS_DIR="$(dirname "$0")/../public/tracks"
OUTPUT_FILE="$(dirname "$0")/track-analysis.json"

echo "{"
echo '  "tracks": ['

first=true
for track in "$TRACKS_DIR"/*.mp3; do
  filename=$(basename "$track")
  name="${filename%.mp3}"

  if [ "$first" = true ]; then
    first=false
  else
    echo "    ,"
  fi

  # Get duration
  duration=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$track" 2>/dev/null)
  duration_int=$(printf "%.0f" "$duration")

  # Get basic audio info
  sample_rate=$(ffprobe -v quiet -show_entries stream=sample_rate -of csv=p=0 "$track" 2>/dev/null)
  bitrate=$(ffprobe -v quiet -show_entries format=bit_rate -of csv=p=0 "$track" 2>/dev/null)

  # Analyze volume levels per second using astats
  # This gives us an energy profile to find peaks and drops
  echo "    Analyzing: $name ($duration_int sec)" >&2

  # Get RMS levels per second for energy mapping
  energy_data=$(ffmpeg -i "$track" -af "asegment=timestamps=$(seq 1 $((duration_int - 1)) | tr '\n' '|'),astats=metadata=1:reset=1" -f null - 2>&1 \
    | grep "RMS level" | head -30)

  # Detect silence (potential transition points)
  silence_data=$(ffmpeg -i "$track" -af "silencedetect=noise=-35dB:d=0.3" -f null - 2>&1 \
    | grep "silence_start\|silence_end")

  # Extract volume envelope (1 value per second)
  volume_envelope=""
  for sec in $(seq 0 $((duration_int - 1))); do
    rms=$(ffmpeg -i "$track" -ss "$sec" -t 1 -af "volumedetect" -f null - 2>&1 \
      | grep "mean_volume" | sed 's/.*mean_volume: //' | sed 's/ dB//')
    if [ -n "$rms" ]; then
      volume_envelope="$volume_envelope$sec:${rms},"
    fi
  done

  # Parse silence points
  silence_points=""
  while IFS= read -r line; do
    if echo "$line" | grep -q "silence_start"; then
      ts=$(echo "$line" | sed 's/.*silence_start: //')
      silence_points="${silence_points}${ts},"
    fi
  done <<< "$silence_data"

  # Find the loudest and quietest seconds for transition recommendations
  echo "    {"
  echo "      \"name\": \"$name\","
  echo "      \"file\": \"tracks/$filename\","
  echo "      \"duration\": $duration,"
  echo "      \"duration_display\": \"${duration_int}s\","
  echo "      \"sample_rate\": $sample_rate,"
  echo "      \"bitrate\": $((bitrate / 1000)),"
  echo "      \"volume_envelope\": \"$volume_envelope\","
  echo "      \"silence_points\": \"$silence_points\""
  echo -n "    }"
done

echo ""
echo "  ]"
echo "}"
