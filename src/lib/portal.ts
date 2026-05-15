// Shared portal constants & helpers
export type Role = "member" | "sld" | "ld" | "aux" | "adm" | "manager";
export type Department = "events" | "parties" | "entertainment";
export type ScheduleType = "events_parties" | "entertainment";

export const ROLE_LABEL: Record<Role, string> = {
  member: "Member",
  sld: "S.LD",
  ld: "LD",
  aux: "AUX",
  adm: "ADM",
  manager: "Manager",
};

export const ROLE_RANK: Record<Role, number> = {
  member: 1, sld: 2, ld: 3, aux: 4, adm: 5, manager: 6,
};

export const ALL_ROLES: Role[] = ["member", "sld", "ld", "aux", "adm", "manager"];

export const DEPARTMENTS: Department[] = ["events", "parties", "entertainment"];

export const DEPT_LABEL: Record<Department, string> = {
  events: "Events",
  parties: "Parties",
  entertainment: "Entertainment",
};

// Tailwind helper classes per department (using arbitrary values from CSS vars)
export const DEPT_BG: Record<Department, string> = {
  events: "bg-[oklch(0.55_0.22_305)]",
  parties: "bg-[oklch(0.7_0.22_350)]",
  entertainment: "bg-[oklch(0.72_0.16_210)]",
};
export const DEPT_TEXT: Record<Department, string> = {
  events: "text-[oklch(0.78_0.18_305)]",
  parties: "text-[oklch(0.82_0.18_350)]",
  entertainment: "text-[oklch(0.85_0.14_210)]",
};
export const DEPT_BORDER: Record<Department, string> = {
  events: "border-[oklch(0.55_0.22_305)]",
  parties: "border-[oklch(0.7_0.22_350)]",
  entertainment: "border-[oklch(0.72_0.16_210)]",
};
export const DEPT_RING: Record<Department, string> = {
  events: "ring-[oklch(0.55_0.22_305_/_0.4)]",
  parties: "ring-[oklch(0.7_0.22_350_/_0.4)]",
  entertainment: "ring-[oklch(0.72_0.16_210_/_0.4)]",
};

export function topRole(roles: Role[] | undefined): Role {
  if (!roles || roles.length === 0) return "member";
  return roles.slice().sort((a, b) => ROLE_RANK[b] - ROLE_RANK[a])[0];
}

export function isAuxPlus(roles: Role[]): boolean {
  return roles.some((r) => ROLE_RANK[r] >= ROLE_RANK.aux);
}
export function isManager(roles: Role[]): boolean {
  return roles.includes("manager");
}

// Build 30-min slot times for a given local date — returns ISO strings (UTC).
export function buildDaySlots(date: Date): string[] {
  const slots: string[] = [];
  const base = new Date(date);
  base.setHours(0, 0, 0, 0);
  for (let i = 0; i < 48; i++) {
    const t = new Date(base.getTime() + i * 30 * 60 * 1000);
    slots.push(t.toISOString());
  }
  return slots;
}

export function fmtSlot(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Europe/London",
  });
}

export function todayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}
