(() => {
  const $ = (id) => document.getElementById(id);
  const el = {
    app: $("app"), done: $("done"), progress: $("progress"), name: $("name"),
    photo: $("photo"), fallback: $("fallback"), timer: $("timer"), time: $("time"),
    hint: $("hint"), tip: $("tip"), prev: $("prev"), next: $("next"), restart: $("restart"),
  };

  let index = 0;
  let remaining = 0;      // secondes restantes
  let running = false;
  let endAt = 0;          // timestamp de fin (précis même si l'écran se verrouille)
  let ticker = null;
  let wakeLock = null;
  let audioCtx = null;

  const fmt = (s) => {
    const m = Math.floor(s / 60), r = s % 60;
    return String(m).padStart(2, "0") + ":" + String(r).padStart(2, "0");
  };

  function beep(times = 1, freq = 880) {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      for (let i = 0; i < times; i++) {
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.frequency.value = freq; o.connect(g); g.connect(audioCtx.destination);
        const t = audioCtx.currentTime + i * 0.25;
        g.gain.setValueAtTime(0.25, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        o.start(t); o.stop(t + 0.2);
      }
    } catch (e) {}
    if (navigator.vibrate) navigator.vibrate(200);
  }

  async function keepAwake(on) {
    try {
      if (on && "wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen");
      else if (wakeLock) { await wakeLock.release(); wakeLock = null; }
    } catch (e) {}
  }

  function show() {
    const ex = EXERCISES[index];
    el.progress.textContent = `Exercice ${index + 1} / ${EXERCISES.length}`;
    el.name.textContent = ex.name;
    el.tip.textContent = ex.tip || "";
    el.prev.disabled = index === 0;
    el.fallback.hidden = true;
    el.photo.hidden = false;
    el.photo.onerror = () => {
      el.photo.hidden = true;
      el.fallback.hidden = false;
      el.fallback.textContent = "🧘\n" + ex.name;
    };
    el.photo.src = ex.image;
    el.photo.alt = ex.name;
    reset();
  }

  function render() {
    el.time.textContent = fmt(remaining);
    el.timer.classList.toggle("running", running);
    el.hint.textContent = running ? "Touchez pour mettre en pause"
      : (remaining === EXERCISES[index].duration ? "Touchez pour lancer" : "En pause – touchez pour reprendre");
  }

  function reset() {
    stop();
    remaining = EXERCISES[index].duration;
    render();
  }

  function stop() {
    running = false;
    clearInterval(ticker);
    keepAwake(false);
  }

  function start() {
    running = true;
    endAt = Date.now() + remaining * 1000;
    ticker = setInterval(tick, 250);
    keepAwake(true);
    render();
  }

  function tick() {
    const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
    if (left !== remaining) {
      remaining = left;
      if (left > 0 && left <= 3) beep(1, 660);
      render();
    }
    if (left <= 0) finish();
  }

  function finish() {
    stop();
    beep(2, 990);
    if (index < EXERCISES.length - 1) { index++; show(); }
    else { el.app.hidden = true; el.done.hidden = false; }
  }

  el.timer.addEventListener("click", () => {
    // Le premier toucher débloque aussi le son sur iOS
    try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); audioCtx.resume(); } catch (e) {}
    running ? (remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000)), stop(), render()) : start();
  });
  el.prev.addEventListener("click", () => { if (index > 0) { index--; show(); } });
  el.next.addEventListener("click", () => { if (index < EXERCISES.length - 1) { index++; show(); } });
  el.restart.addEventListener("click", () => { index = 0; el.done.hidden = true; el.app.hidden = false; show(); });

  // Réactive le verrou d'écran quand on revient sur l'app
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && running) { tick(); keepAwake(true); }
  });

  show();

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
})();
