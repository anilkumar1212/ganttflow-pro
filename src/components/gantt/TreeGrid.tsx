import { useState, useRef } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { FlatTask, Resource, formatDate, getDuration, dependencyToString, parsePredecessorString, toDateString } from '@/lib/gantt-types';

interface TreeGridProps {
  tasks: FlatTask[];
  resources: Resource[];
  selectedTaskId: number | null;
  onSelectTask: (id: number | null) => void;
  onToggleExpand: (id: number) => void;
  onUpdateTask: (id: number, field: string, value: any) => void;
  rowHeight: number;
}

export function TreeGrid({ tasks, resources, selectedTaskId, onSelectTask, onToggleExpand, onUpdateTask, rowHeight }: TreeGridProps) {
  const [editingCell, setEditingCell] = useState<{ id: number; field: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const visibleTasks = tasks.filter(t => t.visible);

  const columns = [
    { key: 'id', label: 'ID', width: 45 },
    { key: 'name', label: 'Task Name', width: 200 },
    { key: 'start', label: 'Start Date', width: 110 },
    { key: 'end', label: 'End Date', width: 110 },
    { key: 'duration', label: 'Duration', width: 72 },
    { key: 'progress', label: 'Progress', width: 72 },
    { key: 'resources', label: 'Resources', width: 120 },
    { key: 'predecessors', label: 'Predecessors', width: 110 },
  ];

  const totalWidth = columns.reduce((s, c) => s + c.width, 0);

  function startEdit(id: number, field: string) {
    const task = visibleTasks.find(t => t.id === id);
    if (!task || task.hasChildren && ['start', 'end', 'duration'].includes(field)) return;
    setEditingCell({ id, field });
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function commitEdit(value: string) {
    if (!editingCell) return;
    const { id, field } = editingCell;
    onUpdateTask(id, field, value);
    setEditingCell(null);
  }

  function getCellValue(task: FlatTask, key: string): string {
    switch (key) {
      case 'id': return String(task.id);
      case 'name': return task.name;
      case 'start': return toDateString(task.start);
      case 'end': return toDateString(task.end);
      case 'duration': return `${getDuration(task.start, task.end)}d`;
      case 'progress': return `${task.progress}%`;
      case 'resources': return task.resources.map(rid => resources.find(r => r.id === rid)?.name || rid).join(', ');
      case 'predecessors': return dependencyToString(task.dependencies);
      default: return '';
    }
  }

  function getDisplayValue(task: FlatTask, key: string): string {
    switch (key) {
      case 'start': return formatDate(task.start);
      case 'end': return formatDate(task.end);
      default: return getCellValue(task, key);
    }
  }

  const editableFields = ['name', 'start', 'end', 'duration', 'progress', 'predecessors'];

  return (
    <div className="flex flex-col h-full bg-card gantt-scrollbar overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 flex bg-gantt-header" style={{ minWidth: totalWidth }}>
        {columns.map(col => (
          <div
            key={col.key}
            className="flex items-center px-2 text-xs font-semibold text-gantt-header-foreground border-r border-gantt-header-foreground/10 shrink-0"
            style={{ width: col.width, height: rowHeight }}
          >
            {col.label}
          </div>
        ))}
      </div>

      {/* Rows */}
      {visibleTasks.map(task => (
        <div
          key={task.id}
          className={`flex border-b border-gantt-grid-line cursor-pointer transition-colors ${
            selectedTaskId === task.id ? 'bg-gantt-row-selected' : 'hover:bg-gantt-row-hover'
          }`}
          style={{ minWidth: totalWidth, height: rowHeight }}
          onClick={() => onSelectTask(task.id)}
          onContextMenu={e => { e.preventDefault(); onSelectTask(task.id); }}
        >
          {columns.map(col => {
            const isEditing = editingCell?.id === task.id && editingCell?.field === col.key;

            return (
              <div
                key={col.key}
                className="flex items-center px-2 text-xs border-r border-gantt-grid-line shrink-0 overflow-hidden"
                style={{ width: col.width }}
                onDoubleClick={() => editableFields.includes(col.key) && startEdit(task.id, col.key)}
              >
                {col.key === 'name' ? (
                  <div className="flex items-center gap-1 w-full" style={{ paddingLeft: task.level * 16 }}>
                    {task.hasChildren ? (
                      <button
                        onClick={e => { e.stopPropagation(); onToggleExpand(task.id); }}
                        className="p-0.5 rounded hover:bg-accent shrink-0"
                      >
                        {task.expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      </button>
                    ) : (
                      <span className="w-4 shrink-0" />
                    )}
                    {isEditing ? (
                      <input
                        ref={inputRef}
                        defaultValue={getCellValue(task, col.key)}
                        onBlur={e => commitEdit(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') commitEdit((e.target as HTMLInputElement).value); if (e.key === 'Escape') setEditingCell(null); }}
                        className="flex-1 bg-background border border-ring rounded px-1 py-0.5 text-xs outline-none min-w-0"
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <span className={`truncate ${task.hasChildren ? 'font-semibold' : ''}`}>{task.name}</span>
                    )}
                  </div>
                ) : col.key === 'progress' ? (
                  <div className="flex items-center gap-1 w-full">
                    <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-gantt-success rounded-full" style={{ width: `${task.progress}%` }} />
                    </div>
                    <span className="text-muted-foreground shrink-0">{task.progress}%</span>
                  </div>
                ) : col.key === 'resources' ? (
                  <div className="flex items-center gap-0.5">
                    {task.resources.slice(0, 3).map(rid => {
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
                    {task.resources.length > 3 && (
                      <span className="text-muted-foreground text-[10px]">+{task.resources.length - 3}</span>
                    )}
                  </div>
                ) : isEditing ? (
                  <input
                    ref={inputRef}
                    defaultValue={getCellValue(task, col.key)}
                    type={['start', 'end'].includes(col.key) ? 'date' : 'text'}
                    onBlur={e => commitEdit(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') commitEdit((e.target as HTMLInputElement).value); if (e.key === 'Escape') setEditingCell(null); }}
                    className="w-full bg-background border border-ring rounded px-1 py-0.5 text-xs outline-none"
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <span className={`truncate ${col.key === 'id' ? 'text-muted-foreground font-mono' : ''}`}>
                    {getDisplayValue(task, col.key)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
