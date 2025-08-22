import { supabase } from '../supabase/client';
import { Terminal, TerminalDetails, TerminalStats, Location } from '../../components/terminals/types';

export interface DatabaseTerminal {
  terminal_id: string;
  merchant_id: string;
  location_id: string | null;
  name: string;
  pairing_code: string | null;
  status: string;
  firmware_version: string | null;
  ip_address: string | null;
  last_heartbeat: string | null;
  last_seen: string | null;
  paired_at: string | null;
  created_at: string;
  updated_at: string;
  api_key: string | null;
  blockchain_registered: boolean;
  registration_tx: string | null;
  device_type: 'physical' | 'virtual';
  hardware_info: any;
  // Location data (joined)
  location_name?: string;
  // Virtual terminal data (joined)
  virtual_terminal_enabled?: boolean;
}

export interface DatabaseTransaction {
  transaction_id: string;
  terminal_id: string;
  staff_user_id: string | null;
  amount_fiat: number;
  fiat_currency: string;
  amount_crypto: number;
  crypto_currency: string;
  blockchain: string;
  tx_hash: string | null;
  status: string;
  confirmations: number;
  required_confirmations: number;
  created_at: string;
  updated_at: string;
  processed_by_user_id: string | null;
  // User data (joined)
  staff_name?: string;
  processed_by_name?: string;
}

export class TerminalService {
  private static instance: TerminalService;

  public static getInstance(): TerminalService {
    if (!TerminalService.instance) {
      TerminalService.instance = new TerminalService();
    }
    return TerminalService.instance;
  }

