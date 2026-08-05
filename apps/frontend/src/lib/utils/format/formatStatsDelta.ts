export interface StatsDelta {
  text: string;
  direction: 'up' | 'down' | 'neutral';
}

export function formatStatsDelta(delta: number): StatsDelta {
  if (delta > 0) return { text: `+%${delta}`, direction: 'up' };
  if (delta < 0) return { text: `%${delta}`, direction: 'down' };
  return { text: '%0', direction: 'neutral' };
}
