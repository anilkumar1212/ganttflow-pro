import { Resource } from '@/lib/gantt-types';
import { Check, UserPlus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ResourceSelectProps {
  resources: Resource[];
  selected: string[];
  onChange: (resourceIds: string[]) => void;
}

export function ResourceSelect({ resources, selected, onChange }: ResourceSelectProps) {
  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter(r => r !== id) : [...selected, id]);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
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
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        className="w-[200px] p-1"
        onClick={(e) => e.stopPropagation()}
      >
        {resources.length === 0 ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">No resources available</div>
        ) : (
          resources.map(r => (
            <button
              key={r.id}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent rounded-sm transition-colors"
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
      </PopoverContent>
    </Popover>
  );
}
