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
    document.addEventListener('click', () => {
      this._pickVoice();
      if (this.speechOn && this.current === 0) this.speakCurrentScene();
    }, { once: true });
  }

  _pickVoice() {
    if (!('speechSynthesis' in window)) return;
    const voices = speechSynthesis.getVoices();
    this.germanVoice =
      voices.find(v => v.lang === 'de-DE' && /sandy|shelley|flo|petra|anna|katja|female/i.test(v.name)) ||
      voices.find(v => v.lang === 'de-DE' && /google/i.test(v.name)) ||
      voices.find(v => v.lang === 'de-DE') ||
      voices.find(v => v.lang && v.lang.startsWith('de')) ||
      null;
  }

  stopSpeech() {
    this.audioEl.pause();
    this.audioEl.currentTime = 0;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }

  speak(audioKey, fallbackText) {
    if (!this.speechOn) return;
    this.stopSpeech();
    this.audioEl.src = this.audioPath + '/' + audioKey + '.m4a';
    const p = this.audioEl.play();
    if (p && p.catch) p.catch(() => this._speakBrowser(fallbackText));
  }

  _speakBrowser(text) {
    if (!text || !('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    if (this.germanVoice) u.voice = this.germanVoice;
    u.lang = 'de-DE';
    u.rate = 0.9;
    u.pitch = 1.15;
    speechSynthesis.speak(u);
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
