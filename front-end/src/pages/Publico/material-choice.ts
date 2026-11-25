import type { PublicFilament } from '@/services/public';
import type { FilamentRigidity } from '@/types/domain';

export interface MaterialChoice {
  rigidity: FilamentRigidity | null;
  colorName: string | null;
}

export const EMPTY_MATERIAL: MaterialChoice = { rigidity: null, colorName: null };

/** Cores distintas (pelo nome) dos filamentos ativos de uma rigidez, em ordem alfabética. */
export function availableColors(filaments: PublicFilament[], rigidity: FilamentRigidity) {
  const byName = new Map<string, { colorName: string; colorHex: string }>();
  for (const filament of filaments) {
    if (filament.rigidity !== rigidity) continue;
    const key = filament.colorName.trim().toLowerCase();
    if (!byName.has(key)) byName.set(key, { colorName: filament.colorName.trim(), colorHex: filament.colorHex });
  }
  return [...byName.values()].sort((a, b) => a.colorName.localeCompare(b.colorName, 'pt-BR'));
}
