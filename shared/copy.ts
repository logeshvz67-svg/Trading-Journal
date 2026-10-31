// Outcome messages. Note: the tone depends on PROCESS (plan followed or not); win/loss only
// changes the wording, never the reward. Profit amounts are never celebrated.

export const COPY = {
  welcome: "The market is not a casino. It's a kingdom, and you're about to learn how to rule yourself before you rule your trades.",
  disclaimer: 'Market Quest is a learning and journaling tool. It is not financial advice. Trading involves risk of loss.',
  retreat: 'Disciplined Retreat. Skipping a weak setup is a win for your future self.',
  retreatCapped: 'Retreat logged. (Retreat XP is capped at 3 per day, but the habit still counts.)',
  noArmor: 'Trade logged without an armor check. -30 XP. Next time, enter through the Battle Station.',
};

export function closeMessage(o: { followedPlan: boolean; isLoss: boolean; monsterName?: string | null }): string {
  if (o.followedPlan && o.isLoss) return 'You lost the battle but kept your honor. +30 XP for discipline.';
  if (o.followedPlan) return 'Battle fought by the book. That is the only kind of win that compounds.';
  const m = o.monsterName ? `The ${o.monsterName.replace(/^The /, '')}` : 'A monster';
  if (o.isLoss) return `${m} struck. No XP today, but the lesson is waiting.`;
  return `The coins came, but the oath broke. ${m} got a win today. Lucky wins teach bad habits.`;
}
