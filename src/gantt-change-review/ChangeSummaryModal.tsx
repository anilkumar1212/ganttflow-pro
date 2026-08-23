import { Fragment } from 'react';
import { ReviewTask, TaskChange, computeTaskChanges, FIELD_LABELS, sortFields } from './utils';

interface Props {
  initialTasks: ReviewTask[];
  currentTasks: ReviewTask[];
  onClose: () => void;
}

export function ChangeSummaryModal({ initialTasks, currentTasks, onClose }: Props) {
  const changes = computeTaskChanges(initialTasks, currentTasks);
  const modified = changes.filter(c => c.status === 'modified');
  const added = changes.filter(c => c.status === 'added');
  const removed = changes.filter(c => c.status === 'removed');
  const rows = [...modified, ...added, ...removed];

  // Data-driven columns: every changed field, plus name for context.
  const changedFields = new Set<string>();
  modified.forEach(c => c.changes.forEach(f => changedFields.add(f.field)));
  added.concat(removed).forEach(c => {
    Object.keys(c.after).forEach(k => changedFields.add(k));
    Object.keys(c.before).forEach(k => changedFields.add(k));
  });
  changedFields.add('name');
  const columns = sortFields(Array.from(changedFields));

  const changedSet = (task: TaskChange) => new Set(task.changes.map(c => c.field));

  const statusLabel = (s: TaskChange['status']) =>
    s === 'added' ? 'Added' : s === 'removed' ? 'Removed' : 'Modified';

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
            <div className="gcr-table-wrap">
              <table className="gcr-summary-table gcr-pair-table">
                <thead>
                  <tr>
                    <th className="gcr-col-task">Task ID</th>
                    <th className="gcr-col-type">Type</th>
                    {columns.map(f => (
                      <th key={f} className="gcr-col-field">{FIELD_LABELS[f] ?? f}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(task => {
                    const changed = changedSet(task);
                    const isAdded = task.status === 'added';
                    const isRemoved = task.status === 'removed';
                    return (
                      <Fragment key={task.id}>
                        <tr className="gcr-row-old">
                          <td className="gcr-cell-task" rowSpan={2}>
                            <span className="gcr-task-id">{task.id}</span>
                            <span className={`gcr-task-status gcr-status-${task.status}`}>
                              {statusLabel(task.status)}
                            </span>
                          </td>
                          <td className="gcr-cell-type">Existing</td>
                          {columns.map(f => (
                            <td
                              key={f}
                              className={`gcr-cell-value gcr-cell-old ${changed.has(f) ? 'gcr-changed' : ''}`}
                            >
                              {isAdded ? '—' : task.before[f] ?? '—'}
                            </td>
                          ))}
                        </tr>
                        <tr className="gcr-row-new">
                          <td className="gcr-cell-type">Modified</td>
                          {columns.map(f => (
                            <td
                              key={f}
                              className={`gcr-cell-value gcr-cell-new ${changed.has(f) ? 'gcr-changed' : ''}`}
                            >
                              {isRemoved ? '—' : task.after[f] ?? '—'}
                            </td>
                          ))}
                        </tr>
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
