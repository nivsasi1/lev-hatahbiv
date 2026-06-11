import { ArtKind } from "../data/catalog";

// Flat, hand-drawn-ish product illustrations. Every drawing lives in a
// 200x200 viewBox and is tinted by the product's artColor.

const INK = "#2b2440";
const PAPER = "#fffdf7";
const METAL = "#c9cedb";

// mix a hex color toward black (amt<0) or white (amt>0)
const shade = (hex: string, amt: number) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) =>
    Math.round(amt > 0 ? v + (255 - v) * amt : v * (1 + amt));
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

const Tube = ({ c }: { c: string }) => (
  <g>
    <ellipse cx="100" cy="178" rx="52" ry="8" fill={INK} opacity="0.08" />
    <path
      d={`M62 150 C 70 165, 90 172, 108 166 C 124 161, 132 148, 122 142 C 110 135, 92 144, 80 146 Z`}
      fill={c}
    />
    <rect x="78" y="22" width="44" height="14" rx="4" fill={INK} />
    <rect x="84" y="36" width="32" height="8" fill={shade(c, -0.25)} />
    <path d="M72 44 H128 L122 138 C121 146 79 146 78 138 Z" fill={shade(c, 0.75)} />
    <rect x="76" y="62" width="48" height="44" rx="6" fill={PAPER} stroke={INK} stroke-width="2.5" />
    <circle cx="100" cy="84" r="13" fill={c} />
    <path d="M80 124 H120 M84 132 H116" stroke={INK} stroke-width="2.5" stroke-linecap="round" opacity="0.45" />
  </g>
);

const Watercolor = ({ c }: { c: string }) => {
  const colors = [c, "#e2574c", "#e09f3e", "#6a994e", "#3f5fbf", "#7b3fbf"];
  return (
    <g>
      <ellipse cx="100" cy="180" rx="62" ry="8" fill={INK} opacity="0.08" />
      <rect x="36" y="42" width="128" height="52" rx="8" fill={shade(c, 0.55)} stroke={INK} stroke-width="2.5" />
      <rect x="36" y="100" width="128" height="62" rx="8" fill={PAPER} stroke={INK} stroke-width="2.5" />
      {colors.map((col, i) => (
        <rect
          x={46 + (i % 3) * 38}
          y={108 + Math.floor(i / 3) * 26}
          width="32"
          height="20"
          rx="5"
          fill={col}
        />
      ))}
      <path d="M52 68 q 14 -12 28 0 q 14 12 28 0 q 14 -12 28 0" stroke={shade(c, -0.2)} stroke-width="4" fill="none" stroke-linecap="round" />
      <g transform="rotate(-30 160 60)">
        <rect x="156" y="14" width="8" height="52" rx="4" fill={INK} />
        <path d="M156 66 h8 l-1 14 q-3 8 -6 0 Z" fill={c} />
      </g>
    </g>
  );
};

const Gouache = ({ c }: { c: string }) => (
  <g>
    <ellipse cx="100" cy="180" rx="64" ry="8" fill={INK} opacity="0.08" />
    {[
      { x: 28, col: c },
      { x: 76, col: shade(c, 0.35) },
      { x: 124, col: shade(c, -0.25) },
    ].map(({ x, col }) => (
      <g>
        <rect x={x} y="92" width="46" height="74" rx="10" fill={PAPER} stroke={INK} stroke-width="2.5" />
        <rect x={x} y="118" width="46" height="30" fill={col} />
        <rect x={x - 2} y="78" width="50" height="18" rx="6" fill={INK} />
        <path d={`M${x + 10} 130 a 12 8 0 0 1 24 0`} fill={shade(col, 0.4)} opacity="0.8" />
      </g>
    ))}
  </g>
);

const Spray = ({ c }: { c: string }) => (
  <g>
    <ellipse cx="86" cy="182" rx="44" ry="8" fill={INK} opacity="0.08" />
    <rect x="56" y="64" width="60" height="116" rx="12" fill={c} />
    <rect x="56" y="92" width="60" height="44" fill={PAPER} stroke={INK} stroke-width="2.5" />
    <circle cx="86" cy="114" r="12" fill={c} />
    <path d="M60 54 q 26 -14 52 0 l-4 12 q-22 -10 -44 0 Z" fill={METAL} stroke={INK} stroke-width="2" />
    <rect x="76" y="26" width="20" height="22" rx="5" fill={INK} />
    {[
      [136, 34, 4],
      [152, 48, 6],
      [166, 30, 5],
      [158, 70, 4],
      [142, 60, 3],
      [172, 54, 3.5],
    ].map(([x, y, r]) => (
      <circle cx={x} cy={y} r={r} fill={shade(c, 0.2)} />
    ))}
  </g>
);

