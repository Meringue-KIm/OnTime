export function formatApptTime(isoStr: string): string {
  const d = new Date(isoStr);
  const hour = d.getHours();
  const min = String(d.getMinutes()).padStart(2, '0');
  const ampm = hour < 12 ? 'AM' : 'PM';
  const h = String(hour % 12 || 12).padStart(2, '0');
  return `${h}:${min} ${ampm}`;
}

export function formatKoreanDateTime(isoStr: string): string {
  const d = new Date(isoStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hour = d.getHours();
  const min = String(d.getMinutes()).padStart(2, '0');
  const ampm = hour < 12 ? '오전' : '오후';
  const displayHour = hour % 12 || 12;
  return `${month}/${day} ${ampm} ${displayHour}:${min}`;
}

export function extractTimeHHmm(timeStr: string): string {
  return timeStr.substring(0, 5);
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`;
}
