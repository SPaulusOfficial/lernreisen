#!/bin/bash
# Generate all topic audio with Piper TTS (German voices).
# Usage: ./generate_audio.sh [eva|kerstin|thorsten]
set -e
cd "$(dirname "$0")"

VOICE="${1:-eva}"
PYTHON="./.venv/bin/python"

if [ ! -x "$PYTHON" ]; then
  echo "Python venv not found. Run setup first."
  exit 1
fi

echo "===== Generating all topic audio (voice: $VOICE) ====="

for texts in topics/*/texts.json; do
  topic_dir=$(dirname "$texts")
  topic_name=$(basename "$topic_dir")
  out_dir="$topic_dir/audio"
  echo ""
  echo "[$topic_name]"
  $PYTHON shared/tts.py --voice "$VOICE" --out "$out_dir" --texts "$texts"
done

echo ""
echo "===== Done. ====="