const Pencil = ({ c }: { c: string }) => {
  const one = (col: string) => (
    <g>
      <rect x="40" y="-9" width="118" height="18" rx="4" fill={col} />
      <path d="M40 -9 L12 0 L40 9 Z" fill="#e8c39a" />
      <path d="M12 0 L24 -5 L24 5 Z" fill={INK} />
      <rect x="158" y="-9" width="14" height="18" fill={METAL} />
      <rect x="172" y="-8" width="14" height="16" rx="6" fill="#e98fa5" />
    </g>
  );
  return (
    <g>
      <ellipse cx="100" cy="182" rx="70" ry="8" fill={INK} opacity="0.08" />
      <g transform="translate(0 60) rotate(8 100 0)">{one(shade(c, 0.3))}</g>
      <g transform="translate(0 100) rotate(8 100 0)">{one(c)}</g>
      <g transform="translate(0 140) rotate(8 100 0)">{one(shade(c, -0.3))}</g>
    </g>
  );
};

const Charcoal = ({ c }: { c: string }) => (
  <g>
    <ellipse cx="100" cy="178" rx="64" ry="8" fill={INK} opacity="0.08" />
    <path d="M40 150 q 40 -16 120 -22" stroke={shade(c, 0.4)} stroke-width="14" stroke-linecap="round" fill="none" opacity="0.5" />
    {[-14, 8, 30].map((dy, i) => (
      <g transform={`rotate(${-18 + i * 6} 100 ${96 + dy})`}>
        <rect x="46" y={88 + dy} width="108" height="15" rx="7" fill={shade(c, i * 0.18)} />
        <rect x="46" y={88 + dy} width="14" height="15" rx="7" fill={shade(c, -0.4)} />
      </g>
    ))}
  </g>
);

const Marker = ({ c }: { c: string }) => {
  const one = (col: string) => (
    <g>
      <rect x="30" y="-11" width="96" height="22" rx="8" fill={PAPER} stroke={INK} stroke-width="2.5" />
      <rect x="118" y="-11" width="44" height="22" rx="8" fill={col} />
      <path d="M30 -6 L12 -2 L12 2 L30 6 Z" fill={col} />
      <rect x="40" y="-6" width="56" height="12" rx="5" fill={col} opacity="0.85" />
    </g>
  );
  return (
    <g>
      <ellipse cx="100" cy="182" rx="70" ry="8" fill={INK} opacity="0.08" />
      <g transform="translate(8 64) rotate(-6 100 0)">{one(shade(c, 0.25))}</g>
      <g transform="translate(8 104) rotate(-6 100 0)">{one(c)}</g>
      <g transform="translate(8 144) rotate(-6 100 0)">{one(shade(c, -0.3))}</g>
    </g>
  );
};

const Brush = ({ c }: { c: string }) => (
  <g>
    <ellipse cx="100" cy="182" rx="56" ry="8" fill={INK} opacity="0.08" />
    <g transform="rotate(35 100 100)">
      <rect x="92" y="6" width="16" height="98" rx="8" fill={c} />
      <rect x="90" y="100" width="20" height="26" rx="4" fill={METAL} stroke={INK} stroke-width="2" />
      <path d="M92 126 h16 q4 22 -8 40 q-12 -18 -8 -40 Z" fill={INK} />
    </g>
    <path d="M48 152 q 20 14 44 8" stroke={c} stroke-width="10" stroke-linecap="round" fill="none" opacity="0.6" />
  </g>
);

const Paper = ({ c }: { c: string }) => (
  <g>
    <ellipse cx="100" cy="182" rx="62" ry="8" fill={INK} opacity="0.08" />
    <rect x="42" y="48" width="116" height="128" rx="6" transform="rotate(-5 100 112)" fill={shade(c, 0.7)} />
    <rect x="42" y="44" width="116" height="128" rx="6" transform="rotate(3 100 108)" fill={shade(c, 0.85)} />
    <rect x="42" y="40" width="116" height="128" rx="6" fill={PAPER} stroke={INK} stroke-width="2.5" />
    <path d="M58 70 q 20 -14 42 0 q 22 14 42 0" stroke={c} stroke-width="6" fill="none" stroke-linecap="round" />
    <path d="M58 100 H142 M58 120 H142 M58 140 H120" stroke={INK} stroke-width="2.5" stroke-linecap="round" opacity="0.35" />
  </g>
);

