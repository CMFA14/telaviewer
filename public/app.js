// TelaViewer - WebRTC P2P Screen Sharing, Voice Chat & Advanced Chat (File Transfer + Pinned Links)

const state = {
  ws: null,
  myId: null,
  username: 'Meu PC',
  room: 'principal',
  peerConnections: new Map(), // peerId -> RTCPeerConnection
  iceCandidatesQueue: new Map(), // peerId -> RTCIceCandidate[]
  
  // Streams
  localStream: null,       // Screen stream
  remoteStream: null,      // Remote screen stream
  localVoiceStream: null,  // Microphone stream
  remoteVoiceStream: null, // Friend microphone stream
  
  // Dispositivos
  selectedMicId: '',
  selectedSpeakerId: '',
  
  // Status de Mídia
  isSharing: false,
  isMicMuted: false,
  isDeafened: false,
  voiceMode: 'vad',
  isPttActive: false,
  
  // Áudio e VAD
  audioCtx: null,
  selfAnalyser: null,
  friendAnalyser: null,
  
  // Gravador e Stats
  mediaRecorder: null,
  recordedChunks: [],
  isRecording: false,
  recordStartTime: 0,
  recordTimerInterval: null,
  statsInterval: null,
  
  // Conexão
  radminIp: null,
  serverPort: 3000,
  unreadCount: 0,
  isChatOpen: false,
  remotePeerId: null,
  remoteUsername: 'Amigo',

  // Link Fixado
  pinnedLink: null
};

// Configuração WebRTC
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ],
  iceCandidatePoolSize: 10
};

// Elementos DOM
const elements = {
  connectionStatus: document.getElementById('connectionStatus'),
  roomInput: document.getElementById('roomInput'),
  btnChangeRoom: document.getElementById('btnChangeRoom'),
  usernameInput: document.getElementById('usernameInput'),
  btnCopyInvite: document.getElementById('btnCopyInvite'),
  copyInviteText: document.getElementById('copyInviteText'),
  detectedRadminIp: document.getElementById('detectedRadminIp'),
  
  // Voz / Overlay
  voicePanel: document.getElementById('voicePanel'),
  voiceStatusText: document.getElementById('voiceStatusText'),
  voiceCount: document.getElementById('voiceCount'),
  avatarSelfWrapper: document.getElementById('avatarSelfWrapper'),
  avatarFriendWrapper: document.getElementById('avatarFriendWrapper'),
  selfVoiceName: document.getElementById('selfVoiceName'),
  friendVoiceName: document.getElementById('friendVoiceName'),
  selfMicState: document.getElementById('selfMicState'),
  friendMicState: document.getElementById('friendMicState'),
  selfVuMeter: document.getElementById('selfVuMeter'),
  friendVoiceVolume: document.getElementById('friendVoiceVolume'),
  friendVoiceVolLabel: document.getElementById('friendVoiceVolLabel'),
  remoteVoiceAudio: document.getElementById('remoteVoiceAudio'),
  
  // Dispositivos
  selectMicDevice: document.getElementById('selectMicDevice'),
  selectSpeakerDevice: document.getElementById('selectSpeakerDevice'),
  btnTestSpeaker: document.getElementById('btnTestSpeaker'),
  
  // Vídeo
  remoteVideo: document.getElementById('remoteVideo'),
  localVideo: document.getElementById('localVideo'),
  remoteCard: document.getElementById('remoteCard'),
  localCard: document.getElementById('localCard'),
  emptyPlaceholder: document.getElementById('emptyPlaceholder'),
  remotePeerTag: document.getElementById('remotePeerTag'),
  remoteLivePill: document.getElementById('remoteLivePill'),
  btnCloseLocalPreview: document.getElementById('btnCloseLocalPreview'),
  
  // Controles de vídeo
  remoteVolumeSlider: document.getElementById('remoteVolumeSlider'),
  btnMuteRemote: document.getElementById('btnMuteRemote'),
  btnScreenshot: document.getElementById('btnScreenshot'),
  btnPip: document.getElementById('btnPip'),
  btnFullscreen: document.getElementById('btnFullscreen'),
  
  // Dock
  btnShareScreen: document.getElementById('btnShareScreen'),
  shareBtnLabel: document.getElementById('shareBtnLabel'),
  btnQualitySettings: document.getElementById('btnQualitySettings'),
  qualityMenu: document.getElementById('qualityMenu'),
  chkAudioSystem: document.getElementById('chkAudioSystem'),
  btnToggleMic: document.getElementById('btnToggleMic'),
  micLabel: document.getElementById('micLabel'),
  iconMic: document.getElementById('iconMic'),
  btnToggleDeafen: document.getElementById('btnToggleDeafen'),
  btnVoiceSettings: document.getElementById('btnVoiceSettings'),
  voiceSettingsMenu: document.getElementById('voiceSettingsMenu'),
  chkNoiseSuppression: document.getElementById('chkNoiseSuppression'),
  btnRecord: document.getElementById('btnRecord'),
  recordLabel: document.getElementById('recordLabel'),
  btnToggleStats: document.getElementById('btnToggleStats'),
  statsOverlay: document.getElementById('statsOverlay'),
  
  // Stats
  statFps: document.getElementById('statFps'),
  statRes: document.getElementById('statRes'),
  statBitrate: document.getElementById('statBitrate'),
  statPing: document.getElementById('statPing'),
  
  // Chat Avançado
  btnToggleChat: document.getElementById('btnToggleChat'),
  chatSidebar: document.getElementById('chatSidebar'),
  btnCloseChat: document.getElementById('btnCloseChat'),
  chatMessages: document.getElementById('chatMessages'),
  chatForm: document.getElementById('chatForm'),
  chatInput: document.getElementById('chatInput'),
  chatUnreadBadge: document.getElementById('chatUnreadBadge'),
  btnAttachFile: document.getElementById('btnAttachFile'),
  chatFileInput: document.getElementById('chatFileInput'),
  dragDropOverlay: document.getElementById('dragDropOverlay'),
  
  // Link Fixado
  btnPinLinkPrompt: document.getElementById('btnPinLinkPrompt'),
  pinnedLinkBar: document.getElementById('pinnedLinkBar'),
  pinnedLinkIcon: document.getElementById('pinnedLinkIcon'),
  pinnedLinkTitle: document.getElementById('pinnedLinkTitle'),
  btnOpenPinned: document.getElementById('btnOpenPinned'),
  btnUnpinLink: document.getElementById('btnUnpinLink'),
  
  // Modal de Link Fixado
  pinLinkModal: document.getElementById('pinLinkModal'),
  btnClosePinModal: document.getElementById('btnClosePinModal'),
  btnCancelPin: document.getElementById('btnCancelPin'),
  btnConfirmPin: document.getElementById('btnConfirmPin'),
  inputPinUrl: document.getElementById('inputPinUrl'),
  inputPinTitle: document.getElementById('inputPinTitle'),
  
  // Toast
  toast: document.getElementById('toast')
};

