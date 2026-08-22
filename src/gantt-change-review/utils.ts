// Isolated helpers for the Gantt Change Review feature.
// Read-only: never mutates the data it receives.

export interface ReviewTask {
  id: number;
  name: string;
  start: Date | string;
  end: Date | string;
  progress?: number;
  parentId?: number | null;
  level?: number;
  resources?: string[];
  dependencies?: unknown[];
  [key: string]: unknown;
}

export function toISODate(value: unknown): string {
  const d = value instanceof Date ? value : new Date(String(value));
  if (isNaN(d.getTime())) return String(value ?? '');
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function prettyDate(value: unknown): string {
  const d = value instanceof Date ? value : new Date(String(value));
  if (isNaN(d.getTime())) return String(value ?? '');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Deep clone into plain JSON-friendly objects (dates -> ISO day strings). */
export function normalizeTasks(tasks: ReviewTask[]): Record<string, unknown>[] {
  return tasks.map(t => {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(t).sort()) {
      const v = (t as Record<string, unknown>)[key];
      if (v instanceof Date) out[key] = toISODate(v);
      else if (Array.isArray(v)) out[key] = JSON.parse(JSON.stringify(v));
      else if (v && typeof v === 'object') out[key] = JSON.parse(JSON.stringify(v));
      else out[key] = v;
    }
    return out;
  });
}

export function toJSONText(tasks: ReviewTask[]): string {
  return JSON.stringify(normalizeTasks(tasks), null, 2);
}

export interface FieldChange {
  field: string;
  label: string;
  from: string;
  to: string;
}

export interface TaskChange {
  id: number;
  name: string;
  status: 'modified' | 'added' | 'removed';
  changes: FieldChange[];
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Task Name',
  start: 'Start Date',
  end: 'End Date',
  progress: 'Progress',
  parentId: 'Parent Task',
  resources: 'Resources',
  dependencies: 'Dependencies',
  level: 'Level',
  expanded: 'Expanded',
};

function displayValue(field: string, value: unknown): string {
  if (field === 'start' || field === 'end') return prettyDate(value);
  if (field === 'progress') return `${value ?? 0}%`;
  if (Array.isArray(value)) return value.length ? JSON.stringify(value) : '—';
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

/** Only user-editable fields are considered a "change" in this view. */
const COMPARED_FIELDS = ['name', 'start', 'end'] as const;

function normalizeForCompare(field: string, value: unknown): string {
  if (field === 'start' || field === 'end') return toISODate(value);
  return String(value ?? '').trim();
}

export function computeTaskChanges(initial: ReviewTask[], current: ReviewTask[]): TaskChange[] {
  const initialMap = new Map(initial.map(t => [t.id, t]));
  const currentMap = new Map(current.map(t => [t.id, t]));
  const result: TaskChange[] = [];

  for (const cur of current) {
    const prev = initialMap.get(cur.id);
    if (!prev) {
      result.push({ id: cur.id, name: cur.name, status: 'added', changes: [] });
      continue;
    }
    const changes: FieldChange[] = [];
    for (const key of COMPARED_FIELDS) {
      const a = (prev as Record<string, unknown>)[key];
      const b = (cur as Record<string, unknown>)[key];
      if (normalizeForCompare(key, a) === normalizeForCompare(key, b)) continue;
      changes.push({
        field: key,
        label: FIELD_LABELS[key] ?? key,
        from: displayValue(key, a),
        to: displayValue(key, b),
      });
    }
    if (changes.length) {
      result.push({ id: cur.id, name: prev.name, status: 'modified', changes });
    }
  }


  for (const prev of initial) {
    if (!currentMap.has(prev.id)) {
      result.push({ id: prev.id, name: prev.name, status: 'removed', changes: [] });
    }
  }

  return result;
}

export type DiffKind = 'same' | 'added' | 'removed' | 'empty';
export interface DiffRow {
  left?: { num: number; text: string };
  right?: { num: number; text: string };
  leftKind: DiffKind;
  rightKind: DiffKind;
}

/** Simple LCS line diff — no external dependency. */
export function diffLines(leftText: string, rightText: string): DiffRow[] {
  const a = leftText.split('\n');
  const b = rightText.split('\n');
  const n = a.length, m = b.length;

  // LCS table (fine for these dataset sizes)
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const rows: DiffRow[] = [];
  let i = 0, j = 0;
  const pendingLeft: { num: number; text: string }[] = [];
  const pendingRight: { num: number; text: string }[] = [];

  const flush = () => {
    const len = Math.max(pendingLeft.length, pendingRight.length);
    for (let k = 0; k < len; k++) {
      rows.push({
        left: pendingLeft[k],
        right: pendingRight[k],
        leftKind: pendingLeft[k] ? 'removed' : 'empty',
        rightKind: pendingRight[k] ? 'added' : 'empty',
      });
    }
    pendingLeft.length = 0;
    pendingRight.length = 0;
  };

  while (i < n && j < m) {
    if (a[i] === b[j]) {
      flush();
      rows.push({
        left: { num: i + 1, text: a[i] },
        right: { num: j + 1, text: b[j] },
        leftKind: 'same',
        rightKind: 'same',
      });
      i++; j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      pendingLeft.push({ num: i + 1, text: a[i] }); i++;
    } else {
      pendingRight.push({ num: j + 1, text: b[j] }); j++;
    }
  }
  while (i < n) { pendingLeft.push({ num: i + 1, text: a[i] }); i++; }
  while (j < m) { pendingRight.push({ num: j + 1, text: b[j] }); j++; }
  flush();

  return rows;
}
