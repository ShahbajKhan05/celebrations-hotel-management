export type BookingRecord = {
  id: string;
  guest: string;
  phone: string;
  room: string;
  checkIn: string;
  checkOut: string;
  status: string;
};

const INACTIVE_STATUSES = [
  "cancelled",
  "canceled",
  "checked out",
  "checked-out",
  "completed",
  "checkedout",
];

function dateToTimestamp(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date.getTime();
}

export function validateBooking(
  newBooking: BookingRecord,
  existingBookings: BookingRecord[],
): string | null {
  const checkIn = dateToTimestamp(newBooking.checkIn);
  const checkOut = dateToTimestamp(newBooking.checkOut);

  if (!newBooking.guest.trim()) {
    return "Guest name is required.";
  }

  if (!newBooking.room.trim()) {
    return "Please select a room.";
  }

  if (checkIn === null || checkOut === null) {
    return "Please enter valid check-in and check-out dates.";
  }

  if (checkOut <= checkIn) {
    return "Check-out must be after check-in.";
  }

  const conflict = existingBookings.find((booking) => {
    // Editing an existing booking: don't compare it with itself.
    if (booking.id === newBooking.id) return false;

    const status = String(booking.status ?? "")
      .trim()
      .toLowerCase();

    if (INACTIVE_STATUSES.includes(status)) return false;

    if (String(booking.room) !== String(newBooking.room)) {
      return false;
    }

    const existingIn = dateToTimestamp(booking.checkIn);
    const existingOut = dateToTimestamp(booking.checkOut);

    if (existingIn === null || existingOut === null) {
      // Invalid existing dates shouldn't silently block valid bookings.
      return false;
    }

    // Overlap exists only if the date ranges intersect.
    return checkIn < existingOut && checkOut > existingIn;
  });

  if (conflict) {
    return `Room ${newBooking.room} is already booked from ${conflict.checkIn} to ${conflict.checkOut}. Please choose another room or dates.`;
  }

  return null;
}