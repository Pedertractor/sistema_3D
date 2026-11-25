import { cn } from '@/lib/utils';

const FRAME = '#2b2f36';
const METAL = '#4a515c';

/** Impressora de pórtico (estilo A1). Origem = canto inferior esquerdo da base. */
function GantryPrinter({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x='0' y='-30' width='230' height='30' rx='6' fill={FRAME} />
      <rect x='12' y='-22' width='60' height='5' rx='2.5' fill='#4b5563' />
      <rect x='18' y='-190' width='14' height='162' rx='3' fill={METAL} />
      <rect x='198' y='-190' width='14' height='162' rx='3' fill={METAL} />
      <rect x='12' y='-200' width='206' height='14' rx='4' fill={FRAME} />
      <rect x='34' y='-44' width='162' height='8' rx='2' fill='#3d434c' />
      <rect x='38' y='-50' width='154' height='7' rx='2' fill='#c7a26d' />
      <path d='M104 -50 C102 -66 114 -72 112 -84 h20 c-2 12 10 18 8 34 z' fill='#f97316' />
      <rect x='32' y='-120' width='166' height='9' rx='3' fill='#5b636f' />
      <rect x='98' y='-138' width='38' height='40' rx='6' fill='#f5f6f8' stroke={FRAME} strokeWidth='2.5' />
      <rect x='105' y='-130' width='24' height='4' rx='2' fill='#22c55e' />
      <path d='M112 -98 h10 l-5 8 z' fill='#c08a2c' />
    </g>
  );
}

/** Impressora de braço único (estilo A1 mini). */
function CantileverPrinter({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x='0' y='-28' width='170' height='28' rx='6' fill={FRAME} />
      <rect x='14' y='-170' width='14' height='144' rx='3' fill={METAL} />
      <rect x='10' y='-178' width='22' height='12' rx='4' fill={FRAME} />
      <rect x='52' y='-40' width='108' height='8' rx='2' fill='#3d434c' />
      <rect x='56' y='-46' width='100' height='7' rx='2' fill='#c7a26d' />
      <rect x='92' y='-70' width='26' height='24' rx='3' fill='#3b82f6' />
      <rect x='28' y='-110' width='124' height='9' rx='3' fill='#5b636f' />
      <rect x='86' y='-128' width='36' height='38' rx='6' fill='#f5f6f8' stroke={FRAME} strokeWidth='2.5' />
      <rect x='93' y='-121' width='22' height='4' rx='2' fill='#22c55e' />
    </g>
  );
}

/** Impressora fechada com tampa laranja translúcida (o destaque quente da referência). */
function EnclosedPrinter({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x='0' y='-210' width='210' height='210' rx='14' fill='#3a3f47' />
      <rect x='0' y='-210' width='210' height='16' rx='8' fill='#2b2f36' />
      <rect x='16' y='-186' width='178' height='140' rx='8' fill='url(#tinted)' />
      <rect x='16' y='-186' width='178' height='140' rx='8' fill='none' stroke='#000' strokeOpacity='.25' strokeWidth='2' />
      <rect x='40' y='-96' width='130' height='8' rx='2' fill='#7c2d12' opacity='.55' />
      <rect x='86' y='-150' width='38' height='38' rx='5' fill='#7c2d12' opacity='.45' />
      <rect x='16' y='-36' width='60' height='22' rx='4' fill='#111827' />
      <rect x='22' y='-30' width='34' height='4' rx='2' fill='#60a5fa' />
      <circle cx='184' cy='-25' r='5' fill='#22c55e' />
    </g>
  );
}

function Spool({ cx, cy, r, color }: { cx: number; cy: number; r: number; color: string }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={FRAME} />
      <circle cx={cx} cy={cy} r={r * 0.9} fill={color} />
      <circle cx={cx} cy={cy} r={r * 0.62} fill='none' stroke='#000' strokeOpacity='.12' strokeWidth='2' />
      <circle cx={cx} cy={cy} r={r * 0.42} fill='#e5e7eb' />
      <circle cx={cx} cy={cy} r={r * 0.15} fill={FRAME} />
    </g>
  );
}

