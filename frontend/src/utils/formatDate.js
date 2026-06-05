export const formatDateTime = (value) => {
  if (!value) return 'Unknown date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const formatEmailDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday); startOfYesterday.setDate(startOfToday.getDate() - 1);
  const dayOfWeek = startOfToday.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const startOfWeek = new Date(startOfToday); startOfWeek.setDate(startOfToday.getDate() - daysToMonday);

  if (date >= startOfToday) {
    return new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit' }).format(date);
  }
  if (date >= startOfYesterday) {
    return 'Yesterday';
  }
  if (date >= startOfWeek) {
    return new Intl.DateTimeFormat('en', { weekday: 'short' }).format(date);
  }
  if (date.getFullYear() === now.getFullYear()) {
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);
  }
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const getDateGroupLabel = (value) => {
  if (!value) return 'Older';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Older';

  const now = new Date();
  const today = startOfDay(now);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);

  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - daysToMonday);

  const d = startOfDay(date);
  if (d >= today) return 'Today';
  if (d >= yesterday) return 'Yesterday';
  if (d >= weekStart) return 'This week';
  return 'Older';
};
