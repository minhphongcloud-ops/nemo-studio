/**
 * AvatarCommand — Command data structure.
 * The Avatar Engine only accepts these commands.
 * It knows nothing about TikTok, gifts, or external systems.
 */
export function createPlayCommand(animationId, duration) {
  return {
    type: 'PLAY_ANIMATION',
    animationId,
    duration: duration || 0,
  };
}

export function createStopCommand() {
  return { type: 'STOP' };
}

export function createPauseCommand() {
  return { type: 'PAUSE' };
}

export function createResumeCommand() {
  return { type: 'RESUME' };
}

export function createExpressionCommand(expression, weight = 1.0) {
  return {
    type: 'SET_EXPRESSION',
    expression,
    weight,
  };
}

export function createResetExpressionCommand() {
  return { type: 'RESET_EXPRESSION' };
}
