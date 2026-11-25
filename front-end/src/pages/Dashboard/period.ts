import {
  addDays,
  addHours,
  addMonths,
  addWeeks,
  endOfWeek,
  format,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type PeriodMode = 'day' | 'week' | 'month';

export const WEEK_OPTIONS = { weekStartsOn: 1 } as const;

export interface Period {
  mode: PeriodMode;
  from: Date;
  /** Exclusivo. */
  to: Date;
}

export function periodOf(mode: PeriodMode, date: Date): Period {
  if (mode === 'day') {
    const from = startOfDay(date);
    return { mode, from, to: addDays(from, 1) };
  }
  if (mode === 'week') {
    const from = startOfWeek(date, WEEK_OPTIONS);
    return { mode, from, to: addWeeks(from, 1) };
  }
  const from = startOfMonth(date);
  return { mode, from, to: addMonths(from, 1) };
}

export function shiftPeriod(period: Period, step: number): Period {
  const { mode, from } = period;
  if (mode === 'day') return periodOf(mode, addDays(from, step));
  if (mode === 'week') return periodOf(mode, addWeeks(from, step));
  return periodOf(mode, addMonths(from, step));
}

export function periodLabel({ mode, from }: Period): string {
  if (mode === 'day') return format(from, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  if (mode === 'month') return format(from, "MMMM 'de' yyyy", { locale: ptBR });
  const end = endOfWeek(from, WEEK_OPTIONS);
  return isSameMonth(from, end)
    ? `${format(from, 'dd')} a ${format(end, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`
    : `${format(from, "dd 'de' MMM", { locale: ptBR })} a ${format(end, "dd 'de' MMM 'de' yyyy", { locale: ptBR })}`;
}

export interface Bucket {
  start: Date;
  end: Date;
  /** Rótulo curto do eixo. */
  label: string;
  /** Rótulo completo do tooltip. */
  title: string;
}

/** Dia → 24 horas; semana e mês → dias. */
export function bucketsOf({ mode, from, to }: Period): Bucket[] {
  const buckets: Bucket[] = [];
  if (mode === 'day') {
    for (let h = 0; h < 24; h++) {
      const start = addHours(from, h);
      buckets.push({ start, end: addHours(start, 1), label: format(start, 'HH'), title: `${format(start, 'HH:mm')} – ${format(addHours(start, 1), 'HH:mm')}` });
    }
    return buckets;
  }
  for (let d = from; d < to; d = addDays(d, 1)) {
    buckets.push({
      start: d,
      end: addDays(d, 1),
      label: mode === 'week' ? format(d, 'EEEEEE dd', { locale: ptBR }) : format(d, 'dd'),
      title: format(d, "EEEE, dd/MM", { locale: ptBR }),
    });
  }
  return buckets;
}

/** Minutos de sobreposição entre [aStart, aEnd) e [bStart, bEnd). */
export function overlapMinutes(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart)) / 60_000;
}

export function formatHours(minutes: number): string {
  const hours = minutes / 60;
  return `${hours.toLocaleString('pt-BR', { maximumFractionDigits: hours < 10 ? 1 : 0 })} h`;
}
