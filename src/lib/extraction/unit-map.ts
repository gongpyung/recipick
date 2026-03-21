const UNIT_ALIASES = new Map<string, string>([
  ['g', 'g'],
  ['gram', 'g'],
  ['grams', 'g'],
  ['그램', 'g'],
  ['kg', 'kg'],
  ['kilogram', 'kg'],
  ['킬로', 'kg'],
  ['ml', 'ml'],
  ['밀리리터', 'ml'],
  ['l', 'l'],
  ['리터', 'l'],
  ['tsp', 'tsp'],
  ['teaspoon', 'tsp'],
  ['작은술', 'tsp'],
  ['작은 술', 'tsp'],
  ['티스푼', 'tsp'],
  ['tbsp', 'tbsp'],
  ['tablespoon', 'tbsp'],
  ['큰술', 'tbsp'],
  ['큰 술', 'tbsp'],
  ['숟갈', 'tbsp'],
  ['cup', 'cup'],
  ['cups', 'cup'],
  ['컵', 'cup'],
  ['개', '개'],
  ['ea', '개'],
  ['piece', '개'],
  ['pieces', '개'],
  ['줄기', '줄기'],
  ['stalk', '줄기'],
  ['줌', '줌'],
  ['handful', '줌'],
  ['약간', '약간'],
  ['조금', '약간'],
  ['적당량', '약간'],
  ['pinch', '약간'],
])

export function normalizeUnit(unit: string | null | undefined) {
  if (!unit) {
    return null
  }

  const normalized = unit.trim().toLowerCase()

  if (!normalized) {
    return null
  }

  return UNIT_ALIASES.get(normalized) ?? unit.trim()
}
