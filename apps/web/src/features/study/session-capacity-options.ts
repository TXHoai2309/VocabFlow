export const SESSION_CAPACITIES = [5, 10, 20, 30] as const;
export type SessionCapacity = (typeof SESSION_CAPACITIES)[number];
