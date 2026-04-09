import { Plus, Trash2, IndentIncrease, IndentDecrease, ChevronDown, ChevronUp, Search, Users } from 'lucide-react';

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
  showCriticalPath: boolean;
  onToggleCriticalPath: (on: boolean) => void;
}

export function GanttToolbar({
  searchQuery, onSearchChange, onAddTask, onDeleteTask,
  onIndent, onOutdent, onExpandAll, onCollapseAll,
  onToggleResources, showResources, hasSelection,
  showCriticalPath, onToggleCriticalPath,
}: GanttToolbarProps) {
  return (
    <div className="toolbar">
      <button className="btn btn-ghost btn-sm" onClick={onAddTask}>
        <Plus /> Add Task
      </button>
      <button className="btn btn-ghost btn-sm" onClick={onDeleteTask} disabled={!hasSelection}>
        <Trash2 /> Delete
      </button>

      <div className="toolbar-divider" />

      <button className="btn btn-ghost btn-icon btn-sm" onClick={onIndent} disabled={!hasSelection} title="Indent">
        <IndentIncrease />
      </button>
      <button className="btn btn-ghost btn-icon btn-sm" onClick={onOutdent} disabled={!hasSelection} title="Outdent">
        <IndentDecrease />
      </button>

      <div className="toolbar-divider" />

      <button className="btn btn-ghost btn-icon btn-sm" onClick={onExpandAll} title="Expand All">
        <ChevronDown />
      </button>
      <button className="btn btn-ghost btn-icon btn-sm" onClick={onCollapseAll} title="Collapse All">
        <ChevronUp />
      </button>

      <div className="toolbar-divider" />

      <div className="toolbar-switch-group">
        <label className="switch">
          <input
            type="checkbox"
            checked={showCriticalPath}
            onChange={e => onToggleCriticalPath(e.target.checked)}
          />
          <span className="switch-slider" />
        </label>
        <span className="toolbar-label">Critical Path</span>
      </div>

      <div className="toolbar-spacer" />

      <button
        className={`btn btn-sm ${showResources ? 'btn-primary' : 'btn-ghost'}`}
        onClick={onToggleResources}
      >
        <Users /> Resources
      </button>

      <div className="toolbar-search-wrapper">
        <Search className="toolbar-search-icon" />
        <input
          className="input toolbar-search-input"
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  );
}
