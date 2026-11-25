import { useState } from 'react';
import {
  addMonths,
  addYears,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  setMonth,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { periodLabel, periodOf, shiftPeriod, WEEK_OPTIONS, type Period, type PeriodMode } from './period';

const MODES: { value: PeriodMode; label: string }[] = [
  { value: 'day', label: 'Dia' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mês' },
];

const WEEKDAYS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

/** Grade de dias de um mês; no modo semana a linha inteira é destacada. */
function DayGrid({ period, onPick }: { period: Period; onPick: (date: Date) => void }) {
  const [view, setView] = useState(() => startOfMonth(period.from));
  const [hoverWeek, setHoverWeek] = useState<Date | null>(null);
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(view), WEEK_OPTIONS),
    end: endOfWeek(endOfMonth(view), WEEK_OPTIONS),
  });

  const inSelection = (d: Date) => d >= period.from && d < period.to;
  const inHoverWeek = (d: Date) =>
    period.mode === 'week' && hoverWeek != null && isSameDay(startOfWeek(d, WEEK_OPTIONS), hoverWeek);

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex items-center justify-between'>
        <Button variant='ghost' size='icon-sm' onClick={() => setView(addMonths(view, -1))} aria-label='Mês anterior'>
          <ChevronLeft />
        </Button>
        <span className='text-sm font-semibold capitalize'>{format(view, 'MMMM yyyy', { locale: ptBR })}</span>
        <Button variant='ghost' size='icon-sm' onClick={() => setView(addMonths(view, 1))} aria-label='Próximo mês'>
          <ChevronRight />
        </Button>
      </div>
      <div className='grid grid-cols-7 gap-y-1 text-center' onMouseLeave={() => setHoverWeek(null)}>
        {WEEKDAYS.map((d, i) => (
          <span key={i} className='py-1 text-[11px] font-medium text-muted-foreground'>
            {d}
          </span>
        ))}
        {days.map((d) => {
          const selected = inSelection(d);
          return (
            <button
              key={d.toISOString()}
              type='button'
              onClick={() => onPick(d)}
              onMouseEnter={() => setHoverWeek(startOfWeek(d, WEEK_OPTIONS))}
              className={cn(
                'mx-auto flex size-8 items-center justify-center rounded-lg text-sm tabular-nums transition-colors',
                !isSameMonth(d, view) && 'text-muted-foreground/50',
                isToday(d) && !selected && 'font-bold underline underline-offset-4',
                selected ? 'bg-primary text-primary-foreground' : inHoverWeek(d) ? 'bg-muted' : 'hover:bg-muted',
              )}
            >
              {format(d, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Grade de meses de um ano. */
function MonthGrid({ period, onPick }: { period: Period; onPick: (date: Date) => void }) {
  const [year, setYear] = useState(() => startOfYear(period.from));
  return (
    <div className='flex flex-col gap-2'>
      <div className='flex items-center justify-between'>
        <Button variant='ghost' size='icon-sm' onClick={() => setYear(addYears(year, -1))} aria-label='Ano anterior'>
          <ChevronLeft />
        </Button>
        <span className='text-sm font-semibold'>{format(year, 'yyyy')}</span>
        <Button variant='ghost' size='icon-sm' onClick={() => setYear(addYears(year, 1))} aria-label='Próximo ano'>
          <ChevronRight />
        </Button>
      </div>
      <div className='grid grid-cols-3 gap-1.5'>
        {Array.from({ length: 12 }, (_, m) => {
          const month = setMonth(year, m);
          const selected = isSameMonth(month, period.from);
          return (
            <button
              key={m}
              type='button'
              onClick={() => onPick(month)}
              className={cn(
                'rounded-lg py-2 text-sm capitalize transition-colors',
                selected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                isSameMonth(month, new Date()) && !selected && 'font-bold',
              )}
            >
              {format(month, 'MMM', { locale: ptBR }).replace('.', '')}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function PeriodPicker({ period, onChange }: { period: Period; onChange: (period: Period) => void }) {
  const [open, setOpen] = useState(false);
  const isCurrent = period.from <= new Date() && new Date() < period.to;

  return (
    <div className='flex flex-wrap items-center gap-2'>
      <div role='radiogroup' aria-label='Agrupar por' className='inline-flex rounded-full bg-muted p-1'>
        {MODES.map((m) => (
          <button
            key={m.value}
            type='button'
            role='radio'
            aria-checked={period.mode === m.value}
            onClick={() => onChange(periodOf(m.value, period.mode === m.value ? period.from : clampToToday(period)))}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              period.mode === m.value ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className='flex items-center gap-1'>
        <Button variant='outline' size='icon' className='rounded-full' onClick={() => onChange(shiftPeriod(period, -1))} aria-label='Período anterior'>
          <ChevronLeft />
        </Button>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant='outline' className='min-w-0 rounded-full'>
              <CalendarDays />
              <span className='truncate first-letter:uppercase'>{periodLabel(period)}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align='start' className='w-72 rounded-2xl p-3'>
            {period.mode === 'month' ? (
              <MonthGrid
                period={period}
                onPick={(d) => {
                  onChange(periodOf('month', d));
                  setOpen(false);
                }}
              />
            ) : (
              <DayGrid
                period={period}
                onPick={(d) => {
                  onChange(periodOf(period.mode, d));
                  setOpen(false);
                }}
              />
            )}
          </PopoverContent>
        </Popover>
        <Button variant='outline' size='icon' className='rounded-full' onClick={() => onChange(shiftPeriod(period, 1))} aria-label='Próximo período'>
          <ChevronRight />
        </Button>
      </div>

      {!isCurrent && (
        <Button variant='ghost' className='rounded-full' onClick={() => onChange(periodOf(period.mode, new Date()))}>
          Hoje
        </Button>
      )}
    </div>
  );
}

/** Ao trocar o agrupamento, mantém "hoje" se ele estiver no período atual; senão, o início do período. */
function clampToToday(period: Period): Date {
  const now = new Date();
  return now >= period.from && now < period.to ? now : period.from;
}
