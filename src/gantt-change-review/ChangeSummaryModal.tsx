import { ReviewTask, computeTaskChanges } from './utils';

interface Props {
  initialTasks: ReviewTask[];
  currentTasks: ReviewTask[];
  onClose: () => void;
}

export function ChangeSummaryModal({ initialTasks, currentTasks, onClose }: Props) {
  const changes = computeTaskChanges(initialTasks, currentTasks);

  return (
    <div className="gcr-overlay" onMouseDown={onClose}>
      <div className="gcr-modal" onMouseDown={e => e.stopPropagation()}>
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

        <div className="gcr-modal-body">
          {changes.length === 0 ? (
            <div className="gcr-empty">
              <span className="gcr-empty-emoji">✅</span>
              No changes have been made to the Gantt plan.
            </div>
          ) : (
            changes.map(c => (
              <div className="gcr-card" key={`${c.status}-${c.id}`}>
                <div className="gcr-card-head">
                  <span>{c.name}</span>
                  <span className={`gcr-badge gcr-badge-${c.status}`}>{c.status}</span>
                </div>
                {c.status === 'added' && (
                  <div className="gcr-field"><span className="gcr-field-label">New task</span>
                    <span className="gcr-values"><span className="gcr-new">Added to the plan</span></span>
                  </div>
                )}
                {c.status === 'removed' && (
                  <div className="gcr-field"><span className="gcr-field-label">Task</span>
                    <span className="gcr-values"><span className="gcr-old">Removed from the plan</span></span>
                  </div>
                )}
                {c.changes.map(f => (
                  <div className="gcr-field" key={f.field}>
                    <span className="gcr-field-label">{f.label}</span>
                    <span className="gcr-values">
                      <span className="gcr-old">{f.from}</span>
                      <span className="gcr-arrow">→</span>
                      <span className="gcr-new">{f.to}</span>
                    </span>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
