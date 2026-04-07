import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';

interface ProgressEditorProps {
  progress: number;
  onChange: (value: number) => void;
}

export function ProgressEditor({ progress, onChange }: ProgressEditorProps) {
  const [open, setOpen] = useState(false);
  const [localValue, setLocalValue] = useState(progress);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) setLocalValue(progress);
    setOpen(isOpen);
  };

  const clamp = (v: number) => Math.max(0, Math.min(100, isNaN(v) ? 0 : Math.round(v)));

  const commit = (v: number) => {
    const clamped = clamp(v);
    setLocalValue(clamped);
    onChange(clamped);
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-1.5 w-full h-full text-xs"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-gantt-success rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-muted-foreground shrink-0 tabular-nums">{progress}%</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-56 p-3 space-y-3"
        align="start"
        side="bottom"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground shrink-0">Progress</label>
          <Input
            type="number"
            min={0}
            max={100}
            value={localValue}
            onChange={e => {
              const v = parseInt(e.target.value);
              setLocalValue(isNaN(v) ? 0 : v);
            }}
            onBlur={() => commit(localValue)}
            onKeyDown={e => { if (e.key === 'Enter') commit(localValue); }}
            className="h-7 text-xs w-16 text-center"
          />
          <span className="text-xs text-muted-foreground">%</span>
        </div>
        <Slider
          min={0}
          max={100}
          step={1}
          value={[localValue]}
          onValueChange={([v]) => { setLocalValue(v); commit(v); }}
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