const Sketchbook = ({ c }: { c: string }) => (
  <g>
    <ellipse cx="100" cy="182" rx="62" ry="8" fill={INK} opacity="0.08" />
    <rect x="40" y="36" width="120" height="140" rx="10" fill={c} />
    <rect x="40" y="36" width="14" height="140" rx="6" fill={shade(c, -0.35)} />
    <rect x="126" y="36" width="10" height="140" fill={INK} opacity="0.85" />
    <circle cx="96" cy="96" r="26" fill="none" stroke={shade(c, 0.7)} stroke-width="5" />
    <path d="M82 112 q 14 14 30 -2" stroke={shade(c, 0.7)} stroke-width="5" fill="none" stroke-linecap="round" />
  </g>
);

const Canvas = ({ c }: { c: string }) => (
  <g>
    <ellipse cx="100" cy="182" rx="62" ry="8" fill={INK} opacity="0.08" />
    <rect x="40" y="40" width="120" height="132" rx="4" transform="rotate(-4 100 106)" fill={PAPER} stroke={INK} stroke-width="3" />
    <g transform="rotate(-4 100 106)">
      <path d="M62 130 q 18 -44 38 -16 q 16 22 38 -28" stroke={c} stroke-width="8" fill="none" stroke-linecap="round" />
      <circle cx="128" cy="70" r="10" fill={shade(c, 0.4)} />
    </g>
  </g>
);

const Easel = ({ c }: { c: string }) => (
  <g>
    <ellipse cx="100" cy="184" rx="72" ry="8" fill={INK} opacity="0.08" />
    <path d="M96 22 L52 180" stroke={c} stroke-width="9" stroke-linecap="round" />
    <path d="M104 22 L148 180" stroke={c} stroke-width="9" stroke-linecap="round" />
    <path d="M100 60 V178" stroke={shade(c, -0.3)} stroke-width="8" stroke-linecap="round" />
    <rect x="58" y="112" width="84" height="10" rx="4" fill={shade(c, -0.2)} />
    <rect x="64" y="48" width="72" height="66" rx="3" fill={PAPER} stroke={INK} stroke-width="2.5" />
    <path d="M76 96 q 12 -28 24 -10 q 10 14 24 -18" stroke="#e2574c" stroke-width="5" fill="none" stroke-linecap="round" />
    <circle cx="100" cy="22" r="8" fill={INK} />
  </g>
);

const Yarn = ({ c }: { c: string }) => (
  <g>
    <ellipse cx="96" cy="178" rx="58" ry="8" fill={INK} opacity="0.08" />
    <circle cx="96" cy="110" r="58" fill={c} />
    <path d="M44 86 q 52 -22 104 4 M40 116 q 56 -22 112 0 M48 142 q 48 -20 96 2"
      stroke={shade(c, -0.3)} stroke-width="5" fill="none" stroke-linecap="round" />
    <path d="M148 132 q 28 10 36 38" stroke={c} stroke-width="6" fill="none" stroke-linecap="round" />
  </g>
);

const Macrame = ({ c }: { c: string }) => (
  <g>
    <rect x="30" y="34" width="140" height="8" rx="4" fill="#8d5a3b" />
    <path d="M60 42 q -8 30 0 56 M84 42 q -6 30 0 56 M108 42 q 6 30 0 56 M132 42 q 8 30 0 56"
      stroke={shade(c, 0.15)} stroke-width="7" fill="none" stroke-linecap="round" />
    <path d="M60 64 Q 96 92 132 64 M60 86 Q 96 114 132 86" stroke={c} stroke-width="7" fill="none" stroke-linecap="round" />
    {[60, 84, 108, 132].map((x, i) => (
      <path d={`M${x} 98 q ${i % 2 ? 4 : -4} 34 0 64`} stroke={shade(c, 0.3)} stroke-width="6" fill="none" stroke-linecap="round" />
    ))}
  </g>
);

