import React from 'react';

type CursorProps = {
  x: number;
  y: number;
  connectionId: number;
  name?: string;
  color?: string;
};

const DEFAULT_CURSOR_COLOR = "#007BFF";
const CURSOR_TRANSITION_DURATION = 0.1; // seconds

const Cursor = React.memo(({ x, y, connectionId, name, color }: CursorProps) => {
  const cursorColor = color || DEFAULT_CURSOR_COLOR;

  return (
    <div
      className="absolute top-0 left-0 pointer-events-none"
      style={{
        transform: `translateX(${x}px) translateY(${y}px)`,
        transition: `transform ${CURSOR_TRANSITION_DURATION}s ease-out`,
      }}
    >
      {/* Cursor SVG */}
      <svg
        className="relative h-5 w-5"
        style={{ color: cursorColor }}
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M5.65376 12.3673C5.40688 12.7717 5.99689 13.2283 6.34674 12.9249L19.6037 2.10784C19.962 1.79311 19.7603 1.14388 1.69966 1.14388C1.11861 1.14388 0.879841 1.82444 1.28617 2.15013L5.65376 12.3673Z" />
      </svg>

      {/* Name tag (if provided) */}
      {name && (
        <div
          className="absolute left-4 -top-5 px-2 py-1 text-xs leading-none text-white whitespace-nowrap rounded-md shadow-md"
          style={{ backgroundColor: cursorColor }}
        >
          {name}
        </div>
      )}
    </div>
  );
});

Cursor.displayName = 'Cursor';

export default Cursor;
