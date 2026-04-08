import { useState, useRef } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { FlatTask, Resource, formatDate, getDuration, dependencyToString, toDateString } from '@/lib/gantt-types';
import { CPMResult } from '@/lib/gantt-cpm';
import { ResourceSelect } from './ResourceSelect';
import { ProgressEditor } from './ProgressEditor';

interface TreeGridProps {
  tasks: FlatTask[];
  resources: Resource[];
  selectedTaskIds: Set<number>;
  onSelectTask: (id: number, ctrlKey: boolean, shiftKey: boolean) => void;
  onToggleExpand: (id: number) => void;
  onUpdateTask: (id: number, field: string, value: any) => void;
  onUpdateResources: (id: number, resourceIds: string[]) => void;
  cpmResults: Map<number, CPMResult>;
  showCriticalPath: boolean;
  highlightTaskId: number | null;
  rowHeight: number;
}

export function TreeGrid({ tasks, resources, selectedTaskIds, onSelectTask, onToggleExpand, onUpdateTask, onUpdateResources, cpmResults, showCriticalPath, highlightTaskId, rowHeight }: TreeGridProps) {
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
      {/* Header - 2 rows to match timeline month+day headers */}
      <div className="sticky top-0 z-10 flex flex-col" style={{ minWidth: totalWidth }}>
        {/* Top row (matches month header) */}
        <div className="flex bg-gantt-header" style={{ minWidth: totalWidth }}>
          <div
            className="flex items-center px-3 text-xs font-semibold text-gantt-header-foreground"
            style={{ width: totalWidth, height: rowHeight }}
          >
            Task Details
          </div>
        </div>
        {/* Bottom row (matches day header) */}
        <div className="flex bg-gantt-header/85" style={{ minWidth: totalWidth }}>
          {columns.map(col => (
            <div
              key={col.key}
              className="flex items-center px-2 text-[9px] font-semibold text-gantt-header-foreground/80 border-r border-gantt-header-foreground/10 shrink-0"
              style={{ width: col.width, height: rowHeight }}
            >
              {col.label}
            </div>
          ))}
        </div>
      </div>

      {/* Rows */}
      {visibleTasks.map(task => {
        const cpm = cpmResults.get(task.id);
        const isCritical = showCriticalPath && (cpm?.isCritical ?? false);
        const isHighlighted = highlightTaskId === task.id;
        const isSelected = selectedTaskIds.has(task.id);

        return (
          <div
            key={task.id}
            data-task-id={task.id}
            className={`flex border-b cursor-pointer transition-all ${
              isHighlighted
                ? 'bg-accent ring-2 ring-inset ring-primary'
                : isSelected
                ? 'bg-gantt-row-selected'
                : isCritical
                ? 'bg-destructive/5 border-destructive/20'
                : 'hover:bg-gantt-row-hover border-gantt-grid-line'
            }`}
            style={{ minWidth: totalWidth, height: rowHeight, minHeight: rowHeight, maxHeight: rowHeight, boxSizing: 'border-box' }}
            onClick={(e) => onSelectTask(task.id, e.ctrlKey || e.metaKey, e.shiftKey)}
            onContextMenu={e => { e.preventDefault(); onSelectTask(task.id, e.ctrlKey || e.metaKey, e.shiftKey); }}
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
                        <span className={`truncate ${task.hasChildren ? 'font-semibold' : ''} ${isCritical ? 'text-destructive font-medium' : ''}`}>
                          {task.name}
                        </span>
                      )}
                    </div>
                  ) : col.key === 'progress' ? (
                    <ProgressEditor
                      progress={task.progress}
                      onChange={(v) => onUpdateTask(task.id, 'progress', String(v))}
                    />
                  ) : col.key === 'resources' ? (
                    <ResourceSelect
                      resources={resources}
                      selected={task.resources}
                      onChange={(ids) => onUpdateResources(task.id, ids)}
                    />
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
        );
      })}
    </div>
  );
}