// ============================================================================
// Desbloqueio de Áudio / Autoplay no Navegador
// ============================================================================
function unlockAudioContext() {
  if (state.audioCtx && state.audioCtx.state === 'suspended') {
    state.audioCtx.resume();
  }
  if (elements.remoteVoiceAudio && elements.remoteVoiceAudio.srcObject) {
    elements.remoteVoiceAudio.play().catch(() => {});
  }
  if (elements.remoteVideo && elements.remoteVideo.srcObject) {
    elements.remoteVideo.play().catch(() => {});
  }
}

document.addEventListener('click', unlockAudioContext);
document.addEventListener('keydown', unlockAudioContext);

// ============================================================================
// Enumeração de Dispositivos de Áudio
// ============================================================================
async function populateAudioDevices() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    elements.selectMicDevice.innerHTML = '';
    elements.selectSpeakerDevice.innerHTML = '';

    const mics = devices.filter(d => d.kind === 'audioinput');
    const speakers = devices.filter(d => d.kind === 'audiooutput');

    // Microfones
    if (mics.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Nenhum microfone detectado';
      elements.selectMicDevice.appendChild(opt);
    } else {
      mics.forEach((mic, index) => {
        const opt = document.createElement('option');
        opt.value = mic.deviceId;
        opt.textContent = mic.label || `Microfone ${index + 1}`;
        if (state.selectedMicId === mic.deviceId || (!state.selectedMicId && index === 0)) {
          opt.selected = true;
          state.selectedMicId = mic.deviceId;
        }
        elements.selectMicDevice.appendChild(opt);
      });
    }

    // Saídas
    if (speakers.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Padrão do Sistema (Nativo)';
      elements.selectSpeakerDevice.appendChild(opt);
    } else {
      speakers.forEach((spk, index) => {
        const opt = document.createElement('option');
        opt.value = spk.deviceId;
        opt.textContent = spk.label || `Saída ${index + 1}`;
        if (state.selectedSpeakerId === spk.deviceId || (!state.selectedSpeakerId && spk.deviceId === 'default')) {
          opt.selected = true;
          state.selectedSpeakerId = spk.deviceId;
        }
        elements.selectSpeakerDevice.appendChild(opt);
      });
    }
  } catch (err) {
    console.error('Erro ao enumerar dispositivos:', err);
  }
}

async function switchMicrophone(deviceId) {
  state.selectedMicId = deviceId;
  try {
    if (state.localVoiceStream) {
      state.localVoiceStream.getTracks().forEach(t => t.stop());
    }

    const noiseSupp = elements.chkNoiseSuppression.checked;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: noiseSupp,
        noiseSuppression: noiseSupp,
        autoGainControl: true
      },
      video: false
    });

    state.localVoiceStream = stream;
    const newTrack = stream.getAudioTracks()[0];

    if (state.isMicMuted || (state.voiceMode === 'ptt' && !state.isPttActive)) {
      newTrack.enabled = false;
    }

    setupSelfAudioAnalyser(stream);

    for (const [peerId, pc] of state.peerConnections.entries()) {
      const senders = pc.getSenders();
      const audioSender = senders.find(s => s.track && s.track.kind === 'audio');
      if (audioSender) {
        await audioSender.replaceTrack(newTrack);
      } else {
        pc.addTrack(newTrack, stream);
      }
    }

    showToast('🎙️ Microfone alterado!');
  } catch (err) {
    console.error('Erro ao trocar microfone:', err);
    showToast('⚠️ Erro ao trocar microfone: ' + err.message);
  }
}

async function switchAudioOutput(deviceId) {
  state.selectedSpeakerId = deviceId;
  try {
    if (typeof elements.remoteVoiceAudio.setSinkId === 'function') {
      await elements.remoteVoiceAudio.setSinkId(deviceId);
    }
    if (typeof elements.remoteVideo.setSinkId === 'function') {
      await elements.remoteVideo.setSinkId(deviceId);
    }
    showToast('🔊 Saída de áudio alterada!');
  } catch (err) {
    console.warn('setSinkId:', err);
  }
}

function playSpeakerTestSound() {
  try {
    const audioContextClass = window.AudioContext || window.webkitAudioContext;
    const ctx = new audioContextClass();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(freq, now + i * 0.12);
      gain.gain.setValueAtTime(0.15, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.4);
    });
    showToast('🔔 Som de teste tocando!');
  } catch (e) {}
}

// ============================================================================
// Inicialização do Chat de Voz (Microfone Local)
// ============================================================================
async function initVoiceChat() {
  try {
    const audioContextClass = window.AudioContext || window.webkitAudioContext;
    state.audioCtx = new audioContextClass();

    const noiseSupp = elements.chkNoiseSuppression.checked;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: state.selectedMicId ? { exact: state.selectedMicId } : undefined,
        echoCancellation: noiseSupp,
        noiseSuppression: noiseSupp,
        autoGainControl: true
      },
      video: false
    });

    state.localVoiceStream = stream;
    const audioTrack = stream.getAudioTracks()[0];

    setupSelfAudioAnalyser(stream);

    if (state.voiceMode === 'ptt') {
      setMicEnabled(false);
      elements.selfMicState.textContent = 'Push-to-Talk (Segure V)';
    } else {
      elements.selfMicState.textContent = 'Microfone Ativo';
    }

    await populateAudioDevices();
    showToast('🎙️ Chat de Voz Conectado!');
  } catch (err) {
    console.warn('Microfone não autorizado:', err);
    elements.selfMicState.textContent = 'Microfone Desativado';
    elements.btnToggleMic.classList.add('muted');
    state.isMicMuted = true;
    await populateAudioDevices();
  }
}

