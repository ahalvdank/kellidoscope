#!/usr/bin/env bash
# Tile one frame per second of a clip into a single image for the pre-commit privacy check.
# Usage: scripts/capture/contact-sheet.sh <clip.(mp4|webm)> <out.jpg> [columns] [frame-width]
# Rows grow with the clip's length, so no second is dropped. Defaults: 6 columns of 320 px frames.
set -euo pipefail

if [ "$#" -lt 2 ] || [ "$#" -gt 4 ]; then
  echo "Usage: $0 <clip.(mp4|webm)> <out.jpg> [columns] [frame-width]" >&2
  exit 1
fi
clip="$1"
out="$2"
cols="${3:-6}"
width="${4:-320}"
[ -f "$clip" ] || { echo "contact-sheet: clip not found: $clip" >&2; exit 1; }
case "$out" in
  *.jpg | *.jpeg) ;;
  *) echo "contact-sheet: output must end in .jpg: $out" >&2; exit 1 ;;
esac
command -v ffprobe >/dev/null 2>&1 || { echo "contact-sheet: ffprobe not found on PATH" >&2; exit 1; }

duration="$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$clip")"
frames="$(awk -v d="$duration" 'BEGIN { n = int(d); if (n < d) n++; if (n < 1) n = 1; print n }')"
rows=$(( (frames + cols - 1) / cols ))
mkdir -p "$(dirname "$out")"
ffmpeg -y -loglevel error -i "$clip" \
  -vf "fps=1,scale=${width}:-2,tile=${cols}x${rows}:padding=4:color=white" \
  -frames:v 1 -q:v 3 "$out"
echo "wrote $out (${frames} frames, ${cols}x${rows})"
