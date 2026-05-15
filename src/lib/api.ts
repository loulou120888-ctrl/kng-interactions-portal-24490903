async function apiFetch<T = any>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    credentials: "include",
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? res.statusText);
  }
  return res.json();
}

export const api = {
  auth: {
    me: () => apiFetch<{ user: { id: string; displayName: string; username: string } | null }>("/auth/me"),
    login: (username: string, password: string) =>
      apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
    signup: (data: { username: string; password: string; display_name: string; signup_code?: string }) =>
      apiFetch("/auth/signup", { method: "POST", body: JSON.stringify(data) }),
    logout: () => apiFetch("/auth/logout", { method: "POST" }),
    validateCode: (code: string) => apiFetch<{ valid: boolean; reason?: string; role?: string; department?: string }>(`/auth/validate-code/${code}`),
  },

  profiles: {
    list: () => apiFetch<any[]>("/profiles"),
    me: () => apiFetch<any>("/profiles/me"),
    get: (id: string) => apiFetch<any>(`/profiles/${id}`),
    batch: (ids: string[]) => apiFetch<any[]>("/profiles/batch", { method: "POST", body: JSON.stringify({ ids }) }),
    update: (id: string, patch: any) =>
      apiFetch(`/profiles/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  },

  roles: {
    list: () => apiFetch<any[]>("/roles"),
    me: () => apiFetch<any[]>("/roles/me"),
    forUser: (userId: string) => apiFetch<any[]>(`/roles/${userId}`),
    setRole: (userId: string, role: string) =>
      apiFetch(`/roles/${userId}`, { method: "PUT", body: JSON.stringify({ role }) }),
  },

  signupCodes: {
    list: () => apiFetch<any[]>("/signup-codes"),
    create: (data: { code: string; role: string; department?: string | null }) =>
      apiFetch("/signup-codes", { method: "POST", body: JSON.stringify(data) }),
    revoke: (id: string) => apiFetch(`/signup-codes/${id}/revoke`, { method: "PATCH" }),
  },

  interactions: {
    list: (params?: { q?: string; poster_only?: boolean; limit?: number; author_id?: string }) => {
      const sp = new URLSearchParams();
      if (params?.q) sp.set("q", params.q);
      if (params?.poster_only) sp.set("poster_only", "true");
      if (params?.limit) sp.set("limit", String(params.limit));
      if (params?.author_id) sp.set("author_id", params.author_id);
      return apiFetch<any[]>(`/interactions?${sp}`);
    },
    create: (data: any) =>
      apiFetch("/interactions", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: string) => apiFetch(`/interactions/${id}`, { method: "DELETE" }),
  },

  schedule: {
    list: (schedule_type: string, day_start: string, day_end: string) =>
      apiFetch<any[]>(`/schedule?schedule_type=${schedule_type}&day_start=${encodeURIComponent(day_start)}&day_end=${encodeURIComponent(day_end)}`),
    stats: (day_start: string) => apiFetch<{ count: number }>(`/schedule/stats?day_start=${encodeURIComponent(day_start)}`),
    performance: (since: string) => apiFetch<any[]>(`/schedule/performance?since=${encodeURIComponent(since)}`),
    create: (data: any) => apiFetch("/schedule", { method: "POST", body: JSON.stringify(data) }),
    bulk: (slots: any[]) => apiFetch("/schedule/bulk", { method: "POST", body: JSON.stringify({ slots }) }),
    update: (id: string, patch: any) => apiFetch(`/schedule/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
    delete: (id: string) => apiFetch(`/schedule/${id}`, { method: "DELETE" }),
  },

  announcements: {
    list: () => apiFetch<any[]>("/announcements"),
    create: (data: { title: string; body: string }) =>
      apiFetch("/announcements", { method: "POST", body: JSON.stringify(data) }),
    reads: () => apiFetch<any[]>("/announcements/reads"),
    markRead: (id: string) => apiFetch(`/announcements/${id}/read`, { method: "POST" }),
    readers: (id: string) => apiFetch<any[]>(`/announcements/${id}/readers`),
  },

  prizes: {
    list: () => apiFetch<any[]>("/prizes"),
    create: (data: { code: string; name: string; default_quantity: number }) =>
      apiFetch("/prizes", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: string) => apiFetch(`/prizes/${id}`, { method: "DELETE" }),
  },

  winners: {
    pending: () => apiFetch<any[]>("/winners/pending"),
    comp: (id: string) => apiFetch(`/winners/${id}/comp`, { method: "PATCH" }),
  },

  points: {
    list: (params?: { since?: string; user_id?: string }) => {
      const sp = new URLSearchParams();
      if (params?.since) sp.set("since", params.since);
      if (params?.user_id) sp.set("user_id", params.user_id);
      return apiFetch<any[]>(`/points?${sp}`);
    },
    me: () => apiFetch<{ total: number; entries: any[] }>("/points/me"),
  },

  hall: {
    list: () => apiFetch<any[]>("/hall"),
    create: (data: any) => apiFetch("/hall", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: string) => apiFetch(`/hall/${id}`, { method: "DELETE" }),
    frames: () => apiFetch<any[]>("/hall/frames"),
    createFrame: (data: any) => apiFetch("/hall/frames", { method: "POST", body: JSON.stringify(data) }),
    deleteFrame: (id: string) => apiFetch(`/hall/frames/${id}`, { method: "DELETE" }),
  },

  uploads: {
    upload: async (bucket: string, file: File): Promise<{ public_url: string; path: string }> => {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/uploads/${bucket}`, {
        method: "POST",
        body: form,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error ?? "Upload failed");
      }
      return res.json();
    },
    uploadBlob: async (bucket: string, blob: Blob, filename: string): Promise<{ public_url: string; path: string }> => {
      const form = new FormData();
      form.append("file", blob, filename);
      const res = await fetch(`/api/uploads/${bucket}`, {
        method: "POST",
        body: form,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error ?? "Upload failed");
      }
      return res.json();
    },
  },
};