  /**
   * Fetch all terminals for a merchant (both physical and virtual)
   */
  async getTerminals(merchantId: string): Promise<Terminal[]> {
    try {
      const { data: terminals, error } = await supabase
        .from('terminals')
        .select(`
          terminal_id,
          merchant_id,
          location_id,
          name,
          pairing_code,
          status,
          firmware_version,
          ip_address,
          last_heartbeat,
          last_seen,
          paired_at,
          created_at,
          updated_at,
          api_key,
          blockchain_registered,
          registration_tx,
          device_type,
          hardware_info,
          locations!terminals_location_id_fkey (
            location_id,
            name
          ),
          merchants!terminals_merchant_id_fkey (
            virtual_terminal_enabled
          )
        `)
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching terminals:', error);
        throw error;
      }

      if (!terminals) {
        return [];
      }

      // Get transaction counts for each terminal (last 24 hours)
      const terminalIds = terminals.map(t => t.terminal_id);
      const { data: transactionCounts } = await this.getTerminalTransactionCounts(terminalIds);

      // Get recent user activity for each terminal
      const { data: recentUsers } = await this.getTerminalRecentUsers(terminalIds);

      return terminals.map(terminal => this.mapDatabaseTerminalToTerminal(
        terminal, 
        transactionCounts?.find(tc => tc.terminal_id === terminal.terminal_id),
        recentUsers?.find(ru => ru.terminal_id === terminal.terminal_id)
      ));
    } catch (error) {
      console.error('Error in getTerminals:', error);
      throw error;
    }
  }


  /**
   * Get all locations for a merchant
   */
  async getLocations(merchantId: string): Promise<Location[]> {
    try {
      const { data: locations, error } = await supabase
        .from('locations')
        .select('location_id, name')
        .eq('merchant_id', merchantId)
        .order('name');

      if (error) {
        console.error('Error fetching locations:', error);
        throw error;
      }

      if (!locations) {
        return [];
      }

      return locations.map(location => ({
        id: location.location_id,
        name: location.name
      }));
    } catch (error) {
      console.error('Error in getLocations:', error);
      throw error;
    }
  }


  /**
   * Get terminals by location
   */
  async getTerminalsByLocation(merchantId: string, locationId: string): Promise<Terminal[]> {
    const allTerminals = await this.getTerminals(merchantId);
    return allTerminals.filter(terminal => terminal.locationId === locationId);
  }

  /**
   * Get terminal details by ID
   */
  async getTerminalDetails(terminalId: string): Promise<TerminalDetails | null> {
    try {
      const { data: terminal, error } = await supabase
        .from('terminals')
        .select(`
          terminal_id,
          merchant_id,
          location_id,
          name,
          pairing_code,
          status,
          firmware_version,
          ip_address,
          last_heartbeat,
          last_seen,
          device_type,
          hardware_info,
          merchants!terminals_merchant_id_fkey (
            virtual_terminal_enabled
          )
        `)
        .eq('terminal_id', terminalId)
        .single();

      if (error || !terminal) {
        console.error('Error fetching terminal details:', error);
        return null;
      }

      // Get wallet addresses for this terminal
      const { data: walletAddresses } = await supabase
        .from('wallet_addresses')
        .select('blockchain, address')
        .eq('terminal_id', terminalId);

      // Get recent activity for this terminal
      const { data: recentActivity } = await this.getTerminalActivity(terminalId);

      // Get current session if any
      const { data: currentSession } = await this.getCurrentTerminalSession(terminalId);

      // Get current transaction if any
      const { data: currentTransaction } = await this.getCurrentTerminalTransaction(terminalId);

      return this.mapDatabaseTerminalToTerminalDetails(
        terminal,
        walletAddresses || [],
        recentActivity || [],
        currentSession,
        currentTransaction
      );
    } catch (error) {
      console.error('Error in getTerminalDetails:', error);
      return null;
    }
  }

  /**
   * Get terminal statistics for a location
   */
  async getTerminalStats(merchantId: string, locationId?: string): Promise<TerminalStats> {
    try {
      let query = supabase
        .from('terminals')
        .select('status, device_type')
        .eq('merchant_id', merchantId);

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data: terminals } = await query;

      // Get transaction counts for today
      const today = new Date().toISOString().split('T')[0];
      let transactionQuery = supabase
        .from('transactions')
        .select('status, crypto_currency')
        .eq('merchant_id', merchantId)
        .gte('created_at', `${today}T00:00:00Z`)
        .lt('created_at', `${today}T23:59:59Z`);

      if (locationId) {
        transactionQuery = transactionQuery.eq('location_id', locationId);
      }

      const { data: transactions } = await transactionQuery;

      // Calculate stats
      const onlineCount = terminals?.filter(t => t.status === 'online').length || 0;
      const offlineCount = terminals?.filter(t => ['offline', 'maintenance'].includes(t.status)).length || 0;
      const confirmedTransactions = transactions?.filter(t => t.status === 'completed').length || 0;
      const pendingTransactions = transactions?.filter(t => t.status === 'pending').length || 0;

      // Calculate average confirmation times (mock data for now)
      const averageConfirmationTimes: Record<string, number> = {
        'Bitcoin': 12.5,
        'Ethereum': 3.2,
        'Litecoin': 2.8
      };

      return {
        onlineCount,
        offlineCount,
        confirmedTransactions,
        pendingTransactions,
        averageConfirmationTimes
      };
    } catch (error) {
      console.error('Error in getTerminalStats:', error);
      return {
        onlineCount: 0,
        offlineCount: 0,
        confirmedTransactions: 0,
        pendingTransactions: 0,
        averageConfirmationTimes: {}
      };
    }
  }

  async updateTerminalStatus(terminalId: string, status: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('terminals')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('terminal_id', terminalId);

      if (error) {
        console.error('Error updating terminal status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateTerminalStatus:', error);
      return false;
    }
  }

  // Private helper methods

  private async getTerminalTransactionCounts(terminalIds: string[]) {
    if (terminalIds.length === 0) return { data: [] };

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    return await supabase
      .from('transactions')
      .select('terminal_id')
      .in('terminal_id', terminalIds)
      .gte('created_at', yesterday.toISOString())
      .then(({ data }) => {
        const counts = terminalIds.map(terminalId => ({
          terminal_id: terminalId,
          transaction_count: data?.filter(t => t.terminal_id === terminalId).length || 0
        }));
        return { data: counts };
      });
  }

  private async getTerminalRecentUsers(terminalIds: string[]) {
    if (terminalIds.length === 0) return { data: [] };

    return await supabase
      .from('terminal_sessions')
      .select(`
        terminal_id,
        users!terminal_sessions_user_id_fkey (
          name
        )
      `)
      .in('terminal_id', terminalIds)
      .order('last_activity', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        return { 
          data: data?.map(session => ({
            terminal_id: session.terminal_id,
            last_user: (session.users as any)?.name || 'Unknown'
          })) || []
        };
      });
  }

  private async getTerminalActivity(terminalId: string) {
    return await supabase
      .from('terminal_transaction_events')
      .select(`
        event_type,
        event_data,
        created_at,
        transactions!terminal_transaction_events_transaction_id_fkey (
          staff_user_id,
          users!transactions_staff_user_id_fkey (
            name
          )
        )
      `)
      .eq('terminal_id', terminalId)
      .order('created_at', { ascending: false })
      .limit(10);
  }

  private async getCurrentTerminalSession(terminalId: string) {
    return await supabase
      .from('terminal_sessions')
      .select(`
        session_id,
        started_at,
        last_activity,
        status,
        users!terminal_sessions_user_id_fkey (
          name
        )
      `)
      .eq('terminal_id', terminalId)
      .eq('status', 'active')
      .single();
  }

  private async getCurrentTerminalTransaction(terminalId: string) {
    return await supabase
      .from('transactions')
      .select(`
        transaction_id,
        amount_fiat,
        fiat_currency,
        amount_crypto,
        crypto_currency,
        blockchain,
        tx_hash,
        status,
        confirmations,
        required_confirmations,
        created_at
      `)
      .eq('terminal_id', terminalId)
      .in('status', ['pending', 'detected'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
  }

  private mapDatabaseTerminalToTerminal(
    dbTerminal: any, 
    transactionCount?: any,
    recentUser?: any
  ): Terminal {
    return {
      id: dbTerminal.terminal_id,
      name: dbTerminal.name,
      locationId: dbTerminal.location_id || '',
      status: dbTerminal.status,
      deviceType: dbTerminal.device_type,
      lastCheckIn: dbTerminal.last_heartbeat || dbTerminal.last_seen || dbTerminal.updated_at,
      version: dbTerminal.firmware_version || 'N/A',
      lastUser: recentUser?.last_user || 'Unknown',
      transactionsLast24h: transactionCount?.transaction_count || 0,
      errors: 0, // TODO: Implement error tracking
      pairingCode: dbTerminal.pairing_code,
      ipAddress: dbTerminal.ip_address,
      lastHeartbeat: dbTerminal.last_heartbeat,
      virtualTerminalEnabled: dbTerminal.merchants?.virtual_terminal_enabled,
      hardwareInfo: dbTerminal.hardware_info
    };
  }

  private mapDatabaseTerminalToTerminalDetails(
    dbTerminal: any,
    walletAddresses: any[],
    recentActivity: any[],
    currentSession?: any,
    currentTransaction?: any
  ): TerminalDetails {
    const walletMapping: Record<string, string> = {};
    walletAddresses.forEach(wallet => {
      walletMapping[wallet.blockchain] = wallet.address;
    });

    const mappedActivity = recentActivity.map(activity => ({
      timestamp: activity.created_at,
      action: activity.event_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
      user: activity.transactions?.users?.name || 'System',
      result: 'success' as const,
      details: JSON.stringify(activity.event_data)
    }));

    const liveSession = currentSession ? {
      staffName: currentSession.users?.name || null,
      startedAt: currentSession.started_at,
      idleTime: currentSession.last_activity ? 
        Math.floor((Date.now() - new Date(currentSession.last_activity).getTime()) / 1000) : null,
      lockState: 'unlocked' as const
    } : {
      staffName: null,
      startedAt: null,
      idleTime: null,
      lockState: null
    };

    const transaction = currentTransaction ? {
      state: currentTransaction.status === 'pending' ? 'awaiting_payment' as const : 'confirming' as const,
      fiatAmount: currentTransaction.amount_fiat,
      fiatCurrency: currentTransaction.fiat_currency,
      cryptoAmount: currentTransaction.amount_crypto,
      cryptoCurrency: currentTransaction.crypto_currency,
      chain: currentTransaction.blockchain,
      txHash: currentTransaction.tx_hash,
      confirmations: currentTransaction.confirmations,
      requiredConfirmations: currentTransaction.required_confirmations
    } : {
      state: 'idle' as const
    };

    return {
      id: dbTerminal.terminal_id,
      name: dbTerminal.name,
      deviceType: dbTerminal.device_type,
      pairingCode: dbTerminal.pairing_code || '',
      walletMapping,
      health: {
        uptime: 99.5, // TODO: Calculate actual uptime
        firmwareVersion: dbTerminal.firmware_version || 'N/A',
        ip: dbTerminal.ip_address || 'N/A',
        lastHeartbeat: dbTerminal.last_heartbeat || dbTerminal.updated_at
      },
      liveSession,
      currentTransaction: transaction,
      recentActivity: mappedActivity,
      virtualTerminalEnabled: dbTerminal.merchants?.virtual_terminal_enabled,
      hardwareInfo: dbTerminal.hardware_info
    };
  }
}

export const terminalService = TerminalService.getInstance();
