/** Nhóm một danh sách theo mùa giải (tournament) - giữ thứ tự xuất hiện đầu tiên của mỗi nhóm. */
export interface TournamentGroup<T> {
  tournamentId: string;
  tournamentName: string;
  items: T[];
}

export function groupByTournament<T extends { tournamentId: string; tournamentName: string }>(
  items: T[],
): TournamentGroup<T>[] {
  const groups = new Map<string, TournamentGroup<T>>();
  for (const item of items) {
    const key = item.tournamentId || 'unknown';
    let group = groups.get(key);
    if (!group) {
      group = { tournamentId: item.tournamentId, tournamentName: item.tournamentName || 'Chưa rõ mùa giải', items: [] };
      groups.set(key, group);
    }
    group.items.push(item);
  }
  return [...groups.values()];
}