/**
 * Cena de estúdio: parede clara com luz de janela, piso de concreto, gaveteiro,
 * bancada com impressoras e bobinas. Ilustração própria, no espírito da referência.
 */
export function StudioScene({
  className,
  fit = 'cover',
}: {
  className?: string;
  /** cover: preenche (corta as bordas); contain: cena inteira apoiada no rodapé. */
  fit?: 'cover' | 'contain';
}) {
  return (
    <svg
      viewBox={fit === 'cover' ? '-300 0 1800 520' : '40 120 1120 400'}
      preserveAspectRatio={fit === 'cover' ? 'xMidYMax slice' : 'xMidYMax meet'}
      role='img'
      aria-label='Bancada com impressoras 3D e bobinas de filamento'
      className={cn('block size-full', className)}
    >
      <defs>
        <linearGradient id='wall' x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0' stopColor='#f6f6f7' />
          <stop offset='1' stopColor='#e4e5e8' />
        </linearGradient>
        <linearGradient id='floor' x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0' stopColor='#b9babe' />
          <stop offset='1' stopColor='#9fa1a6' />
        </linearGradient>
        <linearGradient id='tinted' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0' stopColor='#fb923c' stopOpacity='.95' />
          <stop offset='1' stopColor='#c2410c' stopOpacity='.9' />
        </linearGradient>
        <filter id='soft' x='-20%' y='-20%' width='140%' height='140%'>
          <feGaussianBlur stdDeviation='14' />
        </filter>
      </defs>

      {/* parede + luz da janela */}
      <rect x='-300' width='1800' height='430' fill='url(#wall)' />
      <g opacity='.55' filter='url(#soft)' fill='#ffffff'>
        <path d='M90 40 h120 l-60 300 h-120 z' />
        <path d='M240 40 h120 l-60 300 h-120 z' />
        <path d='M390 40 h120 l-60 300 h-120 z' />
      </g>
      {/* porta à direita */}
      <rect x='1080' y='150' width='110' height='280' fill='#eceef1' stroke='#d5d8dd' strokeWidth='4' />
      <circle cx='1095' cy='300' r='5' fill='#a1a5ab' />

      {/* piso */}
      <rect x='-300' y='430' width='1800' height='90' fill='url(#floor)' />
      <rect x='-300' y='428' width='1800' height='4' fill='#d9dade' />

      {/* gaveteiro */}
      <g>
        <rect x='70' y='300' width='150' height='130' rx='4' fill='#3a3f47' />
        {[318, 344, 370, 396].map((y) => (
          <g key={y}>
            <rect x='78' y={y} width='134' height='20' rx='2' fill='#454b54' />
            <rect x='125' y={y + 8} width='40' height='3' rx='1.5' fill='#8b919a' />
          </g>
        ))}
        <rect x='95' y='262' width='80' height='38' rx='8' fill='#1f2937' />
        <rect x='95' y='262' width='80' height='8' rx='4' fill='#3b82f6' />
      </g>

      {/* bancada */}
      <g>
        <rect x='300' y='345' width='800' height='14' rx='3' fill='#c9a57a' />
        <rect x='300' y='357' width='800' height='4' fill='#a8865d' />
        <rect x='320' y='361' width='12' height='69' fill={FRAME} />
        <rect x='1068' y='361' width='12' height='69' fill={FRAME} />
        <rect x='332' y='400' width='736' height='6' fill='#3a3f47' />
        <Spool cx={400} cy={385} r={15} color='#111827' />
        <Spool cx={436} cy={385} r={15} color='#f4f4f0' />
        <Spool cx={472} cy={385} r={15} color='#2563eb' />
        <Spool cx={508} cy={385} r={15} color='#dc2626' />
        <rect x='900' y='378' width='70' height='22' rx='4' fill='#4b5563' />
      </g>

      {/* impressoras */}
      <GantryPrinter x={330} y={345} s={0.95} />
      <CantileverPrinter x={580} y={345} s={0.95} />
      <EnclosedPrinter x={790} y={345} s={1} />
      <Spool cx={1040} cy={318} r={26} color='#10b981' />
    </svg>
  );
}
