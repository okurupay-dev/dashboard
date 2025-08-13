export interface Location {
  id: string;
  name: string;
}

export interface Terminal {
  id: string;
  name: string;
  locationId: string;
  status: 'online' | 'offline';
  lastCheckIn: string;
  version: string;
  lastUser: string;
  transactionsLast24h: number;
  errors: number;
}

export interface NetworkStatus {
  status: 'online' | 'degraded' | 'offline';
  lastUpdated: string;
}

export interface TerminalHealth {
  uptime: number;
  firmwareVersion: string;
  battery?: number;
  ip: string;
  lastHeartbeat: string;
}

export interface LiveSession {
  staffName: string | null;
  startedAt: string | null;
  idleTime: number | null;
  lockState: 'locked' | 'unlocked' | null;
}

export interface CurrentTransaction {
  state: 'idle' | 'awaiting_payment' | 'detected' | 'confirming' | 'confirmed' | 'expired' | 'failed';
  fiatAmount?: number;
  fiatCurrency?: string;
  cryptoAmount?: number;
  cryptoCurrency?: string;
  chain?: string;
  txHash?: string;
  confirmations?: number;
  requiredConfirmations?: number;
}

export interface ActivityLog {
  timestamp: string;
  action: string;
  user: string;
  result: 'success' | 'failure';
  details?: string;
}

export interface TerminalDetails {
  id: string;
  name: string;
  pairingCode: string;
  walletMapping: Record<string, string>;
  health: TerminalHealth;
  liveSession: LiveSession;
  currentTransaction: CurrentTransaction;
  recentActivity: ActivityLog[];
}

export interface TerminalStats {
  onlineCount: number;
  offlineCount: number;
  confirmedTransactions: number;
  pendingTransactions: number;
  averageConfirmationTimes: Record<string, number>; // chain -> avg time in minutes
}
