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

// Priority list of JARVIS-like Microsoft voices (male, calm, English)
const JARVIS_VOICE_PRIORITY = [
  'Microsoft David Desktop - English (United States)',
  'Microsoft Mark Desktop - English (United States)',
  'Microsoft David - English (United States)',
  'Microsoft Mark - English (United States)',
  'Microsoft Guy Online (Natural) - English (United States)',
  'Microsoft Christopher Online (Natural) - English (United States)',
  'Microsoft Eric Online (Natural) - English (United States)',
  'Microsoft Ryan Online (Natural) - English (United Kingdom)',
  'Microsoft George - English (United Kingdom)',
];

function getBestVoice() {
  const voices = synth.getVoices();
  for (const name of JARVIS_VOICE_PRIORITY) {
    const v = voices.find(v => v.name === name);
    if (v) return v;
  }
  // Fallback: any English male-sounding voice
  return voices.find(v => v.lang.startsWith('en') && !v.name.includes('Female') && !v.name.includes('Zira') && !v.name.includes('Hazel'))
    || voices.find(v => v.lang.startsWith('en'))
    || voices[0];
}

function speakText(text) {
  if (!synth) return;
  const clean = text.replace(/[*_`#\[\]]/g, '').replace(/<[^>]*>/g, '').slice(0, 500);
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = 'en-US';
  utterance.rate = 0.88;
  utterance.pitch = 0.78;
  utterance.volume = 1;

  const setVoiceAndSpeak = () => {
    const voice = getBestVoice();
    if (voice) utterance.voice = voice;
    synth.speak(utterance);
  };

  // Voices may not be loaded yet
  if (synth.getVoices().length === 0) {
    synth.addEventListener('voiceschanged', setVoiceAndSpeak, { once: true });
  } else {
    setVoiceAndSpeak();
  }
}

// Init on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initVoice);
} else {
  initVoice();
}

window.speakText = speakText;
window.initVoice = initVoice;
