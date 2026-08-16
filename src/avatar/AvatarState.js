/**
 * AvatarState — State machine for the Avatar Engine.
 * 
 * States:
 *   EMPTY    → No VRM loaded
 *   LOADING  → VRM/VRMA file being loaded
 *   READY    → VRM loaded, idle
 *   IDLE     → VRM loaded, no animation playing
 *   PLAYING  → Animation is playing
 *   PAUSED   → Animation is paused at current frame
 *   ERROR    → Something went wrong
 */

export const AvatarState = Object.freeze({
  EMPTY:   'EMPTY',
  LOADING: 'LOADING',
  READY:   'READY',
  IDLE:    'IDLE',
  PLAYING: 'PLAYING',
  PAUSED:  'PAUSED',
  ERROR:   'ERROR',
});

export const AnimationState = Object.freeze({
  IDLE:      'IDLE',
  LOADING:   'LOADING',
  PLAYING:   'PLAYING',
  PAUSED:    'PAUSED',
  COMPLETED: 'COMPLETED',
  ERROR:     'ERROR',
});

/**
 * Valid state transitions.
 */
const TRANSITIONS = {
  [AvatarState.EMPTY]:   [AvatarState.LOADING],
  [AvatarState.LOADING]: [AvatarState.READY, AvatarState.ERROR, AvatarState.EMPTY],
  [AvatarState.READY]:   [AvatarState.IDLE, AvatarState.LOADING, AvatarState.EMPTY],
  [AvatarState.IDLE]:    [AvatarState.PLAYING, AvatarState.LOADING, AvatarState.EMPTY, AvatarState.ERROR],
  [AvatarState.PLAYING]: [AvatarState.PAUSED, AvatarState.IDLE, AvatarState.ERROR, AvatarState.EMPTY],
  [AvatarState.PAUSED]:  [AvatarState.PLAYING, AvatarState.IDLE, AvatarState.ERROR, AvatarState.EMPTY],
  [AvatarState.ERROR]:   [AvatarState.LOADING, AvatarState.EMPTY, AvatarState.IDLE],
};

export class AvatarStateMachine {
  constructor() {
    this._state = AvatarState.EMPTY;
    this._listeners = [];
  }

  get current() {
    return this._state;
  }

  canTransition(newState) {
    const allowed = TRANSITIONS[this._state];
    return allowed ? allowed.includes(newState) : false;
  }

  transition(newState) {
    if (!this.canTransition(newState)) {
      console.warn(`[AvatarState] Invalid transition: ${this._state} → ${newState}`);
      return false;
    }
    const prev = this._state;
    this._state = newState;
    this._listeners.forEach(fn => fn(newState, prev));
    return true;
  }

  forceState(newState) {
    const prev = this._state;
    this._state = newState;
    this._listeners.forEach(fn => fn(newState, prev));
  }

  onChange(callback) {
    this._listeners.push(callback);
    return () => {
      this._listeners = this._listeners.filter(fn => fn !== callback);
    };
  }
}
