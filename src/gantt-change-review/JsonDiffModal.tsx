import { useMemo } from 'react';
import { ReviewTask, toJSONText, diffLines } from './utils';

interface Props {
  initialTasks: ReviewTask[];
  currentTasks: ReviewTask[];
  onClose: () => void;
}

export function JsonDiffModal({ initialTasks, currentTasks, onClose }: Props) {
  const rows = useMemo(
    () => diffLines(toJSONText(initialTasks), toJSONText(currentTasks)),
    [initialTasks, currentTasks],
  );
  const changed = rows.filter(r => r.leftKind !== 'same' || r.rightKind !== 'same').length;

  return (
    <div className="gcr-overlay" onMouseDown={onClose}>
      <div className="gcr-modal gcr-modal-wide" onMouseDown={e => e.stopPropagation()}>
        <div className="gcr-modal-header">
          <div>
            <h2 className="gcr-modal-title">Compare Gantt JSON</h2>
            <div className="gcr-modal-sub">
              {changed === 0 ? 'No differences found' : `${changed} differing line${changed === 1 ? '' : 's'}`}
            </div>
          </div>
          <button className="gcr-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="gcr-diff-head">
          <div>Initial Gantt JSON</div>
          <div>Current Gantt JSON</div>
        </div>

        <div className="gcr-diff-body gantt-scrollbar">
          <table className="gcr-diff-table">
            <colgroup>
              <col style={{ width: 46 }} />
              <col style={{ width: '50%' }} />
              <col style={{ width: 46 }} />
              <col />
            </colgroup>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="gcr-num">{r.left?.num ?? ''}</td>
                  <td className={`gcr-code gcr-line-${r.leftKind}`}>{r.left?.text ?? ''}</td>
                  <td className="gcr-num gcr-pane-split">{r.right?.num ?? ''}</td>
                  <td className={`gcr-code gcr-line-${r.rightKind}`}>{r.right?.text ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="gcr-legend">
          <span><span className="gcr-swatch" style={{ background: '#ffeef0' }} />Removed / old</span>
          <span><span className="gcr-swatch" style={{ background: '#e6ffed' }} />Added / new</span>
          <span><span className="gcr-swatch" style={{ background: '#fff', border: '1px solid #e5e7eb' }} />Unchanged</span>
        </div>
      </div>
    </div>
  );
}
