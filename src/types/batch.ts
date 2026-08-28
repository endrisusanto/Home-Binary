export type ItemStatus = 'pending' | 'running' | 'success' | 'failed';

export interface BatchItem {
  id: string;
  index: number;
  buildId?: string;
  buildFingerprintName: string;
  pdaVersion: string;
  cscVersion: string;
  basebandVersion: string;
  status: ItemStatus;
  progressPercent?: number;
  message?: string;
  error?: string;
  timestamp?: string;
}

export interface PortalConfig {
  baseUrl: string;
  formUrl: string;
  headless: boolean;
  delayMs: number;
  timeoutMs: number;
  mock: boolean;
  trackProgress?: boolean;
  fetchOnly?: boolean;
  concurrency?: number;
  username?: string;
  password?: string;
  ssoToken?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  index?: number;
}

export interface BatchSummary {
  total: number;
  pending: number;
  running: number;
  success: number;
  failed: number;
  progressPercent: number;
  activeBuildName?: string;
}
