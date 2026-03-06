export const PERIOD_LABELS: Record<string, string> = {
  '5d': '1W', '20d': '1M', '60d': '3M', '120d': '6M', '252d': '1Y'
};

export const BACKTEST_PERIODS = ['1y', '3y', '5y', '10y'] as const;
export const WINDOW_PERIODS = ['5d', '20d', '60d', '120d', '252d'] as const;
