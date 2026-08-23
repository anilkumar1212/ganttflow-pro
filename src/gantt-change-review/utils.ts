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
  /** Normalized display values for every business field (for full-row context). */
  before: Record<string, string>;
  after: Record<string, string>;
}

export const FIELD_LABELS: Record<string, string> = {
  name: 'Task Name',
  type: 'Type',
  start: 'Start Date',
  end: 'End Date',
  duration: 'Duration',
  progress: 'Progress',
  parentId: 'Parent',
  resources: 'Resources',
  dependencies: 'Dependency',
  level: 'Level',
  milestone: 'Milestone',
};

/** Purely internal / UI-state properties that are never user data. */
const IGNORED_FIELDS = new Set([
  'expanded',
  'hasChildren',
  'visible',
  'selected',
  'index',
  'styles',
  'isDisabled',
  'hideChildren',
  'displayOrder',
  'barChildren',
  'x1', 'x2', 'y', 'height', 'width',
  'earlyStart', 'earlyFinish', 'lateStart', 'lateFinish', 'slack', 'isCritical',
]);

function isInternalKey(key: string): boolean {
  return key.startsWith('_') || IGNORED_FIELDS.has(key);
}

function depToString(d: unknown): string {
  if (d && typeof d === 'object') {
    const o = d as Record<string, unknown>;
    if ('predecessorId' in o) {
      const lag = Number(o.lag ?? 0);
      const lagStr = lag > 0 ? `+${lag}d` : lag < 0 ? `${lag}d` : '';
      return `${o.predecessorId}${o.type ?? 'FS'}${lagStr}`;
    }
    return JSON.stringify(o);
  }
  return String(d ?? '');
}

/** Order-insensitive, reference-insensitive normalization of any value. */
function normalizeValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  if (field === 'start' || field === 'end' || value instanceof Date) return toISODate(value);
  if (Array.isArray(value)) {
    const items = value.map(v =>
      v && typeof v === 'object' ? depToString(v) : String(v ?? '')
    );
    return items.slice().sort().join('|');
  }
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    return Object.keys(o).sort().map(k => `${k}=${normalizeValue(k, o[k])}`).join('|');
  }
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value).trim();
}

export function displayField(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (field === 'start' || field === 'end' || value instanceof Date) return prettyDate(value);
  if (field === 'progress') return `${value}%`;
  if (field === 'duration') return `${value} d`;
  if (Array.isArray(value)) {
    if (!value.length) return '—';
    return value.map(depToString).join(', ');
  }
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function daysBetween(start: unknown, end: unknown): number | null {
  const a = start instanceof Date ? start : new Date(String(start));
  const b = end instanceof Date ? end : new Date(String(end));
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return null;
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000));
}

/** Business data view of a task: real fields + derived duration. */
function businessFields(task: ReviewTask): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(task)) {
    if (key === 'id' || isInternalKey(key)) continue;
    out[key] = (task as Record<string, unknown>)[key];
  }
  const dur = daysBetween(task.start, task.end);
  if (dur !== null) out.duration = dur;
  return out;
}

const FIELD_ORDER = [
  'name', 'type', 'start', 'end', 'duration', 'dependencies',
  'progress', 'resources', 'parentId', 'level', 'milestone',
];

export function sortFields(fields: string[]): string[] {
  return fields.slice().sort((a, b) => {
    const ia = FIELD_ORDER.indexOf(a);
    const ib = FIELD_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

function displayRecord(fields: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of Object.keys(fields)) out[k] = displayField(k, fields[k]);
  return out;
}

export function computeTaskChanges(initial: ReviewTask[], current: ReviewTask[]): TaskChange[] {
  const initialMap = new Map(initial.map(t => [t.id, t]));
  const currentMap = new Map(current.map(t => [t.id, t]));
  const result: TaskChange[] = [];

  for (const cur of current) {
    const prev = initialMap.get(cur.id);
    const curFields = businessFields(cur);
    if (!prev) {
      result.push({
        id: cur.id,
        name: cur.name,
        status: 'added',
        changes: [],
        before: {},
        after: displayRecord(curFields),
      });
      continue;
    }
    const prevFields = businessFields(prev);
    const changes: FieldChange[] = [];
    const keys = sortFields(Array.from(new Set([...Object.keys(prevFields), ...Object.keys(curFields)])));
    for (const key of keys) {
      const a = prevFields[key];
      const b = curFields[key];
      if (normalizeValue(key, a) === normalizeValue(key, b)) continue;
      changes.push({
        field: key,
        label: FIELD_LABELS[key] ?? key,
        from: displayField(key, a),
        to: displayField(key, b),
      });
    }
    if (changes.length) {
      result.push({
        id: cur.id,
        name: prev.name,
        status: 'modified',
        changes,
        before: displayRecord(prevFields),
        after: displayRecord(curFields),
      });
    }
  }

  for (const prev of initial) {
    if (!currentMap.has(prev.id)) {
      result.push({
        id: prev.id,
        name: prev.name,
        status: 'removed',
        changes: [],
        before: displayRecord(businessFields(prev)),
        after: {},
      });
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
