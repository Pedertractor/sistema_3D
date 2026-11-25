import { format, formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const intFormatter = new Intl.NumberFormat('pt-BR');

export function formatGrams(grams: number | null | undefined): string {
  if (grams == null) return '—';
  if (Math.abs(grams) >= 1000) {
    return `${(grams / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`;
  }
  return `${intFormatter.format(grams)} g`;
}

export function formatMinutes(minutes: number | null | undefined): string {
  if (minutes == null) return '—';
  const total = Math.round(minutes);
  if (total < 60) return `${total} min`;
  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const mins = total % 60;
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (mins && !days) parts.push(`${mins}min`);
  return parts.join(' ');
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  return format(new Date(value), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

export function formatRelative(value: string | null | undefined): string {
  if (!value) return '—';
  return formatDistanceToNowStrict(new Date(value), { locale: ptBR, addSuffix: true });
}

export function formatNumber(value: number): string {
  return intFormatter.format(value);
}
