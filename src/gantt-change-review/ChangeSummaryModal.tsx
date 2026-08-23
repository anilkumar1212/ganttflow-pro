import { Fragment } from 'react';
import { ReviewTask, TaskChange, computeTaskChanges, FieldChange } from './utils';

interface Props {
  initialTasks: ReviewTask[];
  currentTasks: ReviewTask[];
  onClose: () => void;
}

const FIELD_ORDER = ['name', 'start', 'end', 'progress', 'parentId', 'resources', 'dependencies', 'level'];

const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  start: 'Start',
  end: 'End',
  progress: 'Progress',
  parentId: 'Parent',
  resources: 'Resources',
  dependencies: 'Dependencies',
  level: 'Level',
};

function prettyDate(value: unknown): string {
  const d = value instanceof Date ? value : new Date(String(value));
  if (isNaN(d.getTime())) return String(value ?? '');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function displayValue(field: string, value: unknown): string {
  if (field === 'start' || field === 'end') return prettyDate(value);
  if (field === 'progress') return `${value ?? 0}%`;
  if (Array.isArray(value)) return value.length ? JSON.stringify(value) : '—';
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

export function ChangeSummaryModal({ initialTasks, currentTasks, onClose }: Props) {
  const changes = computeTaskChanges(initialTasks, currentTasks);
  const modified = changes.filter((c): c is TaskChange & { status: 'modified' } => c.status === 'modified');
  const added = changes.filter(c => c.status === 'added');
  const removed = changes.filter(c => c.status === 'removed');

  const currentMap = new Map(currentTasks.map(t => [t.id, t]));

  const changedFields = Array.from(new Set(modified.flatMap(c => c.changes.map(f => f.field))))
    .sort((a, b) => {
      const ia = FIELD_ORDER.indexOf(a);
      const ib = FIELD_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

  // Only show columns for fields that were actually modified.
  const visibleFields = changedFields;


  const getChange = (task: TaskChange, field: string): FieldChange | undefined =>
    task.changes.find(c => c.field === field);

  return (
    <div className="gcr-overlay" onMouseDown={onClose}>
      <div className="gcr-modal gcr-modal-summary" onMouseDown={e => e.stopPropagation()}>
        <div className="gcr-modal-header">
          <div>
            <h2 className="gcr-modal-title">Gantt Changes</h2>
            <div className="gcr-modal-sub">
              {changes.length === 0
                ? 'Comparing the current plan with the original plan'
                : `${changes.length} task${changes.length === 1 ? '' : 's'} changed since the plan was loaded`}
            </div>
          </div>
          <button className="gcr-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="gcr-modal-body gcr-summary-body">
          {changes.length === 0 ? (
            <div className="gcr-empty">
              <span className="gcr-empty-emoji">✅</span>
              No changes have been made to the Gantt plan.
            </div>
          ) : (
            <>
              {(added.length > 0 || removed.length > 0) && (
                <div className="gcr-status-bar">
                  {added.length > 0 && (
                    <div className="gcr-status-group">
                      <span className="gcr-status-label gcr-status-added">Added</span>
                      {added.map(a => (
                        <span className="gcr-status-chip" key={a.id}>{a.name}</span>
                      ))}
                    </div>
                  )}
                  {removed.length > 0 && (
                    <div className="gcr-status-group">
                      <span className="gcr-status-label gcr-status-removed">Removed</span>
                      {removed.map(r => (
                        <span className="gcr-status-chip" key={r.id}>{r.name}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {modified.length > 0 && (
                <div className="gcr-table-wrap">
                  <table className="gcr-summary-table">
                    <thead>
                      <tr>
                        <th className="gcr-col-task" rowSpan={2}>Task</th>
                        {visibleFields.map(field => (
                          <th key={field} colSpan={2} className="gcr-col-field">
                            {FIELD_LABELS[field] ?? field}
                          </th>
                        ))}
                      </tr>
                      <tr>
                        {visibleFields.map(field => (
                          <Fragment key={field}>
                            <th className="gcr-col-sub gcr-col-old">Existing</th>
                            <th className="gcr-col-sub gcr-col-new">Modified</th>
                          </Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {modified.map(task => (
                        <tr key={task.id}>
                          <td className="gcr-cell-task">
                            <span className="gcr-task-name">{task.name}</span>
                            <span className="gcr-task-id">#{task.id}</span>
                          </td>
                          {visibleFields.map(field => {
                            const change = getChange(task, field);
                            const taskData = currentMap.get(task.id);
                            const unchangedValue = displayValue(
                              field,
                              taskData ? (taskData as Record<string, unknown>)[field] : '—'
                            );
                            return (
                              <Fragment key={field}>
                                <td
                                  className={`gcr-cell-value gcr-cell-old ${change ? 'gcr-changed' : ''}`}
                                >
                                  {change ? change.from : unchangedValue}
                                </td>
                                <td
                                  className={`gcr-cell-value gcr-cell-new ${change ? 'gcr-changed' : ''}`}
                                >
                                  {change ? change.to : unchangedValue}
                                </td>
                              </Fragment>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {modified.length === 0 && (added.length > 0 || removed.length > 0) && (
                <div className="gcr-empty">
                  <span className="gcr-empty-emoji">ℹ️</span>
                  Only task additions and removals were detected.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
