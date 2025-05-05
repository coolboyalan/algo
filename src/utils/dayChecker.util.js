export function isMondayOrFridayInIST() {
  // Get current time in UTC
  const now = new Date();

  // Convert to IST by adding 5.5 hours (19800 seconds)
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffsetMs);

  // Get day: 0 = Sunday, 1 = Monday, ..., 5 = Friday
  const day = istDate.getUTCDay();

  // Check if it's Monday (1) or Friday (5)
  return day === 1 || day === 5;
}

export function isWorkingDay() {
  // Get current time in UTC
  const now = new Date();

  // Convert to IST by adding 5.5 hours (19800 seconds)
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffsetMs);

  // Get day: 0 = Sunday, 1 = Monday, ..., 5 = Friday
  const day = istDate.getUTCDay();

  return day !== 0 && day !== 7;
}

export function getISTMidnightFakeUTCString() {
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;

  // Get IST time
  const istNow = new Date(now.getTime() + istOffsetMs);

  // Get IST date parts
  const year = istNow.getUTCFullYear();
  const month = String(istNow.getUTCMonth() + 1).padStart(2, "0");
  const day = String(istNow.getUTCDate()).padStart(2, "0");

  // Return the ISO string as if IST midnight is UTC midnight
  return `${year}-${month}-${day}T00:00:00.000Z`;
}
