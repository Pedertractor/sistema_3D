import type { Requester, RequesterIdentity } from '@/services/public';
import type { Unit } from '@/types/auth';

export interface RequesterState {
  cardNumber: string;
  unit: Unit;
  email: string;
  /** Preenchido quando o cartão foi encontrado na API corporativa. */
  identity: RequesterIdentity | null;
}

export const EMPTY_REQUESTER: RequesterState = { cardNumber: '', unit: 'PEDERTRACTOR', email: '', identity: null };

/** Dados enviados ao criar a solicitação (o servidor confere o cartão de novo). */
export function toRequester(state: RequesterState): Requester {
  return {
    requesterCardNumber: state.identity!.cardNumber,
    requesterUnit: state.identity!.unit,
    requesterEmail: state.email.trim() || null,
  };
}
