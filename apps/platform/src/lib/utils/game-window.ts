type GameWindow = {
  start: number;
  end: number;
};

export function getUpcomingGameWindow(
  nextInterruptTime: number,
  intervalSeconds: number,
): GameWindow {
  return {
    start: nextInterruptTime,
    end: nextInterruptTime + intervalSeconds,
  };
}
