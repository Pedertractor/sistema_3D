/**
 * Mensagem de um erro da API. O interceptor de utils/axiosConfig rejeita com `{ message, status }`
 * (já traduzida a partir do corpo `{ error }` do back-end), não com um AxiosError.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}
