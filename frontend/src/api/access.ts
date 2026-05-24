import { apiClient } from "./client";

export interface AccessRevocation {
  address: string;
  role: string;
  reason: string;
  revokedBy: string;
  active: boolean;
  createdAt: string;
}

export const accessApi = {
  list: (active?: boolean) => {
    const qs = active === undefined ? "" : `?active=${active ? "true" : "false"}`;
    return apiClient.get<any>(`/access${qs}`);
  },

  revoke: (body: { address: string; role?: string; reason?: string; revokedBy: string }) =>
    apiClient.post<any>("/access/revoke", body),

  restore: (body: { address: string; restoredBy: string }) =>
    apiClient.post<any>("/access/restore", body),
};

