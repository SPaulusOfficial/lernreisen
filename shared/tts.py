#!/usr/bin/env python3
"""Generate German m4a audio files for a topic using Microsoft Edge TTS.

Uses the free Azure Neural endpoint via `edge-tts` — no API key, online,
much more natural than Piper or `say`. Falls back to MP3→m4a via afconvert.

Usage:
  python3 shared/tts.py --voice katja --out topics/foo/audio --texts topics/foo/texts.json
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

VOICES = {
    'katja':     'de-DE-KatjaNeural',      # female, warm — default for kids
    'amala':     'de-DE-AmalaNeural',      # female, friendly
    'conrad':    'de-DE-ConradNeural',     # male
    'florian':   'de-DE-FlorianMultilingualNeural',
    'killian':   'de-DE-KillianNeural',    # male
    'seraphina': 'de-DE-SeraphinaMultilingualNeural',  # female, expressive
}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--voice', default='katja', choices=VOICES.keys())
    ap.add_argument('--out', required=True)
    ap.add_argument('--texts', required=True)
    ap.add_argument('--rate', default='-5%',
                    help='Speech rate adjustment, e.g. -5%% (slower) or +10%%')
    ap.add_argument('--pitch', default='+0Hz',
                    help='Pitch shift, e.g. +20Hz (higher)')
    args = ap.parse_args()

    here = Path(__file__).resolve().parent
    project_root = here.parent
    edge_bin = project_root / '.venv' / 'bin' / 'edge-tts'
    if not edge_bin.exists():
        print(f'edge-tts not found at {edge_bin}. Run: pip install edge-tts', file=sys.stderr)
        return 1

    voice = VOICES[args.voice]
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    with open(args.texts, encoding='utf-8') as f:
        texts = json.load(f)

    print(f'Voice: {voice} (rate={args.rate}, pitch={args.pitch})  →  {out_dir}')
    fail = 0
    for key, text in texts.items():
        mp3_path = tempfile.NamedTemporaryFile(suffix='.mp3', delete=False).name
        m4a_path = out_dir / f'{key}.m4a'
        try:
            edge = subprocess.run(
                [str(edge_bin), '--voice', voice,
                 f'--rate={args.rate}', f'--pitch={args.pitch}',
                 '--text', text,
                 '--write-media', mp3_path],
                capture_output=True, text=True,
            )
            if edge.returncode != 0 or not os.path.exists(mp3_path) or os.path.getsize(mp3_path) < 200:
                print(f'  ✗ edge-tts failed for {key}: {edge.stderr.strip()[:200]}')
                fail += 1
                continue
            subprocess.run(
                ['afconvert', '-f', 'm4af', '-d', 'aac', mp3_path, str(m4a_path)],
                check=True, capture_output=True,
            )
            print(f'  ✓ {m4a_path}')
        finally:
            try:
                os.unlink(mp3_path)
            except FileNotFoundError:
                pass

    return 1 if fail else 0


if __name__ == '__main__':
    sys.exit(main())
