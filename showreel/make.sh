#!/usr/bin/env bash
# Full build: soundtrack -> 900 frames -> final H.264 + AAC master.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p build media
python3 audio.py
node render.mjs video --workers "${WORKERS:-4}"
ffmpeg -y -loglevel error -i build/showreel_silent.mp4 -i build/soundtrack.wav \
  -c:v libx264 -preset slow -crf 20 -tune grain -pix_fmt yuv420p -profile:v high -level 4.2 \
  -c:a aac -b:a 256k -movflags +faststart -shortest media/showreel.mp4
cp build/soundtrack.wav media/soundtrack.wav
echo "wrote media/showreel.mp4"
