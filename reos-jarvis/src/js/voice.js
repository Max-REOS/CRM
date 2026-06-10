// REOS JARVIS — Voice I/O (voice.js)

let recognition = null;
let isListening = false;
let synth = window.speechSynthesis;

function initVoice() {
  const btn = document.getElementById('btn-voice');
  if (!btn) return;

  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SR();
    recognition.lang = 'de-DE';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (e) => {
      const input = document.getElementById('chat-input');
      const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
      if (input) input.value = transcript;
      if (e.results[e.results.length - 1].isFinal) {
        stopListening();
      }
    };

    recognition.onend = () => { isListening = false; btn.classList.remove('active'); };
    recognition.onerror = () => { isListening = false; btn.classList.remove('active'); };

    btn.addEventListener('click', () => {
      if (isListening) stopListening();
      else startListening();
    });
  } else {
    btn.style.opacity = '0.4';
    btn.title = 'Spracheingabe nicht unterstützt';
  }
}

function startListening() {
  if (!recognition) return;
  isListening = true;
  document.getElementById('btn-voice')?.classList.add('active');
  recognition.start();
}

function stopListening() {
  if (!recognition) return;
  isListening = false;
  document.getElementById('btn-voice')?.classList.remove('active');
  recognition.stop();
}

function speakText(text) {
  if (!synth) return;
  // Remove markdown
  const clean = text.replace(/[*_`#\[\]]/g, '').replace(/<[^>]*>/g, '').slice(0, 500);
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = 'de-DE';
  utterance.rate = 0.95;
  utterance.pitch = 0.85;

  // Prefer a German voice
  const voices = synth.getVoices();
  const deVoice = voices.find(v => v.lang.startsWith('de'));
  if (deVoice) utterance.voice = deVoice;

  synth.speak(utterance);
}

// Init on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initVoice);
} else {
  initVoice();
}

window.speakText = speakText;
window.initVoice = initVoice;