function setupSelfAudioAnalyser(stream) {
  if (!state.audioCtx) return;
  try {
    const source = state.audioCtx.createMediaStreamSource(stream);
    state.selfAnalyser = state.audioCtx.createAnalyser();
    state.selfAnalyser.fftSize = 256;
    source.connect(state.selfAnalyser);
    startVadLoop();
  } catch (e) {}
}

function setupFriendAudioAnalyser(stream) {
  if (!state.audioCtx) {
    const audioContextClass = window.AudioContext || window.webkitAudioContext;
    state.audioCtx = new audioContextClass();
  }
  try {
    if (state.audioCtx.state === 'suspended') state.audioCtx.resume();
    const source = state.audioCtx.createMediaStreamSource(stream);
    state.friendAnalyser = state.audioCtx.createAnalyser();
    state.friendAnalyser.fftSize = 256;
    source.connect(state.friendAnalyser);
  } catch (e) {}
}

function startVadLoop() {
  const selfData = new Uint8Array(128);
  const friendData = new Uint8Array(128);

  const checkAudioLevels = () => {
    // Fala Local
    if (state.selfAnalyser && !state.isMicMuted && !state.isDeafened) {
      state.selfAnalyser.getByteFrequencyData(selfData);
      let sum = 0;
      for (let i = 0; i < selfData.length; i++) sum += selfData[i];
      const avg = sum / selfData.length;

      const vuPercent = Math.min(100, Math.round((avg / 80) * 100));
      const vuBar = elements.selfVuMeter.querySelector('.vu-bar');
      if (vuBar) vuBar.style.height = `${vuPercent}%`;

      if (avg > 8) {
        elements.avatarSelfWrapper.classList.add('speaking');
      } else {
        elements.avatarSelfWrapper.classList.remove('speaking');
      }
    } else {
      elements.avatarSelfWrapper.classList.remove('speaking');
      const vuBar = elements.selfVuMeter.querySelector('.vu-bar');
      if (vuBar) vuBar.style.height = '0%';
    }

    // Fala do Amigo
    if (state.friendAnalyser && !state.isDeafened) {
      state.friendAnalyser.getByteFrequencyData(friendData);
      let sum = 0;
      for (let i = 0; i < friendData.length; i++) sum += friendData[i];
      const avg = sum / friendData.length;

      if (avg > 8) {
        elements.avatarFriendWrapper.classList.add('speaking');
        elements.friendMicState.textContent = 'Falando...';
      } else {
        elements.avatarFriendWrapper.classList.remove('speaking');
        elements.friendMicState.textContent = 'Conectado';
      }
    }

    requestAnimationFrame(checkAudioLevels);
  };

  requestAnimationFrame(checkAudioLevels);
}

// ============================================================================
// Controles de Mute, Deafen e Push-to-Talk
// ============================================================================
function setMicEnabled(enabled) {
  if (state.localVoiceStream) {
    state.localVoiceStream.getAudioTracks().forEach(track => {
      track.enabled = enabled;
    });
  }
}

function toggleMute() {
  state.isMicMuted = !state.isMicMuted;
  setMicEnabled(!state.isMicMuted);

  if (state.isMicMuted) {
    elements.btnToggleMic.classList.add('muted');
    elements.btnToggleMic.classList.remove('active');
    elements.micLabel.textContent = 'Mutado';
    elements.selfMicState.textContent = 'Microfone Mutado';
    showToast('🔇 Microfone mutado');
  } else {
    elements.btnToggleMic.classList.remove('muted');
    elements.btnToggleMic.classList.add('active');
    elements.micLabel.textContent = 'Microfone';
    elements.selfMicState.textContent = 'Microfone Ativo';
    showToast('🎙️ Microfone ativado');
  }
}

function toggleDeafen() {
  state.isDeafened = !state.isDeafened;

  if (state.isDeafened) {
    setMicEnabled(false);
    elements.remoteVoiceAudio.muted = true;
    elements.remoteVideo.muted = true;

    elements.btnToggleDeafen.classList.add('deafened');
    elements.btnToggleMic.classList.add('muted');
    elements.selfMicState.textContent = 'Ensurdecido';
    showToast('🎧 Áudio e Microfone Desativados');
  } else {
    if (!state.isMicMuted) setMicEnabled(true);
    elements.remoteVoiceAudio.muted = false;
    elements.remoteVideo.muted = false;

    elements.btnToggleDeafen.classList.remove('deafened');
    if (!state.isMicMuted) elements.btnToggleMic.classList.remove('muted');
    elements.selfMicState.textContent = state.isMicMuted ? 'Mutado' : 'Microfone Ativo';
    showToast('🔊 Áudio restaurado');
  }
}

// Push-to-Talk Listeners
window.addEventListener('keydown', (e) => {
  if (state.voiceMode === 'ptt' && (e.key === 'v' || e.key === 'V') && !state.isPttActive) {
    const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
    if (isTyping) return;

    state.isPttActive = true;
    setMicEnabled(true);
    elements.selfMicState.textContent = 'Falando (PTT)...';
  }

  if ((e.key === 'm' || e.key === 'M') && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
    toggleMute();
  }

  if ((e.key === 'd' || e.key === 'D') && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
    toggleDeafen();
  }
});

window.addEventListener('keyup', (e) => {
  if (state.voiceMode === 'ptt' && (e.key === 'v' || e.key === 'V') && state.isPttActive) {
    state.isPttActive = false;
    setMicEnabled(false);
    elements.selfMicState.textContent = 'Push-to-Talk (Segure V)';
    elements.avatarSelfWrapper.classList.remove('speaking');
  }
});

// ============================================================================
// Inicialização de Rede e Sinalização
// ============================================================================
async function initNetworkInfo() {
  try {
    const res = await fetch('/api/network-info');
    const data = await res.json();
    state.serverPort = data.port || 3000;
    
    if (data.primaryRadminIp) {
      state.radminIp = data.primaryRadminIp;
      elements.detectedRadminIp.textContent = `https://${state.radminIp}:${state.serverPort}`;
    } else if (data.interfaces && data.interfaces.length > 0) {
      state.radminIp = data.interfaces[0].ip;
      elements.detectedRadminIp.textContent = `https://${state.radminIp}:${state.serverPort}`;
    } else {
      elements.detectedRadminIp.textContent = `https://localhost:${state.serverPort}`;
    }
  } catch (err) {
    elements.detectedRadminIp.textContent = `https://localhost:${state.serverPort}`;
  }
}

