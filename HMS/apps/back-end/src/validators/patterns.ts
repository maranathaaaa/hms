export const MONEY_PATTERN = /^\d{1,8}(\.\d{1,2})?$/;
export const ISO_DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

export const MONEY_MESSAGE =
	"Must be a non-negative amount with up to 2 decimal places";
export const ISO_DATE_MESSAGE = "Must be a valid date (YYYY-MM-DD)";
export const TIME_MESSAGE = "Must be a valid time (HH:MM or HH:MM:SS)";

const toMinutes = (time: string): number => {
	const [hours, minutes] = time.split(":").map(Number);
	return (hours ?? 0) * 60 + (minutes ?? 0);
};

export const timeOrderGuard = <
	T extends { startTime?: string; endTime?: string },
>(
	value: T,
): boolean =>
	value.startTime === undefined ||
	value.endTime === undefined ||
	toMinutes(value.startTime) < toMinutes(value.endTime);

export const paidNotOverTotalGuard = <
	T extends { totalAmount?: string; amountPaid?: string },
>(
	value: T,
): boolean =>
	value.amountPaid === undefined ||
	value.totalAmount === undefined ||
	Number(value.amountPaid) <= Number(value.totalAmount);
