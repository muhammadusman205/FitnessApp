/**
 * Map program exercise IDs to full exercise objects from the loaded API pool.
 */
export const resolveExercisesByIds = (ids, exercisePool) => {
  if (!Array.isArray(ids) || !Array.isArray(exercisePool)) return [];
  const map = new Map(exercisePool.map((e) => [String(e.id), e]));
  return ids.map((id) => map.get(String(id))).filter(Boolean);
};
