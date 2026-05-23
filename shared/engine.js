// Shared engine for topic journeys: scene navigation + audio + sound toggle.
// Each topic creates one TopicEngine instance after the DOM loads.

class TopicEngine {
  constructor(opts = {}) {
    this.audioPath = opts.audioPath || 'audio';
    this.sceneTexts = opts.sceneTexts || []; // [{audio:'scene_0', text:'...'}, ...]
    this.onSceneEnter = opts.onSceneEnter || (() => {});
    this.onSceneLeave = opts.onSceneLeave || (() => {});

    this.scenes = Array.from(document.querySelectorAll('.scene'));
    this.totalScenes = this.scenes.length;
    this.current = 0;
    this.speechOn = true;
    this.germanVoice = null;

    this.audioEl = new Audio();
    this.audioEl.preload = 'auto';

    this._setupProgress();
    this._setupPrevButton();
    this._setupSoundButton();
    this._setupKeyboard();
    this._setupBootstrap();
    this._pickVoice();
    if ('speechSynthesis' in window) {
      speechSynthesis.onvoiceschanged = () => this._pickVoice();
    }
  }

  _setupProgress() {
    const progress = document.getElementById('progress');
    if (!progress) return;
    for (let i = 0; i < this.totalScenes; i++) {
      const d = document.createElement('div');
      d.className = 'dot' + (i === 0 ? ' active' : '');
      progress.appendChild(d);
    }
  }

  _setupPrevButton() {
    const btn = document.getElementById('prevBtn');
    if (btn) {
      btn.style.display = 'none';
      btn.onclick = () => this.prev();
    }
  }

  _setupSoundButton() {
    const btn = document.getElementById('soundBtn');
    if (btn) btn.onclick = () => this.toggleSpeech();
  }

  _setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') this.next();
      if (e.key === 'ArrowLeft') this.prev();
    });
  }

  _setupBootstrap() {
    // First user gesture unlocks audio. Skip auto scene-0 if they click a
    // navigation control (avoids double-playing scene 0 then scene 1).
    document.addEventListener('click', (e) => {
      this._pickVoice();
      const isNav = e.target.closest('button, a.home-btn, .sound-btn');
      if (this.speechOn && this.current === 0 && !isNav) this.speakCurrentScene();
    }, { once: true });
  }

  _pickVoice() {
    // No longer used — we never fall back to browser TTS. Kept as no-op
    // for compatibility with old callers.
  }

  stopSpeech() {
    this.audioEl.pause();
    this.audioEl.currentTime = 0;
    // Hard stop the browser TTS in case anything still queued one before
    // this build was deployed.
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }

  speak(audioKey, _fallbackText) {
    if (!this.speechOn) return;
    this.stopSpeech();
    // Cache-bust so refreshed audio files always replace old ones.
    this.audioEl.src = this.audioPath + '/' + audioKey + '.m4a?v=2';
    const p = this.audioEl.play();
    // No fallback. If the file is missing, we stay silent rather than
    // play the harsh browser robot voice.
    if (p && p.catch) p.catch(() => {});
  }

  toggleSpeech() {
    this.speechOn = !this.speechOn;
    const btn = document.getElementById('soundBtn');
    if (btn) btn.textContent = this.speechOn ? '🔊' : '🔇';
    if (!this.speechOn) this.stopSpeech();
    else this.speakCurrentScene();
  }

  speakCurrentScene() {
    const entry = this.sceneTexts[this.current];
    if (!entry) return;
    if (typeof entry === 'string') {
      this.speak('scene_' + this.current, entry);
    } else {
      this.speak(entry.audio || ('scene_' + this.current), entry.text);
    }
  }

  goTo(idx) {
    if (idx < 0 || idx >= this.totalScenes) return;
    const prevIdx = this.current;
    this.onSceneLeave(prevIdx);
    this.scenes.forEach(s => s.classList.remove('active'));
    const target = document.querySelector('[data-scene="' + idx + '"]');
    if (target) target.classList.add('active');
    this.current = idx;
    this._updateProgress();
    const prevBtn = document.getElementById('prevBtn');
    if (prevBtn) prevBtn.style.display = idx === 0 ? 'none' : 'inline-block';
    // On mobile, jump to top of the new scene so the user sees the title
    // first (scenes are now flow content that can be taller than the viewport).
    try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch (e) { window.scrollTo(0, 0); }
    this.speakCurrentScene();
    this.onSceneEnter(idx);
  }

  next() { this.goTo(this.current + 1); }
  prev() { this.goTo(this.current - 1); }

  _updateProgress() {
    document.querySelectorAll('.dot').forEach((d, i) => {
      d.classList.toggle('active', i === this.current);
    });
  }
}

// Tiny build-version badge in bottom-left — useful to know if you're on
// the latest deploy without checking dev tools.
function showVersionBadge() {
  if (!window.__BUILD__) return;
  if (document.querySelector('.version-badge')) return;
  const b = document.createElement('div');
  b.className = 'version-badge';
  b.textContent = '#' + window.__BUILD__.build + ' • ' + window.__BUILD__.hash;
  b.title = window.__BUILD__.date;
  document.body.appendChild(b);
}
// Run on DOM ready, regardless of which topic this engine is loaded into.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', showVersionBadge);
} else {
  showVersionBadge();
}

// Helper for topics that want to generate ambient stars on a section.
function sprinkleStars(container, count = 5, emojis = ['⭐','✨','🌟']) {
  for (let i = 0; i < count; i++) {
    const s = document.createElement('span');
    s.className = 'star';
    s.textContent = emojis[i % emojis.length];
    s.style.top = (Math.random() * 90) + '%';
    s.style.left = (Math.random() * 90) + '%';
    s.style.animationDelay = (Math.random() * 2) + 's';
    container.appendChild(s);
  }
}
