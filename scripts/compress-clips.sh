#!/usr/bin/env bash
# Compress a raw screen recording into a small web clip plus a poster frame.
# Usage: scripts/compress-clips.sh <input.(mov|mp4|webm)> [output.mp4]
# Default output: public/media/<input-basename>.mp4; poster: <output-basename>-poster.jpg beside it.
set -euo pipefail

MAX_BYTES="${COMPRESS_MAX_BYTES:-5000000}"

die() {
  echo "compress-clips: $1" >&2
  exit 1
}

if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then
  echo "Usage: $0 <input.(mov|mp4|webm)> [output.mp4]" >&2
  exit 1
fi

# Validation uses only shell builtins (no basename/tr/dirname) so the error paths behave
# identically whatever is on PATH; ffmpeg is checked after all argument validation.
input="$1"
[ -f "$input" ] || die "input not found: $input"

filename="${input##*/}"
ext="${filename##*.}"
case "$ext" in
  mov | MOV | mp4 | MP4 | webm | WEBM) ;;
  *) die "unsupported input extension '.$ext' (expected .mov, .mp4 or .webm): $input" ;;
esac

if [ "$#" -eq 2 ]; then
  output="$2"
else
  repo_root="$(cd "${0%/*}/.." && pwd)"
  output="$repo_root/public/media/${filename%.*}.mp4"
fi

case "$output" in
  -*) die "output path must not start with '-': $output" ;;
  *.mp4) ;;
  *) die "output path must end in .mp4: $output" ;;
esac
[ "$output" != "$input" ] || die "output path must differ from the input: $output"

command -v ffmpeg >/dev/null 2>&1 || die "ffmpeg not found on PATH (install with: brew install ffmpeg)"

out_dir="$(dirname "$output")"
out_name="$(basename "$output")"
poster="$out_dir/${out_name%.*}-poster.jpg"
mkdir -p "$out_dir"

ffmpeg -y -loglevel error -i "$input" \
  -vf "scale='min(1280,iw)':-2" -an \
  -c:v libx264 -crf 28 -preset slow -movflags +faststart -pix_fmt yuv420p \
  "$output"

# Poster at 2 s; clips shorter than that yield no frame, so fall back to the first frame.
rm -f "$poster"
ffmpeg -y -loglevel error -ss 00:00:02 -i "$output" -frames:v 1 -q:v 3 "$poster" || true
if [ ! -s "$poster" ]; then
  ffmpeg -y -loglevel error -i "$output" -frames:v 1 -q:v 3 "$poster"
fi

size="$(wc -c <"$output" | tr -d ' ')"
echo "wrote $output (${size} bytes)"
echo "wrote $poster"
if [ "$size" -ge "$MAX_BYTES" ]; then
  echo "WARNING: $output is ${size} bytes, at or above the 5 MB limit for public/media" >&2
fi
