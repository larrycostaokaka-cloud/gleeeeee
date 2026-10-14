const clock = document.querySelector('#clock');
const greeting = document.querySelector('#greeting');
const form = document.querySelector('#command-form');
const input = document.querySelector('#command-input');
const responseText = document.querySelector('#response-text');
const webSearchLink = document.querySelector('#web-search-link');
const hint = document.querySelector('#command-hint');
const micButton = document.querySelector('#mic-button');
const cameraButton = document.querySelector('#camera-button');
const cameraStopButton = document.querySelector('#camera-stop-button');
const cameraPreview = document.querySelector('#camera-preview');
const permissionStatus = document.querySelector('#permission-status');
let cameraStream = null;

function updateClock() {
  const now = new Date();
  clock.textContent = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).format(now);

  const hour = now.getHours();
  greeting.textContent = hour < 12 ? 'Good morning.' : hour < 18 ? 'Good afternoon.' : 'Good evening.';
}
updateClock();
setInterval(updateClock, 1000);

const jokes = [
  'Why did the computer get cold? It left its Windows open.',
  'I would tell you a UDP joke, but you might not get it.',
  'Why was the robot so relaxed? It had a great sense of byte.'
];
let jokeIndex = 0;

function replyTo(command) {
  const text = command.trim().toLowerCase();
  if (!text) return;

  let reply;
  const searchMatch = text.match(/^(?:please\s+)?(?:search(?: the)?(?: web| internet)?(?: for)?|look up|find(?: information)?(?: about)?|google)\s+(.+)$/i);
  webSearchLink.hidden = true;

  if (searchMatch) {
    const query = searchMatch[1].trim();
    reply = `I can’t read web pages directly here, but you can open this search to find current information about “${query}”. Check the sources before relying on them.`;
    webSearchLink.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    webSearchLink.textContent = `SEARCH THE WEB: ${query} ↗`;
    webSearchLink.hidden = false;
  } else if (/\b(time|clock)\b/.test(text)) {
    reply = `The local time is ${new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date())}.`;
  } else if (/\b(date|day|today)\b/.test(text)) {
    reply = `Today is ${new Intl.DateTimeFormat(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date())}.`;
  } else if (/\b(joke|laugh|funny)\b/.test(text)) {
    reply = jokes[jokeIndex % jokes.length];
    jokeIndex++;
  } else if (/\b(hello|hi|hey)\b/.test(text)) {
    reply = 'Hello. It’s good to hear from you. How can I help?';
  } else if (/\b(help|what can you do|commands)\b/.test(text)) {
    reply = 'I can tell you the time or date, share a joke, respond to a greeting, and create web searches. Try “search the web for space news” or one of the quick commands above.';
  } else {
    reply = 'I’m a local demo, so I can help with the time, date, a joke, greetings, and web searches. Try “search the web for…” or “help”.';
  }

  responseText.textContent = reply;
  hint.textContent = `Command received: “${command.trim()}”`;
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(reply));
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  replyTo(input.value);
  input.value = '';
  input.focus();
});

document.querySelectorAll('.quick-card').forEach((button) => {
  button.addEventListener('click', () => replyTo(button.dataset.command));
});

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    permissionStatus.textContent = 'Camera access is unavailable in this browser or page context.';
    return;
  }
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    cameraPreview.srcObject = cameraStream;
    cameraPreview.hidden = false;
    cameraButton.disabled = true;
    cameraStopButton.disabled = false;
    permissionStatus.textContent = 'Camera is on. Select Stop Camera to turn it off.';
  } catch (error) {
    permissionStatus.textContent = error.name === 'NotAllowedError'
      ? 'Camera permission was denied. Allow it in your browser settings to use the camera.'
      : 'Could not access the camera. Check that a camera is available.';
  }
}

function stopCamera() {
  cameraStream?.getTracks().forEach((track) => track.stop());
  cameraStream = null;
  cameraPreview.srcObject = null;
  cameraPreview.hidden = true;
  cameraButton.disabled = false;
  cameraStopButton.disabled = true;
  permissionStatus.textContent = 'Camera is off.';
}

cameraButton.addEventListener('click', startCamera);
cameraStopButton.addEventListener('click', stopCamera);
window.addEventListener('pagehide', stopCamera);

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  recognition.lang = navigator.language || 'en-US';
  recognition.interimResults = false;

  micButton.addEventListener('click', () => {
    try {
      recognition.start();
      micButton.classList.add('listening');
      hint.textContent = 'Listening… speak your command.';
    } catch {
      hint.textContent = 'Voice input is already listening.';
    }
  });
  recognition.addEventListener('result', (event) => {
    const transcript = event.results[0][0].transcript.trim();
    const command = transcript.replace(/^boss\b[\s,:-]*/i, '');
    if (command === transcript) {
      hint.textContent = 'BOSS voice lock: start your spoken command with “Boss”.';
      return;
    }

    const normalizedCommand = command.toLowerCase();
    if (/^(turn on|enable|start) (the )?camera\b/.test(normalizedCommand)) {
      hint.textContent = 'BOSS requested camera access. Approve the browser permission prompt if shown.';
      startCamera();
      return;
    }
    if (/^(turn off|disable|stop) (the )?camera\b/.test(normalizedCommand)) {
      stopCamera();
      hint.textContent = 'BOSS camera command received.';
      return;
    }

    input.value = command;
    replyTo(command);
    input.value = '';
  });
  recognition.addEventListener('end', () => micButton.classList.remove('listening'));
  recognition.addEventListener('error', () => {
    micButton.classList.remove('listening');
    hint.textContent = 'Voice input was unavailable. Type a command instead.';
  });
} else {
  micButton.disabled = true;
  micButton.title = 'Voice recognition is not supported in this browser';
  micButton.setAttribute('aria-label', 'Voice recognition is not supported in this browser');
}
