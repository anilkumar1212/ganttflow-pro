import { useState, useRef, useEffect } from 'react';
import { Resource } from '@/lib/gantt-types';
import { Check, UserPlus } from 'lucide-react';

interface ResourceSelectProps {
  resources: Resource[];
  selected: string[];
  onChange: (resourceIds: string[]) => void;
}

export function ResourceSelect({ resources, selected, onChange }: ResourceSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [open]);

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter(r => r !== id) : [...selected, id]);
  };

  return (
    <div ref={ref} className="relative w-full h-full">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="flex items-center gap-0.5 w-full h-full"
      >
        {selected.length === 0 ? (
          <span className="flex items-center gap-1 text-muted-foreground text-[10px]">
            <UserPlus className="h-3 w-3 text-muted-foreground" />
            Assign
          </span>
        ) : (
          <>
            {selected.slice(0, 3).map(rid => {
              const r = resources.find(x => x.id === rid);
              return r ? (
                <span
                  key={rid}
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold text-primary-foreground shrink-0"
                  style={{ backgroundColor: r.color }}
                  title={r.name}
                >
                  {r.name.split(' ').map(w => w[0]).join('')}
                </span>
              ) : null;
            })}
            {selected.length > 3 && (
              <span className="text-muted-foreground text-[10px]">+{selected.length - 3}</span>
            )}
            <UserPlus className="h-3 w-3 ml-auto text-muted-foreground shrink-0" />
          </>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-popover border rounded-md shadow-lg py-1 min-w-[180px]">
          {resources.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">No resources available</div>
          ) : (
            resources.map(r => (
              <button
                key={r.id}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent transition-colors"
                onClick={(e) => { e.stopPropagation(); toggle(r.id); }}
              >
                <span
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold text-primary-foreground shrink-0"
                  style={{ backgroundColor: r.color }}
                >
                  {r.name.split(' ').map(w => w[0]).join('')}
                </span>
                <span className="flex-1 text-left">{r.name}</span>
                {selected.includes(r.id) && <Check className="w-3.5 h-3.5 text-gantt-success" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