function connectSignaling() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;

  updateStatus('connecting', 'Conectando ao Servidor...');
  state.ws = new WebSocket(wsUrl);

  state.ws.onopen = () => {
    updateStatus('connected', 'Conectado à Sala');
    sendSignaling({
      type: 'join',
      room: state.room,
      username: state.username
    });
  };

  state.ws.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);
      await handleSignalingMessage(data);
    } catch (err) {
      console.error('Erro de sinalização:', err);
    }
  };

  state.ws.onclose = () => {
    updateStatus('disconnected', 'Desconectado');
    setTimeout(connectSignaling, 3000);
  };

  state.ws.onerror = () => {
    updateStatus('disconnected', 'Erro na conexão');
  };
}

function sendSignaling(data) {
  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify(data));
  }
}

async function handleSignalingMessage(data) {
  switch (data.type) {
    case 'welcome':
      state.myId = data.id;
      break;

    case 'peers-list':
      if (data.peers.length > 0) {
        state.remotePeerId = data.peers[0].id;
        state.remoteUsername = data.peers[0].username || 'Amigo';
        elements.friendVoiceName.textContent = state.remoteUsername;
        elements.voiceCount.textContent = '2 conectados';
      }
      for (const peer of data.peers) {
        initiatePeerConnection(peer.id);
      }
      break;

    case 'peer-joined':
      state.remotePeerId = data.peer.id;
      state.remoteUsername = data.peer.username || 'Amigo';
      elements.friendVoiceName.textContent = state.remoteUsername;
      elements.voiceCount.textContent = '2 conectados';

      showToast(`👋 ${state.remoteUsername} entrou na sala!`);
      appendSystemMessage(`${state.remoteUsername} entrou.`);
      getOrCreatePeerConnection(data.peer.id);
      break;

    case 'peer-left':
      showToast(`🚪 ${state.remoteUsername} saiu.`);
      appendSystemMessage(`${state.remoteUsername} saiu.`);
      elements.voiceCount.textContent = '1 conectado';
      elements.friendMicState.textContent = 'Desconectado';
      closePeer(data.peerId);
      break;

    case 'sharing-status-changed':
      if (data.sharing) {
        showToast(`📺 ${state.remoteUsername} começou a transmitir a tela!`);
      } else {
        showToast(`⏹️ Transmissão de tela finalizada.`);
        hideRemoteStream();
      }
      break;

    case 'offer':
      await handleOffer(data);
      break;

    case 'answer':
      await handleAnswer(data);
      break;

    case 'ice-candidate':
      await handleIceCandidate(data);
      break;

    case 'chat-message':
      handleIncomingChat(data);
      break;

    case 'chat-file':
      handleIncomingFile(data);
      break;

    case 'pinned-link-update':
      handlePinnedLinkUpdate(data.pinnedLink);
      break;
  }
}

// ============================================================================
// WebRTC Gerenciamento P2P
// ============================================================================
function getOrCreatePeerConnection(peerId) {
  if (state.peerConnections.has(peerId)) {
    return state.peerConnections.get(peerId);
  }

  console.log('[WebRTC] Criando RTCPeerConnection para:', peerId);
  const pc = new RTCPeerConnection(rtcConfig);
  state.peerConnections.set(peerId, pc);

  try {
    pc.addTransceiver('audio', { direction: 'sendrecv' });
    pc.addTransceiver('video', { direction: 'sendrecv' });
  } catch (e) {}

  if (state.localVoiceStream) {
    const voiceTrack = state.localVoiceStream.getAudioTracks()[0];
    if (voiceTrack) {
      const senders = pc.getSenders();
      const audioSender = senders.find(s => s.track && s.track.kind === 'audio') || senders.find(s => !s.track);
      if (audioSender) {
        audioSender.replaceTrack(voiceTrack).catch(() => {});
      } else {
        pc.addTrack(voiceTrack, state.localVoiceStream);
      }
    }
  }

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      sendSignaling({
        type: 'ice-candidate',
        target: peerId,
        candidate: event.candidate
      });
    }
  };

  pc.oniceconnectionstatechange = () => {
    console.log('[WebRTC ICE State]:', pc.iceConnectionState);
    if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
      updateStatus('connected', 'P2P Direto Ativo (60 FPS)');
      startStatsMonitor(pc);
    } else if (pc.iceConnectionState === 'failed') {
      console.warn('[WebRTC] Reiniciando ICE...');
      pc.restartIce();
    }
  };

  pc.ontrack = (event) => {
    console.log('[WebRTC ontrack] Track recebido:', event.track.kind, event.streams);
    const track = event.track;
    const stream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([track]);

    if (track.kind === 'video') {
      state.remoteStream = stream;
      displayRemoteStream(stream, peerId);
    } else if (track.kind === 'audio') {
      state.remoteVoiceStream = stream;
      elements.remoteVoiceAudio.srcObject = stream;
      elements.remoteVoiceAudio.muted = false;
      
      const vol = parseFloat(elements.friendVoiceVolume.value) || 1.0;
      elements.remoteVoiceAudio.volume = Math.min(1.0, vol);
      elements.remoteVoiceAudio.play().catch(() => {});

      setupFriendAudioAnalyser(stream);
      elements.friendMicState.textContent = 'Conectado (Ouvindo)';
    }
  };

  return pc;
}

async function initiatePeerConnection(peerId) {
  const pc = getOrCreatePeerConnection(peerId);
  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    sendSignaling({
      type: 'offer',
      target: peerId,
      offer: offer
    });
  } catch (err) {
    console.error('[WebRTC] Erro oferta:', err);
  }
}

