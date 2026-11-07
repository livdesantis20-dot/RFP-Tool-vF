// Global stable anonymization: sort all evaluator user IDs and assign #1, #2, ...
// The same person always gets the same "Evaluator #N" label everywhere.
export function buildJudgeAnonMap(allJudgeUserIds: string[]): Map<string, string> {
  const sorted = Array.from(new Set(allJudgeUserIds)).sort();
  return new Map(sorted.map((id, idx) => [id, `Evaluator #${idx + 1}`]));
}
