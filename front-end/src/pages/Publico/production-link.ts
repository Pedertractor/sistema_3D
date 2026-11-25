import type { PartLookup } from '@/services/public';

/** Prototipagem: o protótipo vai virar item de produção? Se sim, de qual partnumber. */
export interface ProductionLink {
  forProduction: boolean | null;
  partNumberInput: string;
  /** Resultado da verificação na base da Pedertractor (null = ainda não verificado). */
  lookup: PartLookup | null;
}

export const EMPTY_PRODUCTION_LINK: ProductionLink = { forProduction: null, partNumberInput: '', lookup: null };

/** Pronto para enviar: respondeu "não", ou respondeu "sim" e o partnumber foi encontrado. */
export function isProductionLinkReady(link: ProductionLink) {
  return link.forProduction === false || (link.forProduction === true && link.lookup !== null);
}
