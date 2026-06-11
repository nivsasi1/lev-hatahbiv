// decorative paint splats + blobs

export const Splat = ({
  color,
  size = 120,
  style,
  className,
}: {
  color: string;
  size?: number;
  style?: any;
  className?: string;
}) => (
  <svg
    className={`splat ${className ?? ""}`}
    style={style}
    width={size}
    height={size}
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M50 14 C 64 10, 82 18, 84 34 C 86 46, 78 50, 82 60 C 86 72, 76 84, 62 84 C 52 84, 50 76, 40 80 C 28 85, 14 76, 14 62 C 14 52, 22 48, 18 38 C 14 24, 28 12, 40 16 C 44 17, 46 15, 50 14 Z"
      fill={color}
    />
    <circle cx="88" cy="22" r="5" fill={color} />
    <circle cx="14" cy="80" r="4" fill={color} />
    <circle cx="80" cy="88" r="3" fill={color} />
  </svg>
);

export const Blob = ({ color }: { color: string }) => (
  <svg
    className="blob"
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M52 8 C 72 4, 92 20, 90 42 C 88 60, 74 64, 76 78 C 78 92, 60 98, 46 92 C 34 87, 36 78, 24 76 C 10 74, 2 58, 10 44 C 16 33, 28 34, 30 24 C 32 13, 42 10, 52 8 Z"
      fill={color}
    />
  </svg>
);
