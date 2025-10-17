import React, { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const WalletSetupBanner: React.FC = () => {
  const { userData } = useAuth();
  const [hasVerifiedWallet, setHasVerifiedWallet] = useState<boolean | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const checkWalletStatus = async () => {
      if (!userData?.merchant_id) return;

      try {
        // Check if merchant has any verified wallet addresses
        const { data, error } = await supabase
          .from('wallet_addresses')
          .select('address_id')
          .eq('merchant_wallets.merchant_id', userData.merchant_id)
          .eq('is_verified', true)
          .limit(1);

        if (error) {
          console.error('Error checking wallet status:', error);
          return;
        }

        setHasVerifiedWallet(data && data.length > 0);
      } catch (err) {
        console.error('Error in checkWalletStatus:', err);
      }
    };

    checkWalletStatus();
  }, [userData?.merchant_id]);

  // Don't show banner if:
  // - Still loading wallet status
  // - User has verified wallet
  // - User dismissed the banner
  if (hasVerifiedWallet === null || hasVerifiedWallet || isDismissed) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-yellow-400/20 via-amber-400/20 to-orange-400/20 backdrop-blur-sm border-b border-yellow-300/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center">
            <AlertTriangle className="h-4 w-4 text-amber-700 mr-2 flex-shrink-0" />
            <div className="flex items-center">
              <span className="text-amber-900 font-medium text-sm">
                Wallet setup required
              </span>
              <span className="text-amber-800 text-xs ml-2 hidden sm:inline">
                Some features are disabled until you add a verified wallet.
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Link
              to="/wallets"
              className="bg-amber-600/90 text-white px-3 py-1 rounded text-xs font-medium hover:bg-amber-700/90 transition-colors backdrop-blur-sm"
            >
              Setup Wallet
            </Link>
            <button
              onClick={() => setIsDismissed(true)}
              className="text-amber-700 hover:text-amber-900 p-0.5"
              aria-label="Dismiss banner"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletSetupBanner;