const Clay = ({ c }: { c: string }) => (
  <g>
    <ellipse cx="100" cy="178" rx="64" ry="8" fill={INK} opacity="0.08" />
    <rect x="38" y="128" width="44" height="42" rx="8" fill={c} />
    <rect x="86" y="128" width="44" height="42" rx="8" fill={shade(c, 0.35)} />
    <rect x="134" y="128" width="44" height="42" rx="8" fill={shade(c, -0.25)} />
    <path d="M70 120 a 34 30 0 1 1 64 -6 q 18 -4 18 12 q 0 14 -16 12 l -70 0 q -16 -2 -14 -16 q 2 -12 18 -2 Z"
      fill={shade(c, 0.55)} stroke={INK} stroke-width="2.5" transform="translate(0 -36)" />
    <circle cx="112" cy="62" r="4" fill={INK} />
  </g>
);

const Glue = ({ c }: { c: string }) => (
  <g>
    <ellipse cx="100" cy="182" rx="48" ry="8" fill={INK} opacity="0.08" />
    <path d="M96 24 h8 l4 18 h-16 Z" fill={shade(c, -0.3)} />
    <rect x="86" y="40" width="28" height="16" rx="5" fill={INK} />
    <path d="M70 64 h60 l6 24 v76 a 12 12 0 0 1 -12 12 h-48 a 12 12 0 0 1 -12 -12 v-76 Z" fill={c} />
    <rect x="74" y="98" width="52" height="48" rx="8" fill={PAPER} stroke={INK} stroke-width="2.5" />
    <path d="M86 122 q 14 -16 28 0 q -14 16 -28 0 Z" fill={c} />
    <path d="M120 28 q 14 6 10 20" stroke={shade(c, 0.4)} stroke-width="5" fill="none" stroke-linecap="round" />
  </g>
);

const Beads = ({ c }: { c: string }) => {
  const cols = [c, "#e09f3e", shade(c, 0.4), "#e2574c", shade(c, -0.25), "#2a9d8f", c];
  return (
    <g>
      <path d="M28 130 Q 100 64 172 130" stroke={INK} stroke-width="3" fill="none" opacity="0.5" />
      {cols.map((col, i) => {
        const t = i / (cols.length - 1);
        const x = 28 + t * 144;
        const y = 130 - Math.sin(t * Math.PI) * 64 * 0.92;
        return <circle cx={x} cy={y} r={13} fill={col} stroke={INK} stroke-width="2" />;
      })}
      {[
        [52, 162, 9],
        [84, 170, 7],
        [120, 166, 10],
        [152, 160, 7],
      ].map(([x, y, r], i) => (
        <circle cx={x} cy={y} r={r} fill={cols[(i * 2 + 1) % cols.length]} stroke={INK} stroke-width="2" />
      ))}
    </g>
  );
};

const Pendant = ({ c }: { c: string }) => (
  <g>
    <path d="M40 28 Q 100 92 160 28" stroke={c} stroke-width="5" fill="none" stroke-linecap="round" stroke-dasharray="1 9" />
    <circle cx="100" cy="74" r="7" fill="none" stroke={c} stroke-width="4" />
    <path
      d="M100 168 C 76 146 58 128 58 108 a 22 22 0 0 1 42 -9 a 22 22 0 0 1 42 9 c 0 20 -18 38 -42 60 Z"
      fill={c}
      stroke={INK}
      stroke-width="2.5"
    />
    <path d="M74 104 a 26 26 0 0 1 14 -16" stroke={shade(c, 0.5)} stroke-width="5" fill="none" stroke-linecap="round" />
  </g>
);

const drawings: Record<ArtKind, (p: { c: string }) => any> = {
  tube: Tube,
  watercolor: Watercolor,
  gouache: Gouache,
  spray: Spray,
  pencil: Pencil,
  charcoal: Charcoal,
  marker: Marker,
  brush: Brush,
  paper: Paper,
  sketchbook: Sketchbook,
  canvas: Canvas,
  easel: Easel,
  yarn: Yarn,
  macrame: Macrame,
  clay: Clay,
  glue: Glue,
  beads: Beads,
  pendant: Pendant,
};

export const ProductArt = ({
  kind,
  color,
}: {
  kind: ArtKind;
  color?: string;
}) => {
  const Drawing = drawings[kind] ?? Tube;
  return (
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <Drawing c={color ?? "#e2574c"} />
    </svg>
  );
};
