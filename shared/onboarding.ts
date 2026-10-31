// Onboarding content shared by the client (to render) and the server (to score).

export const DEFAULT_OATH = [
  'I risk no more than my set % per trade, sized with the Risk Forge.',
  'I only trade with the higher-timeframe trend or at clear range edges.',
  'I only enter at a level I marked before the session.',
  'Every trade has a stop loss before entry, and I never move it further away.',
  'I take only setups with reward:risk of 1:2 or better.',
  'After a loss I take a cooldown before looking for the next trade.',
  'When I hit my daily trade or loss limit, I stop for the day.',
];

export interface AssessmentQuestion {
  q: string;
  options: { label: string; score: number }[];
}

// Higher score = more impulsive risk-taking. Used only to tailor tips, never to judge.
export const ASSESSMENT: AssessmentQuestion[] = [
  {
    q: 'You just lost a trade. What do you feel like doing?',
    options: [
      { label: 'Close the charts and review later', score: 0 },
      { label: 'Wait a bit, then look for the next setup', score: 1 },
      { label: 'Jump back in to win it back', score: 2 },
    ],
  },
  {
    q: 'A trade is running in profit but not at target yet.',
    options: [
      { label: 'Leave it, my plan decides the exit', score: 0 },
      { label: 'Move stop to break-even and wait', score: 1 },
      { label: 'Close it before it turns around', score: 2 },
    ],
  },
  {
    q: 'You see a huge candle shooting up without you.',
    options: [
      { label: 'Let it go, it is not my setup', score: 0 },
      { label: 'Wait for a pullback to a level', score: 1 },
      { label: 'Buy now before it goes higher', score: 2 },
    ],
  },
  {
    q: 'How do you decide your position size today?',
    options: [
      { label: 'A fixed % of my account with a calculator', score: 0 },
      { label: 'Roughly the same lot size every time', score: 1 },
      { label: 'Bigger when I feel confident', score: 2 },
    ],
  },
  {
    q: 'The market is slow and nothing matches your plan.',
    options: [
      { label: 'No setup, no trade', score: 0 },
      { label: 'Look at other pairs for a setup', score: 1 },
      { label: 'Take something small to stay involved', score: 2 },
    ],
  },
];

export type RiskPersonality = 'guardian' | 'balanced' | 'daredevil';

export const PERSONALITY_COPY: Record<RiskPersonality, { title: string; text: string }> = {
  guardian: { title: 'The Guardian', text: 'You already protect your capital. Your quest: trust your plan enough to let winners run.' },
  balanced: { title: 'The Ranger', text: 'You have good instincts with some gaps. Your quest: turn good habits into automatic rules.' },
  daredevil: { title: 'The Daredevil', text: 'You have courage, and the monsters know it. Your quest: armor first, every single time.' },
};

export function scoreAssessment(answers: number[]): { score: number; personality: RiskPersonality } | null {
  if (answers.length !== ASSESSMENT.length) return null;
  let score = 0;
  for (let i = 0; i < answers.length; i++) {
    const opt = ASSESSMENT[i].options[answers[i]];
    if (!opt) return null;
    score += opt.score;
  }
  const personality: RiskPersonality = score <= 3 ? 'guardian' : score <= 6 ? 'balanced' : 'daredevil';
  return { score, personality };
}
