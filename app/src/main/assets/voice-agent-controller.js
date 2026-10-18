/**
 * VoiceAgentController
 * Opt-in microphone control & privacy state machine for Voice Agent preview.
 *
 * Safety & Privacy Principles:
 * - NO getUserMedia calls on module import or controller creation.
 * - Only explicit user actions (e.g. button click calling requestMicrophone()) trigger media access.
 * - Stale/race condition stream tracks are immediately stopped.
 * - Zero network calls, zero AI/TTS model provider calls, zero server recording or bytes upload.
 * - Mock transcript output is purely user-supplied and labelled 'preview only'.
 */

export const VOICE_AGENT_STATES = Object.freeze({
  IDLE: 'IDLE',
  REQUESTING: 'REQUESTING',
  LIVE: 'LIVE',
  MUTED: 'MUTED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  DEVICE_MISSING: 'DEVICE_MISSING',
  ERROR: 'ERROR'
});

export class VoiceAgentController {
  /**
   * @param {Object} [options]
   * @param {Object} [options.mediaAdapter] Custom injectible media adapter with getUserMedia/queryPermission
   * @param {string|null} [options.accountId] Current active account context ID
   */
  constructor(options = {}) {
    this.mediaAdapter = options.mediaAdapter || null;
    this.accountId = options.accountId || null;
    this.state = VOICE_AGENT_STATES.IDLE;
    this.stream = null;
    this.error = null;
    this.listeners = new Set();
    this.requestId = 0;

    this._boundPageHide = () => this.stopMicrophone();
    this._boundVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        this.stopMicrophone();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', this._boundPageHide);
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', this._boundVisibilityChange);
      }
    }
  }

  /**
   * Returns state truth object for UI rendering.
   */
  getStatus() {
    const audioTrack = this.stream ? this.stream.getAudioTracks()[0] : null;
    const isMuted = this.state === VOICE_AGENT_STATES.MUTED || (audioTrack ? !audioTrack.enabled : false);
    return {
      state: this.state,
      isLive: this.state === VOICE_AGENT_STATES.LIVE || this.state === VOICE_AGENT_STATES.MUTED,
      isMuted: isMuted,
      hasStream: !!this.stream,
      accountId: this.accountId,
      error: this.error ? (this.error.message || String(this.error)) : null
    };
  }

  /**
   * Subscribe listener callback for state changes.
   * @param {Function} listener
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    if (typeof listener === 'function') {
      this.listeners.add(listener);
      listener(this.getStatus());
    }
    return () => this.listeners.delete(listener);
  }

  _notify() {
    const status = this.getStatus();
    for (const listener of this.listeners) {
      try {
        listener(status);
      } catch (err) {
        // Safe listener exception suppression
      }
    }
  }

  /**
   * Set or switch active account context. If changed, active streams are immediately stopped.
   * @param {string|null} accountId
   */
  setAccountId(accountId) {
    if (this.accountId !== accountId) {
      this.stopMicrophone();
      this.accountId = accountId;
      this._notify();
    }
  }

  /**
   * Resolves appropriate mediaAdapter or window.navigator.mediaDevices.
   * Returns null if no adapter available.
   */
  _getAdapter() {
    if (this.mediaAdapter) return this.mediaAdapter;
    if (typeof window !== 'undefined' && window.navigator && window.navigator.mediaDevices) {
      return window.navigator.mediaDevices;
    }
    return null;
  }

  /**
   * Perform permission preflight check if mediaAdapter / navigator permissions API supports it.
   * @returns {Promise<'granted'|'denied'|'prompt'|'unknown'>}
   */
  async checkPermissionStatus() {
    const adapter = this._getAdapter();
    if (adapter && typeof adapter.queryPermission === 'function') {
      return await adapter.queryPermission('microphone');
    }
    if (typeof window !== 'undefined' && window.navigator && window.navigator.permissions && typeof window.navigator.permissions.query === 'function') {
      try {
        const res = await window.navigator.permissions.query({ name: 'microphone' });
        return res.state;
      } catch (_) {
        return 'unknown';
      }
    }
    return 'unknown';
  }

  /**
   * Request opt-in microphone access. MUST ONLY be called in response to direct user click/gesture.
   * @param {Object} [options]
   * @param {Object} [options.constraints] Optional MediaStreamConstraints
   * @returns {Promise<MediaStream|null>}
   */
  async requestMicrophone(options = {}) {
    // Guard concurrent presses while already requesting or live
    if (this.state === VOICE_AGENT_STATES.REQUESTING || this.state === VOICE_AGENT_STATES.LIVE || this.state === VOICE_AGENT_STATES.MUTED) {
      return null; // Never create a second active stream or duplicate a pending permission request.
    }

    const currentRequestId = ++this.requestId;
    const currentAccountId = this.accountId;

    // Lock synchronously BEFORE the first await; two rapid clicks must never race.
    this.state = VOICE_AGENT_STATES.REQUESTING;
    this.error = null;
    this._notify();

    let permStatus;
    try {
      permStatus = await this.checkPermissionStatus();
    } catch (_) {
      if (this.requestId !== currentRequestId || this.accountId !== currentAccountId) return null;
      this.state = VOICE_AGENT_STATES.ERROR;
      this.error = new Error('MIC_PERMISSION_PREFLIGHT_FAILED');
      this._notify();
      return null;
    }
    // A late denied preflight must not override Stop or an account switch.
    if (this.requestId !== currentRequestId || this.accountId !== currentAccountId) return null;
    if (permStatus === 'denied') {
      this.state = VOICE_AGENT_STATES.PERMISSION_DENIED;
      this.error = new Error('Microphone permission denied by user preflight');
      this._notify();
      return null;
    }

    // Check if cancelled/invalidated during preflight
    if (this.requestId !== currentRequestId || this.accountId !== currentAccountId) {
      return null;
    }

    const adapter = this._getAdapter();
    if (!adapter || typeof adapter.getUserMedia !== 'function') {
      this.state = VOICE_AGENT_STATES.DEVICE_MISSING;
      this.error = new Error('MediaDevice adapter or getUserMedia unsupported');
      this._notify();
      return null;
    }

    const constraints = options.constraints || { audio: true, video: false };

    try {
      const stream = await adapter.getUserMedia(constraints);

      // Race & Account cancellation guard:
      // If request was cancelled, account switched, or stop called during async getUserMedia
      if (this.requestId !== currentRequestId || this.accountId !== currentAccountId || this.state === VOICE_AGENT_STATES.IDLE) {
        if (stream && typeof stream.getTracks === 'function') {
          stream.getTracks().forEach(track => {
            if (typeof track.stop === 'function') track.stop();
          });
        }
        return null;
      }

      // Stop any existing stream
      if (this.stream && typeof this.stream.getTracks === 'function') {
        this.stream.getTracks().forEach(track => {
          if (typeof track.stop === 'function') track.stop();
        });
      }

      this.stream = stream;
      this.state = VOICE_AGENT_STATES.LIVE;
      this.error = null;
      this._notify();
      return stream;

    } catch (err) {
      // Check if invalidated during promise rejection
      if (this.requestId !== currentRequestId || this.accountId !== currentAccountId) {
        return null;
      }

      const errName = err ? (err.name || err.code || '') : '';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError' || errName === 'SecurityError') {
        this.state = VOICE_AGENT_STATES.PERMISSION_DENIED;
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        this.state = VOICE_AGENT_STATES.DEVICE_MISSING;
      } else {
        this.state = VOICE_AGENT_STATES.ERROR;
      }

      this.error = err;
      this._notify();
      return null;
    }
  }

  /**
   * Mute or unmute the audio track.
   * @param {boolean} [mute] If undefined, toggles current state.
   */
  setMute(mute) {
    if (!this.stream) return;
    const tracks = this.stream.getAudioTracks ? this.stream.getAudioTracks() : [];
    if (tracks.length === 0) return;

    const shouldMute = typeof mute === 'boolean' ? mute : (this.state !== VOICE_AGENT_STATES.MUTED);

    tracks.forEach(track => {
      track.enabled = !shouldMute;
    });

    if (shouldMute) {
      this.state = VOICE_AGENT_STATES.MUTED;
    } else {
      this.state = VOICE_AGENT_STATES.LIVE;
    }

    this._notify();
  }

  /**
   * Toggle mute state.
   */
  toggleMute() {
    this.setMute();
  }

  /**
   * Stop active stream tracks and reset to IDLE state.
   */
  stopMicrophone() {
    this.requestId++; // Invalidate pending requests
    if (this.stream && typeof this.stream.getTracks === 'function') {
      this.stream.getTracks().forEach(track => {
        if (typeof track.stop === 'function') track.stop();
      });
    }
    this.stream = null;
    this.state = VOICE_AGENT_STATES.IDLE;
    this.error = null;
    this._notify();
  }

  /**
   * Safely destroy controller instance and remove event listeners.
   */
  destroy() {
    this.stopMicrophone();
    this.listeners.clear();
    if (typeof window !== 'undefined') {
      window.removeEventListener('pagehide', this._boundPageHide);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', this._boundVisibilityChange);
      }
    }
  }

  /**
   * Format mock preview transcript from user-supplied string only.
   * Zero server calls, zero AI model calls, zero recording.
   * @param {string} userText
   */
  formatPreviewTranscript(userText) {
    return {
      text: String(userText || '').trim(),
      label: 'preview only',
      mock: true,
      timestamp: Date.now()
    };
  }
}
