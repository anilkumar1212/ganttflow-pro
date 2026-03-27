import { useEffect, useRef } from 'react';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onDelete: () => void;
  onSetProgress: (progress: number) => void;
}

export function GanttContextMenu({ x, y, onClose, onDelete, onSetProgress }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [onClose]);

  const items = [
    { label: 'Set Progress: 0%', action: () => onSetProgress(0) },
    { label: 'Set Progress: 50%', action: () => onSetProgress(50) },
    { label: 'Set Progress: 100%', action: () => onSetProgress(100) },
    { label: '—', action: () => {} },
    { label: 'Delete Task', action: onDelete, destructive: true },
  ];

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-popover border rounded-md shadow-lg py-1 min-w-[160px]"
      style={{ left: x, top: y }}
    >
      {items.map((item, i) =>
        item.label === '—' ? (
          <div key={i} className="h-px bg-border mx-2 my-1" />
        ) : (
          <button
            key={i}
            className={`w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors ${
              item.destructive ? 'text-destructive' : 'text-popover-foreground'
            }`}
            onClick={() => { item.action(); onClose(); }}
          >
            {item.label}
          </button>
        )
      )}
    </div>
  );
}
