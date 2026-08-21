import { useRef, useState } from 'react';
import './change-review.css';
import { ReviewTask } from './utils';
import { ChangeSummaryModal } from './ChangeSummaryModal';
import { JsonDiffModal } from './JsonDiffModal';

interface Props {
  /** Current (live) Gantt tasks — read only, never mutated. */
  tasks: ReviewTask[];
}

/**
 * Isolated, read-only change-review surface.
 * Captures the first tasks array it ever receives as the immutable initial snapshot.
 */
export function GanttChangeReview({ tasks }: Props) {
  const initialRef = useRef<ReviewTask[] | null>(null);
  if (initialRef.current === null && tasks) {
    initialRef.current = JSON.parse(JSON.stringify(tasks, (_k, v) => v)) as ReviewTask[];
  }
  const initialTasks = initialRef.current ?? [];

  const [openSummary, setOpenSummary] = useState(false);
  const [openDiff, setOpenDiff] = useState(false);

  return (
    <div className="gcr-actions">
      <button className="gcr-btn gcr-btn-primary" onClick={() => setOpenSummary(true)}>
        View My Changes
      </button>
      <button className="gcr-btn" onClick={() => setOpenDiff(true)}>
        Compare Gantt JSON
      </button>

      {openSummary && (
        <ChangeSummaryModal
          initialTasks={initialTasks}
          currentTasks={tasks}
          onClose={() => setOpenSummary(false)}
        />
      )}
      {openDiff && (
        <JsonDiffModal
          initialTasks={initialTasks}
          currentTasks={tasks}
          onClose={() => setOpenDiff(false)}
        />
      )}
    </div>
  );
}
