import type {
  AuthUser,
  BscResponse,
  DayInfo,
  FilterOptions,
  FilterSelection,
  HierarchyGroup,
  HierarchySectionKey,
} from "@/types";

/** El backend exige cookie httpOnly (JWT) en todos los endpoints salvo /api/login; el
 * navegador la adjunta automáticamente en same-origin (el proxy de Vite hace /api ->
 * localhost:3001 same-origin), así que no hace falta `credentials: "include"` en dev. */

function buildQuery(selection: Partial<FilterSelection>, extra?: Record<string, string>): string {
  const params = new URLSearchParams(extra);
  Object.entries(selection).forEach(([key, values]) => {
    (values ?? []).forEach((v) => params.append(key, v));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? res.statusText);
  }
  return res.json();
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function fetchDays(): Promise<DayInfo[]> {
  return json(await fetch("/api/days"));
}

export async function fetchFilters(
  selection: Partial<FilterSelection> = {}
): Promise<FilterOptions> {
  return json(await fetch(`/api/filters${buildQuery(selection)}`));
}

export async function fetchBsc(
  selection: Partial<FilterSelection> = {},
  day?: string
): Promise<BscResponse> {
  const qs = buildQuery(selection, day ? { day } : undefined);
  return json(await fetch(`/api/bsc${qs}`));
}

export async function fetchHierarchy(
  day: string,
  level: "area" | "district" | "store",
  section: HierarchySectionKey,
  selection: Partial<FilterSelection> = {}
): Promise<HierarchyGroup[]> {
  const qs = buildQuery(selection, { day, level, section });
  return json(await fetch(`/api/hierarchy${qs}`));
}

export async function postRefresh(): Promise<void> {
  await fetch("/api/refresh", { method: "POST" });
}

export async function login(username: string, password: string): Promise<AuthUser> {
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return json(res);
}

export async function logout(): Promise<void> {
  await fetch("/api/logout", { method: "POST" });
}

export async function fetchMe(): Promise<AuthUser> {
  return json(await fetch("/api/me"));
}
