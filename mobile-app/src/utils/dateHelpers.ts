// Date utility functions for the mobile app

export const formatDate = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const formatDateForAPI = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export const getDayOfWeek = (date: Date): string => {
  return date.toLocaleDateString('en-US', {weekday: 'long'}).toLowerCase();
};

export const isToday = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

export const isFriday = (date: Date): boolean => {
  return date.getDay() === 5; // Friday is day 5 (0 = Sunday)
};

export const getMonthName = (date: Date): string => {
  return date.toLocaleDateString('en-US', {month: 'long'});
};

export const getDateRange = (fromDate: Date, toDate: Date): number => {
  const timeDiff = toDate.getTime() - fromDate.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
};

export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const subtractDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
};