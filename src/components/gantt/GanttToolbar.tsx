import { Plus, Pencil, Trash2, IndentIncrease, IndentDecrease, ChevronDown, ChevronUp, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface GanttToolbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onAddTask: () => void;
  onDeleteTask: () => void;
  onIndent: () => void;
  onOutdent: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onToggleResources: () => void;
  showResources: boolean;
  hasSelection: boolean;
}

export function GanttToolbar({
  searchQuery, onSearchChange, onAddTask, onDeleteTask,
  onIndent, onOutdent, onExpandAll, onCollapseAll,
  onToggleResources, showResources, hasSelection,
}: GanttToolbarProps) {
  return (
    <div className="flex items-center gap-1 px-3 py-2 border-b bg-card">
      <Button size="sm" variant="ghost" onClick={onAddTask} className="gap-1.5 text-xs font-medium">
        <Plus className="h-3.5 w-3.5" /> Add Task
      </Button>
      <Button size="sm" variant="ghost" onClick={onDeleteTask} disabled={!hasSelection} className="gap-1.5 text-xs font-medium">
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </Button>

      <div className="w-px h-5 bg-border mx-1" />

      <Button size="sm" variant="ghost" onClick={onIndent} disabled={!hasSelection} title="Indent">
        <IndentIncrease className="h-3.5 w-3.5" />
      </Button>
      <Button size="sm" variant="ghost" onClick={onOutdent} disabled={!hasSelection} title="Outdent">
        <IndentDecrease className="h-3.5 w-3.5" />
      </Button>

      <div className="w-px h-5 bg-border mx-1" />

      <Button size="sm" variant="ghost" onClick={onExpandAll} title="Expand All">
        <ChevronDown className="h-3.5 w-3.5" />
      </Button>
      <Button size="sm" variant="ghost" onClick={onCollapseAll} title="Collapse All">
        <ChevronUp className="h-3.5 w-3.5" />
      </Button>

      <div className="flex-1" />

      <Button
        size="sm"
        variant={showResources ? 'default' : 'ghost'}
        onClick={onToggleResources}
        className="gap-1.5 text-xs font-medium"
      >
        <Users className="h-3.5 w-3.5" /> Resources
      </Button>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          className="h-8 w-48 pl-8 text-xs"
        />
      </div>
    </div>
  );
}