async function handleOffer(data) {
  const pc = getOrCreatePeerConnection(data.sender);
  try {
    if (pc.signalingState === 'have-local-offer') {
      const isPolite = state.myId < data.sender;
      if (!isPolite) return;
      await pc.setLocalDescription({ type: 'rollback' });
    }

    await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
    await flushQueuedCandidates(data.sender, pc);

    if (state.localVoiceStream) {
      const voiceTrack = state.localVoiceStream.getAudioTracks()[0];
      if (voiceTrack) {
        const senders = pc.getSenders();
        const audioSender = senders.find(s => s.track && s.track.kind === 'audio') || senders.find(s => !s.track);
        if (audioSender) {
          await audioSender.replaceTrack(voiceTrack);
        } else {
          pc.addTrack(voiceTrack, state.localVoiceStream);
        }
      }
    }

    if (state.localStream) {
      const videoTrack = state.localStream.getVideoTracks()[0];
      if (videoTrack) {
        const senders = pc.getSenders();
        const videoSender = senders.find(s => s.track && s.track.kind === 'video') || senders.find(s => !s.track);
        if (videoSender) {
          await videoSender.replaceTrack(videoTrack);
        } else {
          pc.addTrack(videoTrack, state.localStream);
        }
      }
    }

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    sendSignaling({
      type: 'answer',
      target: data.sender,
      answer: answer
    });
  } catch (err) {
    console.error('[WebRTC] Erro no handleOffer:', err);
  }
}

async function handleAnswer(data) {
  const pc = state.peerConnections.get(data.sender);
  if (pc) {
    try {
      if (pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        await flushQueuedCandidates(data.sender, pc);
      }
    } catch (err) {
      console.error('[WebRTC] Erro no handleAnswer:', err);
    }
  }
}

async function handleIceCandidate(data) {
  const pc = state.peerConnections.get(data.sender);
  if (pc && pc.remoteDescription && pc.remoteDescription.type) {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (err) {}
  } else {
    if (!state.iceCandidatesQueue.has(data.sender)) {
      state.iceCandidatesQueue.set(data.sender, []);
    }
    state.iceCandidatesQueue.get(data.sender).push(data.candidate);
  }
}

async function flushQueuedCandidates(peerId, pc) {
  const queued = state.iceCandidatesQueue.get(peerId) || [];
  for (const cand of queued) {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(cand));
    } catch (e) {}
  }
  state.iceCandidatesQueue.delete(peerId);
}

function closePeer(peerId) {
  const pc = state.peerConnections.get(peerId);
  if (pc) {
    pc.close();
    state.peerConnections.delete(peerId);
  }
  state.iceCandidatesQueue.delete(peerId);
  if (state.peerConnections.size === 0) {
    hideRemoteStream();
    elements.remoteVoiceAudio.srcObject = null;
  }
}

// ============================================================================
// Compartilhamento de Tela
// ============================================================================
async function toggleScreenShare() {
  if (state.isSharing) stopScreenShare();
  else await startScreenShare();
}

async function startScreenShare() {
  try {
    const selectedFps = parseInt(document.querySelector('input[name="fpsChoice"]:checked')?.value || '60', 10);
    const includeAudio = elements.chkAudioSystem.checked;

    let stream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always', frameRate: { ideal: selectedFps, max: selectedFps } },
        audio: includeAudio
      });
    } catch (err) {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always', frameRate: { ideal: selectedFps } },
        audio: false
      });
    }

    state.localStream = stream;
    state.isSharing = true;

    elements.localVideo.srcObject = stream;
    elements.localCard.style.display = 'flex';
    elements.btnShareScreen.classList.add('sharing');
    elements.shareBtnLabel.textContent = 'Parar Transmissão';

    const videoTrack = stream.getVideoTracks()[0];
    const audioTrack = stream.getAudioTracks()[0];

    for (const [peerId, pc] of state.peerConnections.entries()) {
      const senders = pc.getSenders();
      const videoSender = senders.find(s => s.track && s.track.kind === 'video') || senders.find(s => !s.track);
      
      if (videoSender) {
        await videoSender.replaceTrack(videoTrack);
      } else {
        pc.addTrack(videoTrack, stream);
      }

      if (audioTrack) {
        pc.addTrack(audioTrack, stream);
      }

      if (pc.signalingState === 'stable') {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignaling({ type: 'offer', target: peerId, offer: offer });
      }
    }

    sendSignaling({ type: 'sharing-status', sharing: true });

    if (videoTrack) {
      videoTrack.onended = () => stopScreenShare();
    }

    showToast('🎉 Tela transmitida com sucesso!');
  } catch (err) {
    if (err.name !== 'NotAllowedError') {
      showToast('⚠️ Erro ao capturar tela: ' + err.message);
    }
  }
}

function stopScreenShare() {
  if (state.localStream) {
    state.localStream.getTracks().forEach(track => track.stop());
    state.localStream = null;
  }

  state.isSharing = false;
  elements.localVideo.srcObject = null;
  elements.localCard.style.display = 'none';
  elements.btnShareScreen.classList.remove('sharing');
  elements.shareBtnLabel.textContent = 'Compartilhar Tela';

  for (const [peerId, pc] of state.peerConnections.entries()) {
    pc.getSenders().forEach(sender => {
      if (sender.track && sender.track.kind === 'video') {
        try { pc.removeTrack(sender); } catch (e) {}
      }
    });
  }

  sendSignaling({ type: 'sharing-status', sharing: false });
  showToast('Transmissão de tela finalizada.');
}

// ============================================================================
// Exibição e Controles do Stream Remoto
// ============================================================================
function displayRemoteStream(stream, peerId) {
  elements.remoteVideo.srcObject = stream;
  elements.emptyPlaceholder.style.display = 'none';
  elements.remoteLivePill.style.display = 'inline-block';
  elements.remotePeerTag.textContent = `${state.remoteUsername} (Ao Vivo)`;

  elements.remoteVideo.play().catch(err => {
    elements.remoteVideo.muted = true;
    elements.remoteVideo.play();
  });
}

function hideRemoteStream() {
  elements.remoteVideo.srcObject = null;
  elements.emptyPlaceholder.style.display = 'flex';
  elements.remoteLivePill.style.display = 'none';
  elements.remotePeerTag.textContent = 'Tela do Amigo';
  elements.statsOverlay.classList.remove('active');
}

