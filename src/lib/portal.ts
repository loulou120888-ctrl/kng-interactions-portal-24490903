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
export function isAdmPlus(roles: Role[]): boolean {
  return roles.some((r) => ROLE_RANK[r] >= ROLE_RANK.adm);
}
export function isManager(roles: Role[]): boolean {
  return roles.includes("manager");
}

// Build 30-min slot times for a given local date — returns ISO strings (UTC).
export function buildDaySlots(date: Date): string[] {
  const slots: string[] = [];
  const londonDateStr = date.toLocaleDateString("sv-SE", { timeZone: "Europe/London" });
  const utcMidnight = new Date(`${londonDateStr}T00:00:00Z`);
  const londonTimeStr = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(utcMidnight);
  const [lh, lm] = londonTimeStr.split(":").map(Number);
  const londonMidnightMs = utcMidnight.getTime() - (lh * 60 + lm) * 60 * 1000;
  for (let i = 0; i < 48; i++) {
    slots.push(new Date(londonMidnightMs + i * 30 * 60 * 1000).toISOString());
  }
  return slots;
}

export function fmtSlot(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Europe/London" });
}

export function todayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}
