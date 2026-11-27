export type HealthStatus = 'Healthy' | 'Degraded' | 'Unhealthy';

export interface HealthCheckEntry {
  name: string;
  status: HealthStatus;
  durationMs: number;
  description: string | null;
  error: string | null;
  data?: Record<string, unknown> | null;
}

export interface HealthReport {
  status: HealthStatus;
  totalDurationMs: number;
  timestampUtc: string;
  checks: HealthCheckEntry[];
}
