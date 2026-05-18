const dateTimeFormatter = new Intl.DateTimeFormat('ro-RO', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const dateFormatter = new Intl.DateTimeFormat('ro-RO', {
  dateStyle: 'medium',
});

const parseDate = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatDateTime = (value, fallback = 'Data necunoscuta') => {
  const date = parseDate(value);

  return date ? dateTimeFormatter.format(date) : fallback;
};

export const formatDate = (value, fallback = 'Data necunoscuta') => {
  const date = parseDate(value);

  return date ? dateFormatter.format(date) : fallback;
};

export default formatDateTime;