// ============================================================================
// Gravação e Screenshot
// ============================================================================
function takeScreenshot() {
  const video = (elements.remoteVideo.srcObject && elements.remoteVideo.videoWidth) ? elements.remoteVideo : (elements.localVideo.srcObject ? elements.localVideo : null);
  if (!video || !video.videoWidth) {
    showToast('⚠️ Nenhuma tela ativa para capturar.');
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const link = document.createElement('a');
  link.download = `telaviewer-screenshot-${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  showToast('📸 Screenshot salvo com sucesso!');
}

function toggleRecording() {
  if (state.isRecording) stopRecording();
  else startRecording();
}

function startRecording() {
  const streamToRecord = state.remoteStream || state.localStream;
  if (!streamToRecord) {
    showToast('⚠️ Nenhuma transmissão ativa para gravar.');
    return;
  }

  try {
    state.recordedChunks = [];
    const mimeTypes = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    const chosenMime = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';

    state.mediaRecorder = new MediaRecorder(streamToRecord, chosenMime ? { mimeType: chosenMime } : {});

    state.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) state.recordedChunks.push(e.data);
    };

    state.mediaRecorder.onstop = () => {
      const blob = new Blob(state.recordedChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `telaviewer-gravacao-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('💾 Gravação salva com sucesso!');
    };

    state.mediaRecorder.start(1000);
    state.isRecording = true;
    state.recordStartTime = Date.now();

    elements.btnRecord.classList.add('recording');
    elements.recordLabel.textContent = '00:00';

    state.recordTimerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - state.recordStartTime) / 1000);
      const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const secs = String(elapsed % 60).padStart(2, '0');
      elements.recordLabel.textContent = `${mins}:${secs}`;
    }, 1000);

    showToast('🔴 Gravação iniciada!');
  } catch (err) {
    showToast('⚠️ Erro ao gravar: ' + err.message);
  }
}

function stopRecording() {
  if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
    state.mediaRecorder.stop();
  }
  state.isRecording = false;
  clearInterval(state.recordTimerInterval);
  elements.btnRecord.classList.remove('recording');
  elements.recordLabel.textContent = 'Gravar';
}

// ============================================================================
// Monitor de Estatísticas WebRTC
// ============================================================================
let prevBytesReceived = 0;
let prevTimestamp = 0;

function startStatsMonitor(pc) {
  stopStatsMonitor();
  state.statsInterval = setInterval(async () => {
    try {
      const stats = await pc.getStats();
      stats.forEach(report => {
        if (report.type === 'inbound-rtp' && report.kind === 'video') {
          if (report.framesPerSecond !== undefined) {
            elements.statFps.textContent = `${Math.round(report.framesPerSecond)} FPS`;
          }
          if (report.frameWidth && report.frameHeight) {
            elements.statRes.textContent = `${report.frameWidth}x${report.frameHeight}`;
          }
          if (report.bytesReceived !== undefined && prevTimestamp > 0) {
            const bytesDelta = report.bytesReceived - prevBytesReceived;
            const timeDelta = (report.timestamp - prevTimestamp) / 1000;
            const bitrateMbps = ((bytesDelta * 8) / (timeDelta * 1000000)).toFixed(2);
            elements.statBitrate.textContent = `${bitrateMbps} Mbps`;
          }
          prevBytesReceived = report.bytesReceived;
          prevTimestamp = report.timestamp;
        }

        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          if (report.currentRoundTripTime !== undefined) {
            const rttMs = Math.round(report.currentRoundTripTime * 1000);
            elements.statPing.textContent = `${rttMs} ms`;
          }
        }
      });
    } catch (e) {}
  }, 1500);
}

function stopStatsMonitor() {
  if (state.statsInterval) {
    clearInterval(state.statsInterval);
    state.statsInterval = null;
  }
}

// ============================================================================
// Chat Avançado: Texto, Transferência de Arquivos e Links Fixados
// ============================================================================
function handleIncomingChat(data) {
  const isSelf = data.sender === state.myId;
  const msgEl = document.createElement('div');
  msgEl.className = `chat-msg ${isSelf ? 'self' : 'other'}`;
  
  const formattedText = autoLinkify(escapeHtml(data.text));

  msgEl.innerHTML = `
    <div class="chat-msg-meta">
      <span>${escapeHtml(data.username || 'Amigo')}</span>
      <span>${data.time}</span>
    </div>
    <div class="chat-msg-bubble">${formattedText}</div>
  `;
  
  elements.chatMessages.appendChild(msgEl);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;

  if (!state.isChatOpen && !isSelf) {
    state.unreadCount++;
    elements.chatUnreadBadge.textContent = state.unreadCount;
    elements.chatUnreadBadge.style.display = 'inline-block';
  }
}

function handleIncomingFile(data) {
  const isSelf = data.sender === state.myId;
  const msgEl = document.createElement('div');
  msgEl.className = `chat-msg ${isSelf ? 'self' : 'other'}`;

  const isImage = data.fileType && data.fileType.startsWith('image/');
  const isAudio = data.fileType && data.fileType.startsWith('audio/');
  const formattedSize = formatBytes(data.fileSize);

  let mediaHtml = '';
  if (isImage) {
    mediaHtml = `<img src="${data.fileData}" class="chat-image-preview" alt="${escapeHtml(data.fileName)}" title="Clique para abrir imagem original">`;
  } else if (isAudio) {
    mediaHtml = `<audio controls class="chat-audio-player" src="${data.fileData}"></audio>`;
  }

  msgEl.innerHTML = `
    <div class="chat-msg-meta">
      <span>${escapeHtml(data.username || 'Amigo')}</span>
      <span>${data.time}</span>
    </div>
    <div class="chat-msg-bubble">
      ${mediaHtml}
      <div class="chat-file-card">
        <div class="file-icon">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>
        </div>
        <div class="file-details">
          <span class="file-name" title="${escapeHtml(data.fileName)}">${escapeHtml(data.fileName)}</span>
          <span class="file-size">${formattedSize}</span>
        </div>
        <button type="button" class="btn-file-download" title="Baixar Arquivo">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </button>
      </div>
    </div>
  `;

  // Listener para download do arquivo
  const downloadBtn = msgEl.querySelector('.btn-file-download');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = data.fileData;
      a.download = data.fileName;
      a.click();
    });
  }

  // Se for imagem, clique abre em nova guia
  const imgPreview = msgEl.querySelector('.chat-image-preview');
  if (imgPreview) {
    imgPreview.addEventListener('click', () => {
      const win = window.open();
      win.document.write(`<img src="${data.fileData}" style="max-width:100%;">`);
    });
  }

  elements.chatMessages.appendChild(msgEl);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;

  if (!state.isChatOpen && !isSelf) {
    state.unreadCount++;
    elements.chatUnreadBadge.textContent = state.unreadCount;
    elements.chatUnreadBadge.style.display = 'inline-block';
    showToast(`📁 ${data.username} enviou um arquivo: ${data.fileName}`);
  }
}

