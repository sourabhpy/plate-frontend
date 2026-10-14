const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface ApiOptions extends RequestInit {
  workspaceId?: string;
}

export async function apiRequest<T = any>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;
  const headers = new Headers(options.headers || {});

  // Add auth token if available in localStorage
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("plate_access_token");
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const activeWorkspaceId = options.workspaceId || localStorage.getItem("plate_active_workspace_id");
    if (activeWorkspaceId && !headers.has("X-Workspace-ID")) {
      headers.set("X-Workspace-ID", activeWorkspaceId);
    }
  }

  // Set JSON content-type if body is an object and not FormData
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle Token Expiry & Automatic Refresh
  if (response.status === 401 && typeof window !== "undefined") {
    const refreshToken = localStorage.getItem("plate_refresh_token");
    if (refreshToken && !endpoint.includes("/api/auth/refresh/")) {
      try {
        const refreshRes = await fetch(`${API_BASE}/api/auth/refresh/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh: refreshToken }),
        });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          localStorage.setItem("plate_access_token", refreshData.access);
          headers.set("Authorization", `Bearer ${refreshData.access}`);
          // Retry original request
          response = await fetch(url, { ...options, headers });
        } else {
          // Token expired or invalid
          localStorage.removeItem("plate_access_token");
          localStorage.removeItem("plate_refresh_token");
        }
      } catch (err) {
        console.error("Token refresh failed", err);
      }
    }
  }

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: response.statusText };
    }
    const error: any = new Error(errorData.error || errorData.detail || "API request failed");
    error.status = response.status;
    error.data = errorData;
    throw error;
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
