import { useRef, useState, useCallback, useEffect } from 'react';
import { FlatTask, Resource, Dependency, addDays, getDuration, formatDate } from '@/lib/gantt-types';
import { CPMResult } from '@/lib/gantt-cpm';

interface TimelineChartProps {
  tasks: FlatTask[];
  resources: Resource[];
  selectedTaskId: number | null;
  onSelectTask: (id: number | null) => void;
  onMoveTask: (id: number, newStart: Date) => void;
  onResizeTask: (id: number, newEnd: Date) => void;
  onContextMenu: (e: React.MouseEvent, taskId: number) => void;
  cpmResults: Map<number, CPMResult>;
  showCriticalPath: boolean;
  rowHeight: number;
  dayWidth: number;
}

export function TimelineChart({
  tasks, resources, selectedTaskId, onSelectTask,
  onMoveTask, onResizeTask, onContextMenu, cpmResults, showCriticalPath, rowHeight, dayWidth,
}: TimelineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{ taskId: number; mode: 'move' | 'resize'; startX: number; origStart: Date; origEnd: Date } | null>(null);

  const visibleTasks = tasks.filter(t => t.visible);

  // Calculate timeline range
  const allDates = visibleTasks.flatMap(t => [t.start, t.end]);
  if (allDates.length === 0) return <div className="flex-1 bg-card" />;

  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
  const startDate = addDays(minDate, -3);
  const endDate = addDays(maxDate, 7);
  const totalDays = getDuration(startDate, endDate);
  const totalWidth = totalDays * dayWidth;
  const totalHeight = visibleTasks.length * rowHeight;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayX = getDuration(startDate, today) * dayWidth;

  function dateToX(date: Date): number {
    return getDuration(startDate, date) * dayWidth;
  }

  // Generate day headers
  const days: { date: Date; x: number }[] = [];
  for (let i = 0; i < totalDays; i++) {
    days.push({ date: addDays(startDate, i), x: i * dayWidth });
  }

  // Generate month headers
  const months: { label: string; x: number; width: number }[] = [];
  let currentMonth = -1;
  let monthStart = 0;
  for (let i = 0; i <= totalDays; i++) {
    const d = addDays(startDate, i);
    const m = d.getMonth();
    if (m !== currentMonth) {
      if (currentMonth >= 0) {
        const prevDate = addDays(startDate, i - 1);
        months.push({
          label: prevDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          x: monthStart * dayWidth,
          width: (i - monthStart) * dayWidth,
        });
      }
      currentMonth = m;
      monthStart = i;
    }
  }
  if (currentMonth >= 0) {
    const lastDate = addDays(startDate, totalDays - 1);
    months.push({
      label: lastDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      x: monthStart * dayWidth,
      width: (totalDays - monthStart) * dayWidth,
    });
  }

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent, taskId: number, mode: 'move' | 'resize') => {
    e.stopPropagation();
    const task = visibleTasks.find(t => t.id === taskId);
    if (!task || task.hasChildren) return;
    setDragging({ taskId, mode, startX: e.clientX, origStart: task.start, origEnd: task.end });
    onSelectTask(taskId);
  }, [visibleTasks, onSelectTask]);

  useEffect(() => {
    if (!dragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragging.startX;
      const dayDelta = Math.round(dx / dayWidth);
      if (dragging.mode === 'move') {
        const newStart = addDays(dragging.origStart, dayDelta);
        onMoveTask(dragging.taskId, newStart);
      } else {
        const newEnd = addDays(dragging.origEnd, dayDelta);
        if (newEnd > dragging.origStart) {
          onResizeTask(dragging.taskId, newEnd);
        }
      }
    };
    const handleMouseUp = () => setDragging(null);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, dayWidth, onMoveTask, onResizeTask]);

  // Render dependency arrows
  function renderDependency(task: FlatTask, dep: Dependency, taskIndex: number) {
    const predIndex = visibleTasks.findIndex(t => t.id === dep.predecessorId);
    if (predIndex === -1) return null;
    const pred = visibleTasks[predIndex];

    const halfRow = rowHeight / 2;
    const fromY = predIndex * rowHeight + halfRow;
    const toY = taskIndex * rowHeight + halfRow;

    const fromEnd = dep.type === 'FS' || dep.type === 'FF';
    const toEnd   = dep.type === 'SF' || dep.type === 'FF';

    const fromX = fromEnd ? dateToX(pred.end) : dateToX(pred.start);
    const toX   = toEnd   ? dateToX(task.end)  : dateToX(task.start);

    const margin = 12;
    const exitX  = fromEnd ? fromX + margin : fromX - margin;
    const enterX = toEnd   ? toX + margin   : toX - margin;

    let pathD: string;

    if ((fromEnd && toX >= fromX + margin) || (!fromEnd && toX <= fromX - margin)) {
      pathD = `M${fromX},${fromY} H${exitX} V${toY} H${toX}`;
    } else {
      const routeY = (fromY + toY) / 2;
      pathD = `M${fromX},${fromY} H${exitX} V${routeY} H${enterX} V${toY} H${toX}`;
    }

    const arrowDir = toEnd ? 1 : -1;
    const ax = toX;
    const ay = toY;

    return (
      <g key={`dep-${task.id}-${dep.predecessorId}-${dep.type}`}>
        <path d={pathD} fill="none" stroke="hsl(var(--gantt-link))" strokeWidth={1.5} />
        <polygon
          points={`${ax},${ay} ${ax - arrowDir * 6},${ay - 3.5} ${ax - arrowDir * 6},${ay + 3.5}`}
          fill="hsl(var(--gantt-link))"
        />
      </g>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-auto gantt-scrollbar bg-card">
      <svg ref={svgRef} width={totalWidth} height={totalHeight + rowHeight * 2} className="select-none">
        {/* Month header */}
        <g>
          <rect x={0} y={0} width={totalWidth} height={rowHeight} fill="hsl(var(--gantt-header))" />
          {months.map((m, i) => (
            <g key={i}>
              <text x={m.x + m.width / 2} y={rowHeight / 2 + 4} textAnchor="middle" className="fill-gantt-header-foreground text-[11px] font-semibold">{m.label}</text>
              <line x1={m.x} y1={0} x2={m.x} y2={rowHeight} stroke="hsl(var(--gantt-header-foreground))" strokeOpacity={0.15} />
            </g>
          ))}
        </g>

        {/* Day header */}
        <g>
          <rect x={0} y={rowHeight} width={totalWidth} height={rowHeight} fill="hsl(var(--gantt-header))" fillOpacity={0.85} />
          {days.map((d, i) => {
            const isWeekend = d.date.getDay() === 0 || d.date.getDay() === 6;
            const dayNum = d.date.getDate();
            return (
              <g key={i}>
                {dayWidth >= 20 && (
                  <text
                    x={d.x + dayWidth / 2}
                    y={rowHeight + rowHeight / 2 + 4}
                    textAnchor="middle"
                    className={`text-[9px] ${isWeekend ? 'fill-gantt-header-foreground/50' : 'fill-gantt-header-foreground/80'}`}
                  >
                    {dayNum}
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {/* Grid area offset by 2 rows for headers */}
        <g transform={`translate(0, ${rowHeight * 2})`}>
          {/* Weekend shading & grid lines */}
          {days.map((d, i) => {
            const isWeekend = d.date.getDay() === 0 || d.date.getDay() === 6;
            return (
              <g key={i}>
                {isWeekend && <rect x={d.x} y={0} width={dayWidth} height={totalHeight} fill="hsl(var(--gantt-weekend))" />}
                <line x1={d.x} y1={0} x2={d.x} y2={totalHeight} stroke="hsl(var(--gantt-grid-line))" strokeWidth={0.5} />
              </g>
            );
          })}

          {/* Row lines */}
          {visibleTasks.map((_, i) => (
            <line key={i} x1={0} y1={(i + 1) * rowHeight} x2={totalWidth} y2={(i + 1) * rowHeight} stroke="hsl(var(--gantt-grid-line))" strokeWidth={0.5} />
          ))}

          {/* Today line */}
          <line x1={todayX} y1={0} x2={todayX} y2={totalHeight} stroke="hsl(var(--gantt-today))" strokeWidth={1.5} strokeDasharray="4 2" />

          {/* Dependency lines */}
          {visibleTasks.map((task, idx) =>
            task.dependencies.map(dep => renderDependency(task, dep, idx))
          )}

          {/* Task bars */}
          {visibleTasks.map((task, idx) => {
            const x = dateToX(task.start);
            const width = Math.max(dateToX(task.end) - x, dayWidth * 0.5);
            const y = idx * rowHeight;
            const barHeight = task.hasChildren ? 8 : 20;
            const barY = y + (rowHeight - barHeight) / 2;
            const isSelected = selectedTaskId === task.id;
            const cpm = cpmResults.get(task.id);
            const isCritical = showCriticalPath && (cpm?.isCritical ?? false);

            if (task.hasChildren) {
              return (
                <g key={task.id} onClick={() => onSelectTask(task.id)} className="cursor-pointer">
                  <rect x={x} y={barY} width={width} height={barHeight} rx={1} fill="hsl(var(--gantt-bar-parent))" opacity={0.8} />
                  <rect x={x} y={barY} width={3} height={barHeight + 4} fill="hsl(var(--gantt-bar-parent))" />
                  <rect x={x + width - 3} y={barY} width={3} height={barHeight + 4} fill="hsl(var(--gantt-bar-parent))" />
                  <rect x={x} y={barY} width={width * (task.progress / 100)} height={barHeight} rx={1} fill="hsl(var(--gantt-bar-progress))" opacity={0.5} />
                  {isSelected && <rect x={x - 1} y={barY - 1} width={width + 2} height={barHeight + 2} rx={2} fill="none" stroke="hsl(var(--ring))" strokeWidth={2} />}
                </g>
              );
            }

            return (
              <g key={task.id} className="cursor-pointer">
                {isSelected && (
                  <rect x={0} y={y} width={totalWidth} height={rowHeight} fill="hsl(var(--gantt-row-selected))" />
                )}

                {/* Bar background */}
                <rect
                  x={x} y={barY} width={width} height={barHeight} rx={3}
                  fill={isCritical ? 'hsl(var(--gantt-critical))' : 'hsl(var(--gantt-bar))'}
                  className="cursor-grab"
                  onMouseDown={e => handleMouseDown(e, task.id, 'move')}
                  onClick={() => onSelectTask(task.id)}
                  onContextMenu={e => onContextMenu(e, task.id)}
                />

                {/* Critical glow */}
                {isCritical && (
                  <rect x={x - 2} y={barY - 2} width={width + 4} height={barHeight + 4} rx={5} fill="none" stroke="hsl(var(--gantt-critical))" strokeWidth={1.5} strokeOpacity={0.5}>
                    <animate attributeName="stroke-opacity" values="0.5;0.2;0.5" dur="2s" repeatCount="indefinite" />
                  </rect>
                )}

                {/* Progress fill */}
                <rect
                  x={x} y={barY} width={width * (task.progress / 100)} height={barHeight} rx={3}
                  fill="hsl(var(--gantt-bar-progress))"
                  className="pointer-events-none"
                />
                {task.progress > 0 && task.progress < 100 && (
                  <rect
                    x={x + width * (task.progress / 100) - 3} y={barY}
                    width={3} height={barHeight}
                    fill="hsl(var(--gantt-bar-progress))"
                    className="pointer-events-none"
                  />
                )}

                {/* Resize handle */}
                <rect
                  x={x + width - 6} y={barY} width={6} height={barHeight} rx={0}
                  fill="transparent"
                  className="cursor-ew-resize"
                  onMouseDown={e => handleMouseDown(e, task.id, 'resize')}
                />

                {/* Task label */}
                {width > 60 && (
                  <text
                    x={x + 6} y={barY + barHeight / 2 + 4}
                    className="fill-primary-foreground text-[10px] font-medium pointer-events-none"
                  >
                    {task.name.length > width / 7 ? task.name.slice(0, Math.floor(width / 7)) + '…' : task.name}
                  </text>
                )}

                {/* Resource avatars on bar */}
                {task.resources.slice(0, 2).map((rid, ri) => {
                  const r = resources.find(x => x.id === rid);
                  if (!r) return null;
                  return (
                    <g key={rid}>
                      <circle
                        cx={x + width + 12 + ri * 18}
                        cy={y + rowHeight / 2}
                        r={8}
                        fill={r.color}
                      />
                      <text
                        x={x + width + 12 + ri * 18}
                        y={y + rowHeight / 2 + 3}
                        textAnchor="middle"
                        className="fill-primary-foreground text-[7px] font-bold pointer-events-none"
                      >
                        {r.name.split(' ').map(w => w[0]).join('')}
                      </text>
                    </g>
                  );
                })}

                {/* Selection ring */}
                {isSelected && (
                  <rect x={x - 1} y={barY - 1} width={width + 2} height={barHeight + 2} rx={4} fill="none" stroke="hsl(var(--ring))" strokeWidth={2} />
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