// Envio de Arquivo Local
function sendFile(file) {
  if (!file) return;

  // Limite razoável de 150MB por arquivo para transferência via WebSockets
  if (file.size > 150 * 1024 * 1024) {
    showToast('⚠️ O arquivo excede o limite de 150MB.');
    return;
  }

  showToast(`⏳ Enviando ${file.name}...`);
  const reader = new FileReader();

  reader.onload = () => {
    sendSignaling({
      type: 'chat-file',
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      fileData: reader.result
    });
    showToast(`✅ Arquivo ${file.name} enviado!`);
  };

  reader.readAsDataURL(file);
}

// Links Fixados (Spotify Jam, Twitch, YouTube, etc.)
function handlePinnedLinkUpdate(pinData) {
  state.pinnedLink = pinData;
  if (!pinData) {
    elements.pinnedLinkBar.style.display = 'none';
    return;
  }

  elements.pinnedLinkTitle.textContent = pinData.title;
  elements.pinnedLinkTitle.href = pinData.url;
  elements.btnOpenPinned.href = pinData.url;

  // Escolha do ícone
  const iconType = pinData.iconType || detectLinkType(pinData.url);
  elements.pinnedLinkIcon.className = `pinned-link-icon ${iconType}`;

  if (iconType === 'spotify') {
    elements.pinnedLinkIcon.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424a.625.625 0 0 1-.86.207c-2.355-1.439-5.32-1.764-8.814-.964a.624.624 0 1 1-.278-1.218c3.824-.875 7.106-.5 9.745 1.115a.625.625 0 0 1 .207.86zm1.226-2.729a.782.782 0 0 1-1.077.258c-2.697-1.658-6.808-2.138-9.998-1.17a.782.782 0 1 1-.453-1.498c3.642-1.106 8.19-.57 11.27 1.333a.782.782 0 0 1 .258 1.077zm.105-2.836C14.685 9.07 9.355 8.89 6.26 9.83a.937.937 0 1 1-.548-1.792c3.553-1.078 9.43-.872 13.15 1.336a.937.937 0 0 1-1.045 1.585z"/>
      </svg>`;
  } else if (iconType === 'youtube') {
    elements.pinnedLinkIcon.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>`;
  } else if (iconType === 'twitch') {
    elements.pinnedLinkIcon.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
      </svg>`;
  } else {
    elements.pinnedLinkIcon.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
      </svg>`;
  }

  elements.pinnedLinkBar.style.display = 'flex';
  showToast(`📌 Link fixado por ${pinData.pinnedBy}: ${pinData.title}`);
}

function detectLinkType(url) {
  const lower = url.toLowerCase();
  if (lower.includes('spotify.com') || lower.includes('spotify.link')) return 'spotify';
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  if (lower.includes('twitch.tv')) return 'twitch';
  return 'web';
}

function pinCurrentLink(url, customTitle) {
  if (!url) return;
  const iconType = detectLinkType(url);
  let title = customTitle.trim();
  
  if (!title) {
    if (iconType === 'spotify') title = '🎵 Spotify Jam - Ouvir Juntos';
    else if (iconType === 'youtube') title = '🎥 Vídeo do YouTube';
    else if (iconType === 'twitch') title = '🟣 Live na Twitch';
    else title = url;
  }

  sendSignaling({
    type: 'pin-link',
    url: url,
    title: title,
    iconType: iconType
  });

  elements.pinLinkModal.style.display = 'none';
  elements.inputPinUrl.value = '';
  elements.inputPinTitle.value = '';
}

function unpinLink() {
  sendSignaling({ type: 'unpin-link' });
  elements.pinnedLinkBar.style.display = 'none';
  showToast('Link desafixado do chat.');
}

function appendSystemMessage(text) {
  const msg = document.createElement('div');
  msg.className = 'chat-system-msg';
  msg.textContent = text;
  elements.chatMessages.appendChild(msg);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

function toggleChat() {
  state.isChatOpen = !state.isChatOpen;
  if (state.isChatOpen) {
    elements.chatSidebar.classList.add('open');
    elements.btnToggleChat.classList.add('active');
    state.unreadCount = 0;
    elements.chatUnreadBadge.style.display = 'none';
  } else {
    elements.chatSidebar.classList.remove('open');
    elements.btnToggleChat.classList.remove('active');
  }
}

function autoLinkify(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, url => `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:var(--accent-color); text-decoration:underline;">${url}</a>`);
}

