/**
 * Yako web client. Drives the single-screen UI. Captures the microphone with
 * getUserMedia, sends audio to the local API for on-device transcription and
 * translation, and plays the synthesized reply. All inference happens on this
 * machine. The page talks only to the local server.
 */
(function () {
  'use strict';
  var S = window.YAKO_STRINGS;

  var els = {
    brand: document.getElementById('brand'),
    offlineText: document.getElementById('offlineText'),
    sourceLabel: document.getElementById('sourceLabel'),
    targetLabel: document.getElementById('targetLabel'),
    sourceLangName: document.getElementById('sourceLangName'),
    targetLangName: document.getElementById('targetLangName'),
    heardText: document.getElementById('heardText'),
    translationText: document.getElementById('translationText'),
    typeInput: document.getElementById('typeInput'),
    swapButton: document.getElementById('swapButton'),
    speakButton: document.getElementById('speakButton'),
    speakLabel: document.getElementById('speakLabel'),
    emptyState: document.getElementById('emptyState'),
    emptyTitle: document.getElementById('emptyTitle'),
    emptyHint: document.getElementById('emptyHint'),
    errorState: document.getElementById('errorState'),
    errorTitle: document.getElementById('errorTitle'),
    errorMessage: document.getElementById('errorMessage'),
    errorHint: document.getElementById('errorHint'),
    errorDismiss: document.getElementById('errorDismiss'),
    statusLine: document.getElementById('statusLine'),
    micButton: document.getElementById('micButton'),
    micAriaLabel: document.getElementById('micAriaLabel'),
    translateButton: document.getElementById('translateButton'),
    aboutButton: document.getElementById('aboutButton'),
    aboutDialog: document.getElementById('aboutDialog'),
    aboutClose: document.getElementById('aboutClose'),
    aboutTitle: document.getElementById('aboutTitle'),
    offlineNote: document.getElementById('offlineNote'),
    metricsTitle: document.getElementById('metricsTitle'),
    metricsList: document.getElementById('metricsList'),
    modelsTitle: document.getElementById('modelsTitle'),
    modelsList: document.getElementById('modelsList'),
  };

  var LANG_NAMES = { en: 'English', sw: 'Swahili' };

  var state = {
    source: 'en',
    target: 'sw',
    phase: 'idle', // idle | listening | processing | speaking
    mediaRecorder: null,
    mediaStream: null,
    chunks: [],
    lastAudio: null, // { base64, sampleRate }
    audioEl: null,
  };

  /* Apply externalized strings to the static shell. */
  function applyStrings() {
    document.title = S.appName;
    els.brand.textContent = S.appName;
    els.offlineText.textContent = S.offlineBadge;
    els.sourceLabel.textContent = S.sourceLabel;
    els.targetLabel.textContent = S.targetLabel;
    els.emptyTitle.textContent = S.emptyTitle;
    els.emptyHint.textContent = S.emptyHint;
    els.typeInput.placeholder = S.typePlaceholder;
    els.translateButton.textContent = S.translateButton;
    els.swapButton.setAttribute('aria-label', S.swapLabel);
    els.speakLabel.textContent = S.speakLabel;
    els.statusLine.textContent = S.statusReady;
    els.aboutTitle.textContent = S.aboutTitle;
    els.metricsTitle.textContent = S.metricsTitle;
    els.modelsTitle.textContent = S.modelsTitle;
    els.offlineNote.textContent = S.offlineNote;
    els.errorTitle.textContent = S.errorTitle;
  }

  function setStatus(text) {
    els.statusLine.textContent = text;
  }

  function setPhase(phase) {
    state.phase = phase;
    els.micButton.classList.remove('listening', 'processing', 'speaking');
    if (phase === 'listening') els.micButton.classList.add('listening');
    if (phase === 'processing') els.micButton.classList.add('processing');
    if (phase === 'speaking') els.micButton.classList.add('speaking');
    var busy = phase !== 'idle';
    els.translateButton.disabled = busy;
    if (phase === 'listening') {
      setStatus(S.statusListening);
      els.micAriaLabel.textContent = S.micListening;
    } else if (phase === 'processing') {
      setStatus(S.statusTranslating);
      els.micAriaLabel.textContent = S.micProcessing;
    } else if (phase === 'speaking') {
      setStatus(S.statusSpeaking);
      els.micAriaLabel.textContent = S.micSpeaking;
    } else {
      els.micAriaLabel.textContent = S.micIdle;
    }
  }

  function updateDirection() {
    els.sourceLangName.textContent = LANG_NAMES[state.source];
    els.targetLangName.textContent = LANG_NAMES[state.target];
  }

  function showResult(heard, translation, hasAudio) {
    els.heardText.textContent = heard;
    els.translationText.textContent = translation;
    els.emptyState.hidden = true;
    els.speakButton.hidden = !hasAudio;
  }

  function showError(title, message, hint) {
    els.errorTitle.textContent = title || S.errorTitle;
    els.errorMessage.textContent = message || '';
    els.errorHint.textContent = hint || '';
    els.errorState.hidden = false;
  }

  function hideError() {
    els.errorState.hidden = true;
  }

  function api(path, body) {
    return fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body || {}),
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok || !data.ok) {
          var err = (data && data.error) || {};
          var e = new Error(err.message || 'Request failed');
          e.title = err.title;
          e.hint = err.hint;
          e.code = err.code;
          throw e;
        }
        return data;
      });
    });
  }

  function base64ToWavUrl(base64) {
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    var blob = new Blob([bytes], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }

  function playTranslation(base64) {
    return new Promise(function (resolve) {
      if (state.audioEl) {
        state.audioEl.pause();
        state.audioEl = null;
      }
      var url = base64ToWavUrl(base64);
      var audio = new Audio(url);
      state.audioEl = audio;
      els.speakButton.classList.add('playing');
      setPhase('speaking');
      audio.onended = function () {
        els.speakButton.classList.remove('playing');
        URL.revokeObjectURL(url);
        setPhase('idle');
        setStatus(S.statusReady);
        resolve();
      };
      audio.onerror = function () {
        els.speakButton.classList.remove('playing');
        URL.revokeObjectURL(url);
        setPhase('idle');
        setStatus(S.statusReady);
        resolve();
      };
      audio.play().catch(function () {
        resolve();
      });
    });
  }

  function handleTranslateResult(data) {
    var r = data.result;
    showResult(r.sourceText, r.translatedText, !!r.audioWavBase64);
    if (r.audioWavBase64) {
      state.lastAudio = { base64: r.audioWavBase64, sampleRate: r.audioSampleRate };
      return playTranslation(r.audioWavBase64);
    }
    setPhase('idle');
    setStatus(S.statusReady);
    return Promise.resolve();
  }

  /* Typed input path. */
  function translateTyped() {
    var text = els.typeInput.value.trim();
    if (!text) {
      els.typeInput.focus();
      return;
    }
    hideError();
    setPhase('processing');
    api('/api/translate', {
      source: state.source,
      target: state.target,
      text: text,
      speak: true,
    })
      .then(handleTranslateResult)
      .catch(function (err) {
        setPhase('idle');
        setStatus(S.statusReady);
        showError(err.title, err.message, err.hint);
      });
  }

  /* Voice path. Capture audio, send for transcription and translation. */
  function startListening() {
    if (state.phase !== 'idle') return;
    hideError();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showError(
        'Microphone not available',
        'This browser cannot capture audio.',
        'Type your text instead.',
      );
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(function (stream) {
        state.mediaStream = stream;
        state.chunks = [];
        var recorder = new MediaRecorder(stream);
        state.mediaRecorder = recorder;
        recorder.ondataavailable = function (e) {
          if (e.data && e.data.size > 0) state.chunks.push(e.data);
        };
        recorder.onstop = function () {
          stopStream();
          var blob = new Blob(state.chunks, { type: recorder.mimeType || 'audio/webm' });
          sendAudio(blob);
        };
        recorder.start();
        setPhase('listening');
      })
      .catch(function () {
        showError(
          'Microphone blocked',
          'Permission to use the microphone was denied.',
          'Allow mic access in the browser, or type instead.',
        );
      });
  }

  function stopListening() {
    if (state.phase !== 'listening' || !state.mediaRecorder) return;
    setPhase('processing');
    setStatus(S.statusTranscribing);
    try {
      state.mediaRecorder.stop();
    } catch {
      setPhase('idle');
    }
  }

  function stopStream() {
    if (state.mediaStream) {
      state.mediaStream.getTracks().forEach(function (t) {
        t.stop();
      });
      state.mediaStream = null;
    }
    state.mediaRecorder = null;
  }

  function sendAudio(blob) {
    blobToBase64(blob)
      .then(function (audioBase64) {
        return fetch('/api/voice', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            source: state.source,
            target: state.target,
            audioBase64: audioBase64,
          }),
        });
      })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok || !data.ok) {
            var err = (data && data.error) || {};
            var e = new Error(err.message || 'Voice request failed');
            e.title = err.title;
            e.hint = err.hint;
            e.code = err.code;
            throw e;
          }
          return data;
        });
      })
      .then(handleTranslateResult)
      .catch(function (err) {
        setPhase('idle');
        setStatus(S.statusReady);
        showError(err.title, err.message, err.hint);
      });
  }

  function blobToBase64(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onloadend = function () {
        var result = reader.result || '';
        var comma = String(result).indexOf(',');
        resolve(comma >= 0 ? String(result).slice(comma + 1) : String(result));
      };
      reader.onerror = function () {
        reject(new Error('Could not read recorded audio.'));
      };
      reader.readAsDataURL(blob);
    });
  }

  function swapDirection() {
    var s = state.source;
    state.source = state.target;
    state.target = s;
    updateDirection();
    els.swapButton.classList.add('spin');
    setTimeout(function () {
      els.swapButton.classList.remove('spin');
    }, 320);
    // Carry the last translation back as the new source for a natural loop.
    var heard = els.heardText.textContent;
    var translation = els.translationText.textContent;
    if (translation) {
      els.heardText.textContent = translation;
      els.translationText.textContent = heard;
      els.typeInput.value = translation;
    }
  }

  function loadMetrics() {
    return fetch('/api/metrics')
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (!data.ok) return;
        var spans = {};
        data.spans.forEach(function (sp) {
          spans[sp.name] = sp;
        });
        function ms(name) {
          var sp = spans[name];
          return sp ? Math.round(sp.lastMs) + ' ms' : 'not measured yet';
        }
        var peak = (data.peakMemoryBytes / 1e6).toFixed(0) + ' MB';
        els.metricsList.innerHTML =
          '<dt>' +
          S.speechToText +
          '</dt><dd>' +
          ms('pipeline.transcribe') +
          '</dd>' +
          '<dt>' +
          S.textToSpeech +
          '</dt><dd>' +
          ms('pipeline.tts') +
          '</dd>' +
          '<dt>Translation</dt><dd>' +
          ms('pipeline.translate') +
          '</dd>' +
          '<dt>' +
          S.peakMemory +
          '</dt><dd>' +
          peak +
          '</dd>';
      })
      .catch(function () {});
  }

  function loadMeta() {
    return fetch('/api/meta')
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (!data.ok) return;
        els.modelsList.innerHTML = data.models
          .map(function (m) {
            return '<li>' + m.label + '</li>';
          })
          .join('');
      })
      .catch(function () {});
  }

  /* Event wiring */
  function wire() {
    els.translateButton.addEventListener('click', translateTyped);
    els.typeInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) translateTyped();
    });
    els.swapButton.addEventListener('click', swapDirection);
    els.errorDismiss.addEventListener('click', hideError);
    els.speakButton.addEventListener('click', function () {
      if (state.lastAudio) playTranslation(state.lastAudio.base64);
    });
    els.aboutButton.addEventListener('click', function () {
      loadMetrics();
      loadMeta();
      if (els.aboutDialog.showModal) els.aboutDialog.showModal();
    });
    els.aboutClose.addEventListener('click', function () {
      els.aboutDialog.close();
    });

    // Press and hold to talk. Pointer events cover mouse and touch.
    els.micButton.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      startListening();
    });
    window.addEventListener('pointerup', function () {
      stopListening();
    });
    els.micButton.addEventListener('keydown', function (e) {
      if ((e.key === ' ' || e.key === 'Enter') && state.phase === 'idle') {
        e.preventDefault();
        startListening();
      }
    });
    els.micButton.addEventListener('keyup', function (e) {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        stopListening();
      }
    });
  }

  applyStrings();
  updateDirection();
  wire();
  setPhase('idle');
})();
