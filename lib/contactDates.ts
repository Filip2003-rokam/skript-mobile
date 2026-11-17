const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateString(value: string): boolean {
  if (!DATE_REGEX.test(value.trim())) return false;
  const [year, month, day] = value.trim().split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function formatDateToIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseIsoDate(value: string): Date | null {
  if (!isValidDateString(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function toDisplayDate(iso: string | null): string {
  const date = iso ? parseIsoDate(iso) : null;
  if (!date) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${date.getFullYear()}`;
}

export function fromDisplayDate(value: string): string | null {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const iso = `${match[3]}-${match[2]}-${match[1]}`;
  return isValidDateString(iso) ? iso : null;
}

// 9:00 po vremenu telefona. Null ako je taj trenutak već prošao ili datum nije ispravan.
export function followUpAtNine(iso: string | null, now = new Date()): Date | null {
  if (!iso) return null;
  const day = parseIsoDate(iso);
  if (!day) return null;
  const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9, 0, 0, 0);
  return at.getTime() > now.getTime() ? at : null;
}

export function followUpIsDue(iso: string | null, done: boolean, today = new Date()): boolean {
  if (done || !iso) return false;
  const date = parseIsoDate(iso);
  if (!date) return false;
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return date.getTime() <= end.getTime();
}
