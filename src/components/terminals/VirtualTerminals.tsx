import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { supabase } from '../../lib/supabase';

// Types for Virtual Terminal Management
interface VirtualTerminalPassword {
  lastChanged: string;
  isLocked: boolean;
}

interface AcceptedToken {
  id: string;
  symbol: string;
  name: string;
  walletAddress: string;
  priority: number;
  isSelected: boolean;
  coingeckoId: string;
  network: string;
  disabled?: boolean;
  comingSoon?: boolean;
}

interface TerminalSettings {
  terminalName: string;
  sessionTimeout: string;
  autoLogout: boolean;
  defaultCurrency: string;
  virtualTerminalEnabled: boolean;
}

interface WalletStatus {
  hasWallet: boolean;
  walletCount: number;
}

interface PairingInfo {
  pairingKey: string;
  isActive: boolean;
  lastUsed: null | string | undefined;
}

interface UserContext {
  userId: string;
  merchantId: string;
  role: string;
  approved: boolean;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Helper function to get CoinGecko token image URL
const getCoinGeckoImageUrl = (coingeckoId: string, size: 'thumb' | 'small' | 'large' = 'small') => {
  return `https://assets.coingecko.com/coins/images/${getCoingeckoImageId(coingeckoId)}/${size}/${coingeckoId}.png`;
};

// Map CoinGecko IDs to their image IDs (these are different in CoinGecko's API)
const getCoingeckoImageId = (coingeckoId: string): string => {
  const imageIdMap: Record<string, string> = {
    'ethereum': '279',
    'usd-coin': '6319',
    'tether': '325',
    'dai': '9956',
    'wrapped-bitcoin': '7598',
    'coinbase-wrapped-staked-eth': '25473',
    'degen-base': '34515'
  };
  return imageIdMap[coingeckoId] || '1';
};

const VirtualTerminals = (): React.ReactElement => {
  const [activeTab, setActiveTab] = useState('password');
  const [passwordInfo, setPasswordInfo] = useState<VirtualTerminalPassword>({
    lastChanged: '',
    isLocked: false
  });

  // Password form state
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [isTokenSectionCollapsed, setIsTokenSectionCollapsed] = useState(false);
  
  // User and merchant context
  const { userData, merchantData } = useAuth();
  const [merchantId, setMerchantId] = useState<string | null>(null);
  
  // Terminal settings
  const [terminalSettings, setTerminalSettings] = useState<TerminalSettings>({
    terminalName: 'Main Terminal',
    sessionTimeout: '30',
    autoLogout: true,
    defaultCurrency: 'USD',
    virtualTerminalEnabled: true
  });
  
  // Virtual terminal state
  const [virtualTerminal, setVirtualTerminal] = useState<any>(null);
  
  // Token state
  const [selectedTokens, setSelectedTokens] = useState<AcceptedToken[]>([]);
  
  // Pairing info
  const [pairingInfo, setPairingInfo] = useState<PairingInfo>({
    pairingKey: '',
    isActive: false,
    lastUsed: null
  });
  const isFirstTimeSetup = !passwordInfo.lastChanged;
  
  const [availableTokens] = useState<AcceptedToken[]>([
    // Ethereum Network - Top 5 (Coming Soon)
    { id: '1', symbol: 'ETH', name: 'Ethereum (Coming Soon)', walletAddress: '', priority: 0, isSelected: false, coingeckoId: 'ethereum', network: 'Ethereum', disabled: true, comingSoon: true },
    { id: '2', symbol: 'USDC', name: 'Circle USDC (Coming Soon)', walletAddress: '', priority: 0, isSelected: false, coingeckoId: 'usd-coin', network: 'Ethereum', disabled: true, comingSoon: true },
    { id: '3', symbol: 'USDT', name: 'Tether USDT (Coming Soon)', walletAddress: '', priority: 0, isSelected: false, coingeckoId: 'tether', network: 'Ethereum', disabled: true, comingSoon: true },
    { id: '4', symbol: 'DAI', name: 'MakerDAO DAI (Coming Soon)', walletAddress: '', priority: 0, isSelected: false, coingeckoId: 'dai', network: 'Ethereum', disabled: true, comingSoon: true },
    { id: '5', symbol: 'WBTC', name: 'Wrapped BTC (Coming Soon)', walletAddress: '', priority: 0, isSelected: false, coingeckoId: 'wrapped-bitcoin', network: 'Ethereum', disabled: true, comingSoon: true },
    
    // Base Network - Available Tokens
    { id: '7', symbol: 'USDC', name: 'Circle USDC (Base)', walletAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', priority: 0, isSelected: false, coingeckoId: 'usd-coin', network: 'Base' },
    { id: '10', symbol: 'USDT', name: 'Tether USDT (Base)', walletAddress: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', priority: 0, isSelected: false, coingeckoId: 'tether', network: 'Base' },
    { id: '11', symbol: 'DAI', name: 'DAI (Base)', walletAddress: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', priority: 0, isSelected: false, coingeckoId: 'dai', network: 'Base' },
    { id: '12', symbol: 'USDbC', name: 'USDbC', walletAddress: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', priority: 0, isSelected: false, coingeckoId: 'usd-base-coin', network: 'Base' },
  ]);

  // Get user context for database operations (following Wallets.tsx pattern)
  const [userContextLoaded, setUserContextLoaded] = useState(false);

  // Get merchant ID from user metadata or database (same pattern as Wallets.tsx)
  const loadMerchantId = async () => {
    if (!userData) return;
    
    try {
      // Get merchant ID from merchant data
      let foundMerchantId = merchantData?.merchant_id;
      
      if (!foundMerchantId) {
        const { data: userDataQuery } = await supabase
          .from('users')
          .select('merchant_id')
          .eq('auth_user_id', userData?.auth_user_id)
          .single();
        foundMerchantId = userData?.merchant_id;
      }
      
      console.log('🔍 Merchant ID extraction:', {
        fromMerchantData: foundMerchantId,
        userId: userData?.auth_user_id
      });
      
      setMerchantId(foundMerchantId);
      setUserContextLoaded(true);
      
    } catch (error) {
      console.error('Error loading merchant ID:', error);
      setUserContextLoaded(true);
    }
  };

  // Create user context object for database operations
  const userContext: UserContext = {
    userId: userData?.auth_user_id || '',
    merchantId: merchantId || '',
    role: 'merchant',
    approved: true
  };

  // Helper function to map token symbol to blockchain network
const getBlockchainForToken = (symbol: string, network?: string): string => {
  // If network is explicitly provided, use that
  if (network) return network;
  
  // Otherwise use the mapping
  const blockchainMap: Record<string, string> = {
    'ETH': 'Ethereum',
    'USDC': 'Ethereum', // Default USDC to Ethereum
    'USDT': 'Ethereum', // Default USDT to Ethereum
    'DAI': 'Ethereum',  // Default DAI to Ethereum
    'WBTC': 'Ethereum',
    'cbETH': 'Base',
    'DEGEN': 'Base',
    'USDbC': 'Base'
  };
  
  return blockchainMap[symbol] || 'Ethereum'; // Default to Ethereum if not found
};

// Direct database integration functions
  const loadVirtualTerminalSettings = async () => {
    try {
      setIsLoading(true);
      
      if (!userContext.merchantId) {
        console.error('No merchant ID available');
        return;
      }
      
      // Load virtual terminal data from database
      const { data: terminalData, error } = await supabase
        .from('terminals')
        .select('pairing_code, status, created_at')
        .eq('merchant_id', userContext.merchantId)
        .eq('device_type', 'virtual')
        .single();
      
      // Load wallet status
      const { data: walletData } = await supabase
        .from('merchant_wallets')
        .select('wallet_id')
        .eq('merchant_id', userContext.merchantId);
      
      // Check if password exists in database
      const { data: passwordData } = await supabase
        .from('virtual_terminal_passwords')
        .select('password_hash, created_at, updated_at')
        .eq('merchant_id', userContext.merchantId)
        .single();
      
      const data = {
        terminalName: 'Main Terminal',
        sessionTimeout: '30',
        autoLogout: true,
        defaultCurrency: 'USD',
        virtualTerminalEnabled: true,
        hasWallet: !!(walletData && walletData.length > 0),
        walletCount: walletData ? walletData.length : 0,
        pairingKey: terminalData?.pairing_code || null,
        pairingKeyActive: terminalData?.status === 'active',
        pairingKeyLastUsed: terminalData?.created_at || null,
        passwordLastChanged: passwordData?.updated_at || passwordData?.created_at || null,
        hasPassword: !!passwordData?.password_hash
      };
      
      // Update all state from database response
      setTerminalSettings({
        terminalName: data.terminalName,
        sessionTimeout: data.sessionTimeout,
        autoLogout: data.autoLogout,
        defaultCurrency: data.defaultCurrency,
        virtualTerminalEnabled: data.virtualTerminalEnabled
      });
      
      setWalletStatus({
        hasWallet: data.hasWallet,
        walletCount: data.walletCount
      });
      
      // Regenerate pairing key
      const regeneratePairingKey = async () => {
        if (!userContext.merchantId) {
          console.error('No merchant ID available');
          return;
        }

        try {
          // Generate new 6-digit numeric key
          const newKey = Math.floor(100000 + Math.random() * 900000).toString();
          
          // Update in database
          const { error } = await supabase
            .from('terminals')
            .update({ pairing_code: newKey })
            .eq('merchant_id', userContext.merchantId)
            .eq('device_type', 'virtual');
          
          if (error) {
            console.error('Error updating pairing key:', error);
            alert('Error regenerating pairing key. Please try again.');
            return;
          }
          
          // Update local state
          setPairingInfo(prev => ({
            ...prev,
            pairingKey: newKey,
            lastUsed: null
          }));
          
          alert('New pairing key generated successfully!');
        } catch (error) {
          console.error('Error regenerating pairing key:', error);
          alert('Error regenerating pairing key. Please try again.');
        }
      };

      // Generate 6-digit numeric pairing key if none exists
      const generatePairingKey = () => {
        return Math.floor(100000 + Math.random() * 900000).toString();
      };
  
      let pairingKey = data.pairingKey;
      
      // If no pairing key exists in database, generate and save one
      if (!pairingKey) {
        pairingKey = generatePairingKey();
        
        // Save new pairing key to database
        const { error: updateError } = await supabase
          .from('terminals')
          .upsert({
            merchant_id: userContext.merchantId,
            device_type: 'virtual',
            pairing_code: pairingKey,
            status: 'active',
            terminal_name: 'Virtual Terminal'
          }, {
            onConflict: 'merchant_id,device_type'
          });
        
        if (updateError) {
          console.error('Error saving pairing key:', updateError);
        }
      }
      
      setPairingInfo({
        pairingKey: pairingKey,
        isActive: data.pairingKeyActive || false,
        lastUsed: data.pairingKeyLastUsed || undefined
      });

      // Update password info from database
      setPasswordInfo({
        lastChanged: data.passwordLastChanged || '',
        isLocked: false
      });

      setShowPasswordForm(!data.hasPassword);

      console.log('🔍 Virtual terminal data loaded:', {
        hasPassword: data.hasPassword,
        passwordLastChanged: data.passwordLastChanged,
        hasWallet: data.hasWallet,
        virtualTerminalEnabled: data.virtualTerminalEnabled
      });

      // Load existing token configuration
      await loadTokenConfiguration();
      
    } catch (error) {
      console.error('Error loading virtual terminal settings:', error);
      // TODO: Add toast notification for error
    } finally {
      setIsLoading(false);
    }
  };

  // Wallet status - Loaded from API
  const [walletStatus, setWalletStatus] = useState<WalletStatus>({
    hasWallet: false,
    walletCount: 0
  });

  // Pairing key info already declared above

  // Load token configuration from database
  const loadTokenConfiguration = async () => {
    try {
      if (!merchantId) {
        console.log('⚠️ Cannot load token configuration: No merchant ID available');
        return;
      }
      
      // Get virtual terminal ID
      const { data: virtualTerminal, error: terminalError } = await supabase
        .from('terminals')
        .select('terminal_id')
        .eq('merchant_id', merchantId)
        .eq('device_type', 'virtual')
        .single();

      if (terminalError && terminalError.code !== 'PGRST116') {
        console.error('Error finding virtual terminal:', terminalError);
        return;
      }

      if (!virtualTerminal) {
        console.log('ℹ️ No virtual terminal found - will be created when needed');
        return;
      }

      // Load token configuration using terminal_id
      const { data, error } = await supabase
        .from('terminal_crypto_config')
        .select('*')
        .eq('terminal_id', virtualTerminal.terminal_id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading token configuration:', error);
        return;
      }

      if (data) {
        console.log('🔍 Found existing token configuration:', data);
        // Convert database format to UI format
        const loadedTokens: AcceptedToken[] = [];
        
        // Map crypto_1, crypto_2, crypto_3 to selected tokens
        if (data.crypto_1) {
          // First try to find by both symbol and network
          let token = availableTokens.find(t => 
            t.symbol === data.crypto_1 && 
            t.network === data.crypto_1_blockchain
          );
          
          // If not found, try just by symbol
          if (!token) {
            token = availableTokens.find(t => t.symbol === data.crypto_1);
          }
          
          if (token) {
            loadedTokens.push({
              ...token,
              priority: 1,
              isSelected: true
            });
          } else {
            console.warn(`⚠️ Could not find token for ${data.crypto_1} on ${data.crypto_1_blockchain}`);
          }
        }
        
        // Load second token if available
        if (data.crypto_2) {
          // First try to find by both symbol and network
          let token = availableTokens.find(t => 
            t.symbol === data.crypto_2 && 
            t.network === data.crypto_2_blockchain
          );
          
          // If not found, try just by symbol
          if (!token) {
            token = availableTokens.find(t => t.symbol === data.crypto_2);
          }
          
          if (token) {
            loadedTokens.push({
              ...token,
              priority: 2,
              isSelected: true
            });
          } else {
            console.warn(`⚠️ Could not find token for ${data.crypto_2} on ${data.crypto_2_blockchain}`);
          }
        }
        
        // Load third token if available
        if (data.crypto_3) {
          // First try to find by both symbol and network
          let token = availableTokens.find(t => 
            t.symbol === data.crypto_3 && 
            t.network === data.crypto_3_blockchain
          );
          
          // If not found, try just by symbol
          if (!token) {
            token = availableTokens.find(t => t.symbol === data.crypto_3);
          }
          
          if (token) {
            loadedTokens.push({
              ...token,
              priority: 3,
              isSelected: true
            });
          } else {
            console.warn(`⚠️ Could not find token for ${data.crypto_3} on ${data.crypto_3_blockchain}`);
          }
        }
        
        setSelectedTokens(loadedTokens);
        console.log('✅ Token configuration loaded:', loadedTokens);
      } else {
        console.log('ℹ️ No existing token configuration found');
      }
    } catch (error) {
      console.error('Error loading token configuration:', error);
    }
  };

  // Load merchant ID and data on component mount
  useEffect(() => {
    if (userData) {
      loadMerchantId();
    }
  }, [userData]);

  // Load virtual terminal settings when merchant ID is available
  useEffect(() => {
    if (userContextLoaded && merchantId) {
      loadVirtualTerminalSettings();
    }
  }, [userContextLoaded, merchantId]);

  // Password form setup
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    watch,
    reset: resetPasswordForm
  } = useForm<PasswordFormData>();

  const newPassword = watch('newPassword');

  // Password requirements validation
  const passwordRequirements = {
    minLength: newPassword?.length >= 8,
    hasUppercase: /[A-Z]/.test(newPassword || ''),
    hasLowercase: /[a-z]/.test(newPassword || ''),
    hasNumber: /\d/.test(newPassword || ''),
  };

  const isPasswordValid = Object.values(passwordRequirements).every(Boolean);

  // Handle password form submission
  const onPasswordSubmit = async (data: PasswordFormData) => {
    if (data.newPassword !== data.confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔍 Debug - User Context:', {
        userId: userContext.userId,
        merchantId: userContext.merchantId,
        role: userContext.role,
        approved: userContext.approved,
        userContextLoaded: userContextLoaded
      });
      
      if (!userContext.merchantId) {
        console.error('❌ No merchant ID found - cannot create password');
        alert('Error: No merchant ID found. Please contact support.');
        return;
      }
      
      console.log('Creating/updating password for merchant:', userContext.merchantId);
      
      // Mock API call - replace with actual service
      console.log('Updating password:', data);
      const response = { success: true, lastChanged: new Date().toISOString() };

      if (response.success) {
        // Update password info state
        setPasswordInfo({
          lastChanged: response.lastChanged || new Date().toISOString(),
          isLocked: false
        });

        if (isFirstTimeSetup) {
          console.log('Password created successfully');
          alert('Virtual terminal password created successfully!');
        } else {
          console.log('Password updated successfully');
          alert('Password updated successfully!');
        }

        // Reset form and close it
        resetPasswordForm();
        setShowPasswordForm(false);
      } else {
        throw new Error('Failed to update password');
      }
    } catch (error) {
      console.error('Error updating password:', error);
      alert('Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle token selection and reordering
  const handleTokenSelect = (token: AcceptedToken) => {
    // Prevent selecting disabled/coming soon tokens
    if (token.disabled || token.comingSoon) {
      alert('This token is coming soon and not yet available for selection.');
      return;
    }
    
    if (selectedTokens.length >= 3 && !selectedTokens.find(t => t.id === token.id)) {
      alert('You can select up to 3 tokens - please remove a token before adding a new one');
      return;
    }

    if (selectedTokens.find(t => t.id === token.id)) {
      // Remove token
      setSelectedTokens(selectedTokens.filter(t => t.id !== token.id));
    } else {
      // Add token
      const newToken = { ...token, priority: selectedTokens.length + 1, isSelected: true };
      setSelectedTokens([...selectedTokens, newToken]);
    }
  };

  // Handle drag and drop reordering
  const moveToken = (fromIndex: number, toIndex: number) => {
    const newTokens = [...selectedTokens];
    const [moved] = newTokens.splice(fromIndex, 1);
    newTokens.splice(toIndex, 0, moved);
    
    // Update priorities
    const updatedTokens = newTokens.map((token, index) => ({
      ...token,
      priority: index + 1
    }));
    
    setSelectedTokens(updatedTokens);
  };



  // Ensure virtual terminal exists and get terminal_id
  const ensureVirtualTerminal = async (): Promise<string | null> => {
    if (!merchantId) return null;

    try {
      // Check if virtual terminal already exists
      const { data: existingTerminal, error: fetchError } = await supabase
        .from('terminals')
        .select('terminal_id, pairing_code')
        .eq('merchant_id', merchantId)
        .eq('device_type', 'virtual')
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error checking existing virtual terminal:', fetchError);
        return null;
      }

      if (existingTerminal) {
        console.log('✅ Virtual terminal already exists:', existingTerminal.terminal_id);
        return existingTerminal.terminal_id;
      }

      // Create new virtual terminal
      const pairingCode = Math.floor(100000 + Math.random() * 900000).toString();
      const virtualTerminalData = {
        merchant_id: merchantId,
        name: 'Virtual Terminal',
        device_type: 'virtual',
        status: 'active',
        pairing_code: pairingCode
      };

      const { data: newTerminal, error: createError } = await supabase
        .from('terminals')
        .insert(virtualTerminalData)
        .select('terminal_id')
        .single();

      if (createError) {
        console.error('Error creating virtual terminal:', createError);
        return null;
      }

      console.log('✅ Virtual terminal created:', newTerminal.terminal_id);
      return newTerminal.terminal_id;
    } catch (error) {
      console.error('Error ensuring virtual terminal:', error);
      return null;
    }
  };
  
  // Save token configuration to database
  const saveTokenConfiguration = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Validate that at least 1 token is selected
      if (selectedTokens.length < 1) {
        alert('Please select at least 1 token before saving');
        setIsLoading(false);
        return;
      }
      
      // Check if we have a virtual terminal ID
      // Ensure virtual terminal exists and get terminal_id
      const terminalId = await ensureVirtualTerminal();
      if (!terminalId) {
        throw new Error('Failed to create or find virtual terminal');
      }
      
      // Sort tokens by priority
      const sortedTokens = [...selectedTokens].sort((a, b) => (a.priority || 999) - (b.priority || 999));
      
      // Map tokens to database structure
      const tokenConfig: any = {
        terminal_id: terminalId,
        merchant_id: merchantId,
        crypto_1: sortedTokens[0].symbol,
        crypto_1_blockchain: sortedTokens[0].network, // Use token's network directly
        crypto_1_enabled: true,
        updated_at: new Date().toISOString()
        // Note: configured_by field removed due to UUID format mismatch with Clerk user IDs
      };
      
      // Add second token if available
      if (sortedTokens.length >= 2) {
        tokenConfig.crypto_2 = sortedTokens[1].symbol;
        tokenConfig.crypto_2_blockchain = sortedTokens[1].network; // Use token's network directly
        tokenConfig.crypto_2_enabled = true;
      } else {
        // Clear second token if not selected
        tokenConfig.crypto_2 = null;
        tokenConfig.crypto_2_blockchain = null;
        tokenConfig.crypto_2_enabled = false;
      }
      
      // Add third token if available
      if (sortedTokens.length >= 3) {
        tokenConfig.crypto_3 = sortedTokens[2].symbol;
        tokenConfig.crypto_3_blockchain = sortedTokens[2].network; // Use token's network directly
        tokenConfig.crypto_3_enabled = true;
      } else {
        // Clear third token if not selected
        tokenConfig.crypto_3 = null;
        tokenConfig.crypto_3_blockchain = null;
        tokenConfig.crypto_3_enabled = false;
      }

      console.log('🔍 Saving token configuration:', tokenConfig);

      // First check if a record already exists
      const { data: existingConfig } = await supabase
        .from('terminal_crypto_config')
        .select('id')
        .eq('terminal_id', terminalId)
        .single();

      let error;
      
      if (existingConfig) {
        // Update existing record
        console.log('🔄 Updating existing token configuration');
        const { error: updateError } = await supabase
          .from('terminal_crypto_config')
          .update(tokenConfig)
          .eq('terminal_id', terminalId);
          
        error = updateError;
      } else {
        // Insert new record
        console.log('➕ Creating new token configuration');
        const { error: insertError } = await supabase
          .from('terminal_crypto_config')
          .insert(tokenConfig);
          
        error = insertError;
      }

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('✅ Token configuration saved successfully');
      alert('Token configuration saved successfully!');
    } catch (error) {
      console.error('Error saving token configuration:', error);
      alert('Error saving configuration. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Save terminal settings
  const saveTerminalSettings = async () => {
    setIsLoading(true);
    try {
      console.log('Updating terminal settings:', terminalSettings);
      const response = { success: true };

      if (response.success) {
        alert('Terminal settings saved successfully!');
      } else {
        throw new Error('Failed to update terminal settings');
      }
    } catch (error) {
      console.error('Error saving terminal settings:', error);
      alert('Error saving settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Virtual Terminal Management</h1>
        </div>
        <p className="text-gray-600">
          Manage your virtual terminal settings, password security, and accepted payment tokens.
        </p>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="password" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="password">Virtual Terminal Password</TabsTrigger>
          <TabsTrigger value="tokens">Accepted Tokens</TabsTrigger>
          <TabsTrigger value="settings">Terminal Settings</TabsTrigger>
        </TabsList>

        {/* Virtual Terminal Password Tab */}
        <TabsContent value="password" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{isFirstTimeSetup ? "Set Up Virtual Terminal Password" : "Password Security"}</span>
                {!isFirstTimeSetup && (
                  <Badge variant={passwordInfo.isLocked ? "destructive" : "default"}>
                    {passwordInfo.isLocked ? "Locked" : "Active"}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Status */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Current Status</h3>
                    {isFirstTimeSetup ? (
                      <div>
                        <p className="text-sm text-gray-600 mb-2">
                          No virtual terminal password has been set up yet.
                        </p>
                        <p className="text-sm text-blue-600 font-medium">
                          Create your first password for your virtual terminals.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-gray-600">
                          Last password change: {new Date(passwordInfo.lastChanged).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          Account status: {passwordInfo.isLocked ? 'Locked' : 'Active'}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Change Password Button - Only show when password exists */}
                  {!isFirstTimeSetup && !showPasswordForm && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPasswordForm(true)}
                      className="ml-4"
                    >
                      Change Password
                    </Button>
                  )}
                </div>
              </div>

              {/* Password Change Form - Show for first time setup or when user clicks Change Password */}
              {(isFirstTimeSetup || showPasswordForm) && (
                <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
                {!isFirstTimeSetup && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Password
                    </label>
                    <Input
                      type="password"
                      {...registerPassword('currentPassword', { required: 'Current password is required' })}
                      className={passwordErrors.currentPassword ? 'border-red-500' : ''}
                    />
                    {passwordErrors.currentPassword && (
                      <p className="text-red-500 text-sm mt-1">{passwordErrors.currentPassword.message}</p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <Input
                    type="password"
                    {...registerPassword('newPassword', { required: 'New password is required' })}
                    className={passwordErrors.newPassword ? 'border-red-500' : ''}
                  />
                  {passwordErrors.newPassword && (
                    <p className="text-red-500 text-sm mt-1">{passwordErrors.newPassword.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  <Input
                    type="password"
                    {...registerPassword('confirmPassword', { required: 'Please confirm your password' })}
                    className={passwordErrors.confirmPassword ? 'border-red-500' : ''}
                  />
                  {passwordErrors.confirmPassword && (
                    <p className="text-red-500 text-sm mt-1">{passwordErrors.confirmPassword.message}</p>
                  )}
                </div>

                {/* Password Requirements */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Password Requirements</h4>
                  <ul className="space-y-1 text-sm">
                    <li className={`flex items-center ${passwordRequirements.minLength ? 'text-green-600' : 'text-gray-600'}`}>
                      <span className="mr-2">{passwordRequirements.minLength ? '✓' : '○'}</span>
                      At least 8 characters
                    </li>
                    <li className={`flex items-center ${passwordRequirements.hasUppercase ? 'text-green-600' : 'text-gray-600'}`}>
                      <span className="mr-2">{passwordRequirements.hasUppercase ? '✓' : '○'}</span>
                      One uppercase letter
                    </li>
                    <li className={`flex items-center ${passwordRequirements.hasLowercase ? 'text-green-600' : 'text-gray-600'}`}>
                      <span className="mr-2">{passwordRequirements.hasLowercase ? '✓' : '○'}</span>
                      One lowercase letter
                    </li>
                    <li className={`flex items-center ${passwordRequirements.hasNumber ? 'text-green-600' : 'text-gray-600'}`}>
                      <span className="mr-2">{passwordRequirements.hasNumber ? '✓' : '○'}</span>
                      One number
                    </li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={!isPasswordValid || isLoading}
                    className="flex-1"
                  >
                    {isLoading 
                      ? (isFirstTimeSetup ? 'Creating...' : 'Updating...') 
                      : (isFirstTimeSetup ? 'Create Password' : 'Update Password')
                    }
                  </Button>
                  
                  {/* Cancel button - Only show when updating existing password */}
                  {!isFirstTimeSetup && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowPasswordForm(false);
                        resetPasswordForm();
                      }}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Accepted Tokens Tab */}
        <TabsContent value="tokens" className="space-y-6">
          {!terminalSettings.virtualTerminalEnabled && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-800">
                  <strong>Virtual terminals are currently disabled.</strong> Enable them in Terminal Settings to configure accepted tokens.
                </p>
              </div>
            </div>
          )}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Accepted Payment Tokens
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsTokenSectionCollapsed(!isTokenSectionCollapsed)}
                      className="p-1 h-6 w-6"
                    >
                      {isTokenSectionCollapsed ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronUp className="h-4 w-4" />
                      )}
                    </Button>
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    Select at least 1 token (up to 3) that your virtual terminals will accept for payments.
                  </p>
                </div>
                {isTokenSectionCollapsed && selectedTokens.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedTokens.map((token) => (
                      <Badge key={token.id} variant="outline" className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${
                          token.network === 'Ethereum' ? 'bg-blue-500' : 'bg-purple-500'
                        }`}></span>
                        {token.symbol} ({token.network})
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardHeader>
            {!isTokenSectionCollapsed && (
              <CardContent className="space-y-6">
                {/* Selected Tokens */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-4">
                    Selected Tokens ({selectedTokens.length}/3)
                  </h3>
                  <div className="space-y-3">
                    {selectedTokens.map((token, index) => (
                      <div
                        key={token.id}
                        className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full text-blue-600 font-medium">
                            {index + 1}
                          </div>
                          <img 
                            src={getCoinGeckoImageUrl(token.coingeckoId)} 
                            alt={token.symbol}
                            className="w-8 h-8 rounded-full"
                            onError={(e) => {
                              // Fallback to a generic token icon if CoinGecko image fails
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {token.symbol}
                              <Badge variant="outline" className={`text-xs ${
                                token.network === 'Ethereum' ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-purple-100 text-purple-800 border-purple-300'
                              }`}>
                                {token.network}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600">{token.name}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTokenSelect(token)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Available Tokens */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-4">Available Tokens</h3>
                  
                  {/* Ethereum Network Tokens */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                      <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                      Ethereum Network
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {availableTokens
                        .filter(token => !selectedTokens.find(selected => selected.id === token.id) && token.network === 'Ethereum')
                        .map((token) => (
                          <div
                            key={token.id}
                            className={`flex items-center justify-between p-3 border border-gray-200 rounded-lg ${token.disabled ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                          >
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {token.symbol}
                                <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 border-blue-300">
                                  Ethereum
                                </Badge>
                                {token.comingSoon && (
                                  <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800 border-amber-300">
                                    Coming Soon
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-gray-600">{token.name}</div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTokenSelect(token)}
                              disabled={selectedTokens.length >= 3 || token.disabled}
                            >
                              {token.comingSoon ? 'Coming Soon' : 'Add'}
                            </Button>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Base Network Tokens */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                      <span className="w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
                      Base Network
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {availableTokens
                        .filter(token => !selectedTokens.find(selected => selected.id === token.id) && token.network === 'Base')
                        .map((token) => (
                          <div
                            key={token.id}
                            className={`flex items-center justify-between p-3 border border-gray-200 rounded-lg ${token.disabled ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                          >
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {token.symbol}
                                <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800 border-purple-300">
                                  Base
                                </Badge>
                                {token.comingSoon && (
                                  <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800 border-amber-300">
                                    Coming Soon
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-gray-600">{token.name}</div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTokenSelect(token)}
                              disabled={selectedTokens.length >= 3 || token.disabled}
                            >
                              {token.comingSoon ? 'Coming Soon' : 'Add'}
                            </Button>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Save Configuration Button */}
                <div className="pt-4 border-t">
                  <Button 
                    onClick={() => saveTokenConfiguration()}
                    disabled={selectedTokens.length < 1 || isLoading}
                    className="w-full"
                  >
                    {isLoading ? 'Saving...' : 'Save Token Configuration'}
                  </Button>
                  {selectedTokens.length === 0 && (
                    <p className="text-sm text-gray-500 mt-2 text-center">
                      Please select at least 1 token to save configuration
                    </p>
                  )}
                  {selectedTokens.length > 0 && selectedTokens.length < 3 && (
                    <p className="text-sm text-blue-500 mt-2 text-center">
                      You've selected {selectedTokens.length} token{selectedTokens.length > 1 ? 's' : ''}. You can add up to 3 tokens total.
                    </p>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        </TabsContent>

        {/* Virtual Terminal Password Tab */}
        <TabsContent value="password" className="space-y-6">
          {!terminalSettings.virtualTerminalEnabled && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-800">
                  <strong>Virtual terminals are currently disabled.</strong> Enable them in Terminal Settings to allow password-based access.
                </p>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Terminal Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Terminal Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Virtual Terminal Master Toggle */}
              <div className="p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">Virtual Terminal Access</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {!walletStatus.hasWallet
                        ? 'Virtual terminals require a connected wallet to process payments'
                        : terminalSettings.virtualTerminalEnabled 
                          ? 'Virtual terminals are currently active and can accept logins'
                          : 'Virtual terminals are disabled - no login access allowed'
                      }
                    </p>
                  </div>
                  <div className="flex items-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={terminalSettings.virtualTerminalEnabled}
                        disabled={!walletStatus.hasWallet}
                        onChange={(e) => {
                          if (!walletStatus.hasWallet && e.target.checked) {
                            // Prevent enabling if no wallet connected
                            return;
                          }
                          const handleVirtualTerminalToggle = async (enabled: boolean) => {
                            try {
                              setIsLoading(true);
                              
                              const updatedSettings = {
                                ...terminalSettings,
                                virtualTerminalEnabled: enabled
                              };
                              console.log('Updating terminal settings:', updatedSettings);
                              const response = { success: true };

                              // Update local state
                              setTerminalSettings(prev => ({
                                ...prev,
                                virtualTerminalEnabled: enabled
                              }));
                              
                              // TODO: Add success toast notification
                              console.log(`Virtual terminal ${enabled ? 'enabled' : 'disabled'} successfully`);
                              
                            } catch (error) {
                              console.error('Error updating virtual terminal status:', error);
                              
                              // Handle specific error cases
                              if (error instanceof Error && error.message.includes('WALLET_REQUIRED')) {
                                // TODO: Add error toast for wallet requirement
                                console.error('Wallet required to enable virtual terminals');
                              } else {
                                // TODO: Add generic error toast
                                console.error('Failed to update virtual terminal status');
                              }
                            } finally {
                              setIsLoading(false);
                            }
                          };
                          handleVirtualTerminalToggle(e.target.checked);
                        }}
                      />
                      <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                        !walletStatus.hasWallet 
                          ? 'bg-gray-300 after:border-gray-400 cursor-not-allowed' 
                          : 'bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 after:border-gray-300 peer-checked:bg-blue-600'
                      }`}></div>
                    </label>
                    <span className={`ml-3 text-sm font-medium ${!walletStatus.hasWallet ? 'text-gray-400' : 'text-gray-700'}`}>
                      {!walletStatus.hasWallet ? 'DISABLED' : terminalSettings.virtualTerminalEnabled ? 'ON' : 'OFF'}
                    </span>
                  </div>
                </div>
                {!terminalSettings.virtualTerminalEnabled && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="flex">
                      <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm text-yellow-800">
                        <strong>Warning:</strong> Virtual terminals are disabled. Users will not be able to log in until you turn this back on.
                      </p>
                    </div>
                  </div>
                )}
                {!walletStatus.hasWallet && (
                  <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-md">
                    <div className="flex">
                      <svg className="w-5 h-5 text-orange-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="text-sm text-orange-800">
                          <strong>Wallet Required:</strong> Virtual terminals cannot be activated without a connected wallet for payment processing.
                        </p>
                        <p className="text-sm text-orange-700 mt-1">
                          Only administrators can add wallets to your merchant account. Please contact your admin to connect a wallet before enabling virtual terminals.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Pairing Key Section - Only show when virtual terminals are enabled */}
              {terminalSettings.virtualTerminalEnabled && walletStatus.hasWallet && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-blue-900 mb-2">Virtual Terminal Pairing Key</h3>
                      <p className="text-sm text-blue-700 mb-3">
                        Use this pairing key to connect virtual terminal devices to your merchant account.
                      </p>
                      
                      {/* Pairing Key Display */}
                      <div className="bg-white rounded-md border border-blue-300 p-3 mb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
                            </svg>
                            <div>
                              <div className="font-mono text-2xl font-bold text-blue-900 tracking-wider">
                                {pairingInfo.pairingKey}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                6-digit pairing code • {pairingInfo.isActive ? 'Active' : 'Inactive'} • Last used: {pairingInfo.lastUsed ? new Date(pairingInfo.lastUsed).toLocaleDateString() : 'Never'}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(pairingInfo.pairingKey);
                              // TODO: Add toast notification
                              alert('Pairing key copied to clipboard!');
                            }}
                          >
                            Copy
                          </Button>
                        </div>
                      </div>

                      {/* Instructions */}
                      <div className="text-sm text-blue-700">
                        <p className="font-medium mb-1">How to pair your virtual terminal:</p>
                        <ol className="list-decimal list-inside space-y-1 text-blue-600">
                          <li>Open terminal.okurupay.com</li>
                          <li>Enter the 6-digit Pairing Code</li>
                          <li>Enter the Created Virtual Terminal Password</li>
                          <li>Click Access Terminal</li>
                        </ol>
                      </div>
                    </div>
                    
                    {/* Regenerate Key Button */}
                    <div className="ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Generate 6-digit number for easier virtual terminal entry
                          const newKey = Math.floor(100000 + Math.random() * 900000).toString();
                          setPairingInfo({
                            ...pairingInfo,
                            pairingKey: newKey,
                            lastUsed: null
                          });
                          // TODO: Add confirmation dialog and API call
                          alert('New pairing key generated!');
                        }}
                        className="text-orange-600 border-orange-300 hover:bg-orange-50"
                      >
                        Regenerate Key
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Terminal Name
                </label>
                <Input
                  value={terminalSettings.terminalName}
                  onChange={(e) => setTerminalSettings({
                    ...terminalSettings,
                    terminalName: e.target.value
                  })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Timeout
                </label>
                <select
                  className="w-full p-3 border border-gray-200 rounded-lg"
                  value={terminalSettings.sessionTimeout}
                  onChange={(e) => setTerminalSettings({
                    ...terminalSettings,
                    sessionTimeout: e.target.value
                  })}
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Fiat Currency
                </label>
                <select
                  className="w-full p-3 border border-gray-200 rounded-lg"
                  value={terminalSettings.defaultCurrency}
                  onChange={(e) => setTerminalSettings({
                    ...terminalSettings,
                    defaultCurrency: e.target.value
                  })}
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                </select>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="autoLogout"
                  checked={terminalSettings.autoLogout}
                  onChange={(e) => setTerminalSettings({
                    ...terminalSettings,
                    autoLogout: e.target.checked
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="autoLogout" className="text-sm font-medium text-gray-700">
                  Enable auto-logout on session timeout
                </label>
              </div>

              <Button
                onClick={saveTerminalSettings}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Saving...' : 'Save Terminal Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VirtualTerminals;
