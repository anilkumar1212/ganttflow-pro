import { useState } from 'react';
import { ControlledPopover } from '@/components/SimplePopover';

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
    <ControlledPopover
      open={open}
      onOpenChange={handleOpen}
      trigger={
        <button className="progress-trigger" onClick={e => e.stopPropagation()}>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="progress-value">{progress}%</span>
        </button>
      }
      width={224}
    >
      <div onClick={e => e.stopPropagation()}>
        <div className="progress-popover-row">
          <label className="progress-popover-label">Progress</label>
          <input
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
            className="input input-sm progress-popover-input"
          />
          <span className="progress-popover-unit">%</span>
        </div>
        <input
          type="range"
          className="range-slider"
          min={0}
          max={100}
          step={1}
          value={localValue}
          onChange={e => { const v = parseInt(e.target.value); setLocalValue(v); commit(v); }}
        />
        <div className="progress-popover-ticks">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>
    </ControlledPopover>
  );
}
