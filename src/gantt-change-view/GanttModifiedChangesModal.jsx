import { getModifiedGanttData, fieldLabel } from './getModifiedGanttData';
import './ganttModifiedChanges.css';

/** Read-only modal showing ONLY the current/modified values of changed tasks. */
export default function GanttModifiedChangesModal({ initialTasks, currentTasks, onClose }) {
  const { columns, rows } = getModifiedGanttData(initialTasks, currentTasks);

  return (
    <div className="gmc-overlay" onClick={onClose}>
      <div className="gmc-modal" onClick={e => e.stopPropagation()}>
        <div className="gmc-head">
          <h3 className="gmc-title">
            Modified Changes
            {rows.length > 0 && <span className="gmc-count">{rows.length} task(s)</span>}
          </h3>
          <button className="gmc-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {rows.length === 0 ? (
          <div className="gmc-empty">No modified changes found.</div>
        ) : (
          <div className="gmc-body">
            <table className="gmc-table">
              <thead>
                <tr>
                  <th>Task ID</th>
                  {columns.map(col => <th key={col}>{fieldLabel(col)}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id}>
                    <td className="gmc-id">
                      {row.id}
                      {row.isNew && <span className="gmc-new-tag">NEW</span>}
                    </td>
                    {columns.map(col => (
                      <td key={col}>
                        {row.values[col] !== undefined
                          ? row.values[col]
                          : <span className="gmc-empty-cell">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
