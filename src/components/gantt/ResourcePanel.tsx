import { useState } from 'react';
import { Resource } from '@/lib/gantt-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';

interface ResourcePanelProps {
  resources: Resource[];
  onAddResource: (name: string) => void;
  onDeleteResource: (id: string) => void;
}

const COLORS = [
  'hsl(213 60% 52%)', 'hsl(152 55% 42%)', 'hsl(32 90% 55%)',
  'hsl(280 60% 55%)', 'hsl(340 70% 55%)', 'hsl(180 55% 42%)',
];

export function ResourcePanel({ resources, onAddResource, onDeleteResource }: ResourcePanelProps) {
  const [newName, setNewName] = useState('');

  const handleAdd = () => {
    if (newName.trim()) {
      onAddResource(newName.trim());
      setNewName('');
    }
  };

  return (
    <div className="w-72 border-l bg-card p-4 overflow-auto gantt-scrollbar">
      <h3 className="text-sm font-semibold mb-3">Team Resources</h3>

      <div className="flex gap-2 mb-4">
        <Input
          placeholder="New resource name..."
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          className="h-8 text-xs"
        />
        <Button size="sm" onClick={handleAdd} className="h-8 px-2 shrink-0">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="space-y-2">
        {resources.map(r => (
          <div key={r.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/50 group">
            <span
              className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold text-primary-foreground shrink-0"
              style={{ backgroundColor: r.color }}
            >
              {r.name.split(' ').map(w => w[0]).join('')}
            </span>
            <span className="text-xs font-medium flex-1 truncate">{r.name}</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onDeleteResource(r.id)}
            >
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export { COLORS };