function formatBytes(bytes, decimals = 1) {
  if (!bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// ============================================================================
// Utilitários de UI
// ============================================================================
function updateStatus(status, text) {
  elements.connectionStatus.className = `status-badge ${status}`;
  elements.connectionStatus.querySelector('.status-text').textContent = text;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('show');
  setTimeout(() => elements.toast.classList.remove('show'), 3000);
}

function copyInviteLink() {
  const hostIp = state.radminIp || window.location.hostname;
  const inviteUrl = `https://${hostIp}:${state.serverPort}`;
  navigator.clipboard.writeText(inviteUrl).then(() => {
    elements.copyInviteText.textContent = 'Copiado!';
    showToast(`📋 Link copiado: ${inviteUrl}`);
    setTimeout(() => elements.copyInviteText.textContent = 'Copiar Link do Amigo', 2500);
  }).catch(() => {
    prompt('Copie o link abaixo:', inviteUrl);
  });
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[m]);
}

// ============================================================================
// Event Listeners
// ============================================================================
function setupEventListeners() {
  elements.btnShareScreen.addEventListener('click', toggleScreenShare);
  
  elements.btnQualitySettings.addEventListener('click', (e) => {
    e.stopPropagation();
    elements.qualityMenu.classList.toggle('show');
    elements.voiceSettingsMenu.classList.remove('show');
  });
  
  elements.btnVoiceSettings.addEventListener('click', (e) => {
    e.stopPropagation();
    elements.voiceSettingsMenu.classList.toggle('show');
    elements.qualityMenu.classList.remove('show');
    populateAudioDevices();
  });

  document.addEventListener('click', () => {
    elements.qualityMenu.classList.remove('show');
    elements.voiceSettingsMenu.classList.remove('show');
  });
  elements.qualityMenu.addEventListener('click', (e) => e.stopPropagation());
  elements.voiceSettingsMenu.addEventListener('click', (e) => e.stopPropagation());

  // Seleção de Dispositivos
  elements.selectMicDevice.addEventListener('change', (e) => switchMicrophone(e.target.value));
  elements.selectSpeakerDevice.addEventListener('change', (e) => switchAudioOutput(e.target.value));
  elements.btnTestSpeaker.addEventListener('click', playSpeakerTestSound);

  if (navigator.mediaDevices && navigator.mediaDevices.ondevicechange !== undefined) {
    navigator.mediaDevices.ondevicechange = () => populateAudioDevices();
  }

  // Modo de Voz
  document.querySelectorAll('input[name="voiceMode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      state.voiceMode = e.target.value;
      if (state.voiceMode === 'ptt') {
        setMicEnabled(false);
        elements.selfMicState.textContent = 'Push-to-Talk (Segure V)';
        showToast('🎙️ Modo Push-to-Talk (Segure V)');
      } else {
        setMicEnabled(!state.isMicMuted);
        elements.selfMicState.textContent = state.isMicMuted ? 'Mutado' : 'Microfone Ativo';
        showToast('🎙️ Detecção Automática de Voz');
      }
    });
  });

  elements.friendVoiceVolume.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    const percent = Math.round(val * 100);
    elements.friendVoiceVolLabel.textContent = `${percent}%`;
    elements.remoteVoiceAudio.volume = Math.min(1.0, val);
  });

  elements.btnToggleMic.addEventListener('click', toggleMute);
  elements.btnToggleDeafen.addEventListener('click', toggleDeafen);
  elements.btnCopyInvite.addEventListener('click', copyInviteLink);

  elements.btnRecord.addEventListener('click', toggleRecording);
  elements.btnScreenshot.addEventListener('click', takeScreenshot);
  elements.btnToggleStats.addEventListener('click', () => {
    elements.statsOverlay.classList.toggle('active');
    elements.btnToggleStats.classList.toggle('active');
  });
  elements.btnToggleChat.addEventListener('click', toggleChat);
  elements.btnCloseChat.addEventListener('click', toggleChat);

  elements.btnCloseLocalPreview.addEventListener('click', () => {
    elements.localCard.style.display = 'none';
  });

  elements.btnFullscreen.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      elements.remoteCard.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  });

  elements.btnPip.addEventListener('click', async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (elements.remoteVideo.srcObject) {
        await elements.remoteVideo.requestPictureInPicture();
      }
    } catch (e) {}
  });

  elements.remoteVolumeSlider.addEventListener('input', (e) => {
    elements.remoteVideo.volume = e.target.value;
  });

  elements.btnMuteRemote.addEventListener('click', () => {
    elements.remoteVideo.muted = !elements.remoteVideo.muted;
    elements.remoteVolumeSlider.value = elements.remoteVideo.muted ? 0 : elements.remoteVideo.volume;
    showToast(elements.remoteVideo.muted ? '🔇 Som do jogo mutado' : '🔊 Som do jogo ativado');
  });

  elements.btnChangeRoom.addEventListener('click', () => {
    const newRoom = elements.roomInput.value.trim();
    if (newRoom && newRoom !== state.room) {
      state.room = newRoom;
      sendSignaling({ type: 'join', room: state.room, username: state.username });
      showToast(`Entrou na sala: ${newRoom}`);
    }
  });

  elements.usernameInput.addEventListener('change', (e) => {
    state.username = e.target.value.trim() || 'Usuário';
    elements.selfVoiceName.textContent = `${state.username} (Você)`;
    sendSignaling({ type: 'set-username', username: state.username });
  });

  // Chat submit (Texto)
  elements.chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = elements.chatInput.value.trim();
    if (!text) return;
    
    sendSignaling({
      type: 'chat-message',
      text: text
    });
    elements.chatInput.value = '';
  });

  // Anexar Arquivos
  elements.btnAttachFile.addEventListener('click', () => {
    elements.chatFileInput.click();
  });

  elements.chatFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      sendFile(file);
      elements.chatFileInput.value = '';
    }
  });

  // Drag & Drop no Chat
  const dropZone = elements.chatSidebar;
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.dragDropOverlay.classList.add('active');
  });

  dropZone.addEventListener('dragleave', (e) => {
    if (!dropZone.contains(e.relatedTarget)) {
      elements.dragDropOverlay.classList.remove('active');
    }
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.dragDropOverlay.classList.remove('active');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      sendFile(e.dataTransfer.files[0]);
    }
  });

  // Link Fixado (Modal e Ações)
  elements.btnPinLinkPrompt.addEventListener('click', () => {
    elements.pinLinkModal.style.display = 'flex';
    elements.inputPinUrl.focus();
  });

  elements.btnClosePinModal.addEventListener('click', () => elements.pinLinkModal.style.display = 'none');
  elements.btnCancelPin.addEventListener('click', () => elements.pinLinkModal.style.display = 'none');

  elements.btnConfirmPin.addEventListener('click', () => {
    const url = elements.inputPinUrl.value.trim();
    const title = elements.inputPinTitle.value.trim();
    if (!url) {
      showToast('⚠️ Insira um link válido para fixar.');
      return;
    }
    pinCurrentLink(url, title);
  });

  elements.btnUnpinLink.addEventListener('click', unpinLink);

  // Presets Rápidos de Link Fixado
  document.querySelectorAll('.preset-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      const preset = tag.getAttribute('data-preset');
      if (preset === 'spotify') {
        elements.inputPinUrl.placeholder = 'https://spotify.link/...';
        elements.inputPinTitle.value = '🎵 Spotify Jam - Bora ouvir juntos!';
      } else if (preset === 'youtube') {
        elements.inputPinUrl.placeholder = 'https://youtube.com/watch?v=...';
        elements.inputPinTitle.value = '🎥 Vídeo do YouTube';
      } else if (preset === 'twitch') {
        elements.inputPinUrl.placeholder = 'https://twitch.tv/...';
        elements.inputPinTitle.value = '🟣 Live na Twitch';
      }
      elements.inputPinUrl.focus();
    });
  });
}

// Inicializar aplicação
window.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await initNetworkInfo();
  await initVoiceChat();
  connectSignaling();
});
