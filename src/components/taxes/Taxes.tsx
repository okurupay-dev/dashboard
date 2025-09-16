import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Calculator, DollarSign, TrendingUp, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, TaxSettings as TaxSettingsType, Transaction } from '../../lib/supabase';

// Simple inline switch component to avoid import issues
const Switch: React.FC<{
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}> = ({ checked, onCheckedChange, disabled = false }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onCheckedChange(!checked)}
      className={`inline-flex h-6 w-11 items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-blue-600' : 'bg-gray-200'
      }`}
    >
      <span
        className={`block h-5 w-5 rounded-full bg-white shadow-lg transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
};

interface TransactionData {
  total_revenue: number;
  total_tax_collected: number;
  tax_liability: number;
  transaction_count: number;
}

const Taxes: React.FC = () => {
  const { userData, merchantData } = useAuth();
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [taxSettings, setTaxSettings] = useState<TaxSettingsType>({
    tax_id: '',
    merchant_id: merchantData?.merchant_id || '',
    tax_rate: 8.5,
    tax_name: 'Sales Tax',
    is_enabled: false,
    auto_calculate: true,
    applies_to_products: true,
    applies_to_services: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  const [transactionData, setTransactionData] = useState<TransactionData>({
    total_revenue: 0,
    total_tax_collected: 0,
    tax_liability: 0,
    transaction_count: 0
  });

  const [newTaxRate, setNewTaxRate] = useState(taxSettings.tax_rate.toString());
  const [newTaxName, setNewTaxName] = useState(taxSettings.tax_name);

  // Fetch tax settings and transaction data on component mount
  useEffect(() => {
    const fetchData = async () => {
      if (!merchantData?.merchant_id) return;
      
      setLoading(true);
      try {
        console.log('Fetching tax settings for merchant:', merchantData.merchant_id);
        
        // Fetch tax settings
        const { data: taxData, error: taxError } = await supabase
          .from('tax_settings')
          .select('*')
          .eq('merchant_id', merchantData.merchant_id)
          .single();

        if (taxData && !taxError) {
          console.log('Found existing tax settings:', taxData);
          setTaxSettings(taxData);
          setNewTaxRate((taxData.tax_rate * 100).toString()); // Convert to percentage
          setNewTaxName(taxData.tax_name);
          setTaxEnabled(taxData.is_enabled);
        } else if (taxError?.code === 'PGRST116') {
          // No tax settings found, use defaults
          console.log('No tax settings found, using defaults');
        } else {
          console.error('Error fetching tax settings:', taxError);
        }

        // Fetch transaction data for revenue calculations
        console.log('Fetching transaction data for merchant:', merchantData.merchant_id);
        const { data: transactions, error: transError } = await supabase
          .from('transactions')
          .select('amount_fiat, okuru_fee_fiat, status')
          .eq('merchant_id', merchantData.merchant_id)
          .eq('status', 'completed');

        if (transactions && !transError) {
          console.log(`Found ${transactions.length} completed transactions`);
          
          // Calculate net revenue (what merchant actually receives after Okuru fees)
          const totalGrossRevenue = transactions.reduce((sum, tx) => sum + (tx.amount_fiat || 0), 0);
          const totalOkuruFees = transactions.reduce((sum, tx) => sum + (tx.okuru_fee_fiat || 0), 0);
          const totalNetRevenue = totalGrossRevenue - totalOkuruFees;
          
          const transactionCount = transactions.length;
          const taxRate = taxData?.tax_rate || 0;
          
          // Tax should be calculated on net revenue (what merchant actually receives)
          const totalTaxOwed = totalNetRevenue * taxRate;
          
          console.log('Revenue calculation:', {
            grossRevenue: totalGrossRevenue,
            okuruFees: totalOkuruFees,
            netRevenue: totalNetRevenue,
            taxRate: taxRate,
            taxOwed: totalTaxOwed
          });
          
          setTransactionData({
            total_revenue: totalNetRevenue, // Show net revenue (what merchant keeps)
            total_tax_collected: totalTaxOwed,
            tax_liability: totalTaxOwed,
            transaction_count: transactionCount
          });
        } else {
          console.log('No transaction data found or error:', transError);
        }
      } catch (error) {
        console.error('Error fetching tax data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [merchantData?.merchant_id]);

  useEffect(() => {
    setTaxEnabled(taxSettings.is_enabled);
    setIsExpanded(taxSettings.is_enabled);
  }, [taxSettings.is_enabled]);

  const handleTaxToggle = (enabled: boolean) => {
    setTaxEnabled(enabled);
    setTaxSettings(prev => ({
      ...prev,
      is_enabled: enabled,
      updated_at: new Date().toISOString()
    }));
    
    if (!enabled) {
      setIsExpanded(false);
    } else {
      setIsExpanded(true);
    }
  };

  const handleSaveTaxSettings = async () => {
    if (!merchantData?.merchant_id || !userData?.user_id) {
      console.error('Missing merchant or user data');
      alert('Unable to save settings. Please refresh and try again.');
      return;
    }
    
    // Validate tax rate
    const taxRateNum = parseFloat(newTaxRate);
    if (isNaN(taxRateNum) || taxRateNum < 0 || taxRateNum > 100) {
      alert('Please enter a valid tax rate between 0 and 100');
      return;
    }
    
    if (!newTaxName.trim()) {
      alert('Please enter a tax name');
      return;
    }
    
    try {
      const taxRateDecimal = taxRateNum / 100; // Convert percentage to decimal (0-1)
      
      console.log('Saving tax settings:', {
        merchant_id: merchantData.merchant_id,
        tax_name: newTaxName.trim(),
        tax_rate: taxRateDecimal,
        is_enabled: taxEnabled,
        created_by: userData.user_id
      });
      
      // Try to update existing record first, then insert if not found
      let data, error;
      
      // First, try to update existing record
      const { data: updateData, error: updateError } = await supabase
        .from('tax_settings')
        .update({
          tax_name: newTaxName.trim(),
          tax_rate: taxRateDecimal,
          is_enabled: taxEnabled,
          auto_calculate: true,
          applies_to_products: true,
          applies_to_services: true,
          updated_at: new Date().toISOString()
        })
        .eq('merchant_id', merchantData.merchant_id)
        .select()
        .single();

      if (updateError && updateError.code === 'PGRST116') {
        // No existing record found, insert new one
        const { data: insertData, error: insertError } = await supabase
          .from('tax_settings')
          .insert({
            merchant_id: merchantData.merchant_id,
            tax_name: newTaxName.trim(),
            tax_rate: taxRateDecimal,
            is_enabled: taxEnabled,
            auto_calculate: true,
            applies_to_products: true,
            applies_to_services: true,
            created_by: userData.user_id
          })
          .select()
          .single();
        
        data = insertData;
        error = insertError;
      } else {
        data = updateData;
        error = updateError;
      }

      if (error) {
        console.error('Database error saving tax settings:', error);
        alert(`Failed to save tax settings: ${error.message}`);
        return;
      }
      
      console.log('Tax settings saved successfully:', data);
      
      // Update local state with saved data
      const updatedSettings = {
        tax_id: data.tax_id,
        merchant_id: data.merchant_id,
        tax_rate: data.tax_rate,
        tax_name: data.tax_name,
        is_enabled: data.is_enabled,
        auto_calculate: data.auto_calculate,
        applies_to_products: data.applies_to_products,
        applies_to_services: data.applies_to_services,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
      
      setTaxSettings(updatedSettings);
      
      // Recalculate tax liability based on new rate and current net revenue
      const newTaxLiability = transactionData.total_revenue * taxRateDecimal;
      setTransactionData(prev => ({
        ...prev,
        tax_liability: newTaxLiability,
        total_tax_collected: newTaxLiability
      }));
      
      console.log('Tax recalculated:', {
        netRevenue: transactionData.total_revenue,
        newTaxRate: taxRateDecimal,
        newTaxLiability: newTaxLiability
      });
      
      alert('Tax settings saved successfully!');
    } catch (error) {
      console.error('Error saving tax settings:', error);
      alert('Failed to save tax settings. Please try again.');
    }
  };

  const calculateTaxAmount = (amount: number) => {
    return amount * taxSettings.tax_rate;
  };

  if (!userData || !merchantData) {
    return <div>Loading...</div>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading tax data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Taxes</h1>
          <p className="text-gray-600">
            Simple tax tracking for your business
          </p>
        </div>
      </div>

      {/* Tax Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${transactionData.total_revenue.toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              From {transactionData.transaction_count} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tax Collected</p>
                <p className="text-2xl font-bold text-blue-900">
                  ${transactionData.total_tax_collected.toLocaleString()}
                </p>
              </div>
              <Calculator className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              At {(taxSettings.tax_rate * 100).toFixed(1)}% rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Amount to Set Aside</p>
                <p className="text-2xl font-bold text-orange-900">
                  ${transactionData.tax_liability.toLocaleString()}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              For tax payments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Simple Tax Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Settings className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle>Tax Settings</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Configure your tax rate and preferences
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">
                {taxEnabled ? 'On' : 'Off'}
              </span>
              <Switch
                checked={taxEnabled}
                onCheckedChange={handleTaxToggle}
              />
            </div>
          </div>
        </CardHeader>

        {taxEnabled && (
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="50"
                  value={newTaxRate}
                  onChange={(e) => setNewTaxRate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="8.5"
                />
                <p className="text-xs text-gray-500 mt-1">Enter your local tax rate</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax Name
                </label>
                <input
                  type="text"
                  value={newTaxName}
                  onChange={(e) => setNewTaxName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Sales Tax"
                />
                <p className="text-xs text-gray-500 mt-1">What to call this tax</p>
              </div>
            </div>
            
            <Button onClick={handleSaveTaxSettings} className="w-full">
              Save Settings
            </Button>
            
            {/* Show Current Saved Settings */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Current Saved Settings</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax Name:</span>
                  <span className="font-medium">{taxSettings.tax_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax Rate:</span>
                  <span className="font-medium">{(taxSettings.tax_rate * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <Badge variant={taxSettings.is_enabled ? "default" : "secondary"}>
                    {taxSettings.is_enabled ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {taxSettings.updated_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Updated:</span>
                    <span className="text-xs text-gray-500">
                      {new Date(taxSettings.updated_at).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Quick Tax Calculator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calculator className="h-5 w-5 mr-2" />
            Quick Tax Calculator
          </CardTitle>
          <p className="text-sm text-gray-600">Calculate tax for any amount</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="100.00"
                onChange={(e) => {
                  const amount = parseFloat(e.target.value) || 0;
                  const taxAmount = calculateTaxAmount(amount);
                  const totalAmount = amount + taxAmount;
                  const taxInput = e.target.parentElement?.nextElementSibling?.querySelector('input') as HTMLInputElement;
                  const totalInput = e.target.parentElement?.nextElementSibling?.nextElementSibling?.querySelector('input') as HTMLInputElement;
                  if (taxInput) taxInput.value = taxAmount.toFixed(2);
                  if (totalInput) totalInput.value = totalAmount.toFixed(2);
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tax Amount ($)
              </label>
              <input
                type="text"
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total with Tax ($)
              </label>
              <input
                type="text"
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-medium"
                placeholder="0.00"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Simple Info */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 text-sm font-medium">💡</span>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">How it works</h3>
              <div className="mt-2 text-sm text-gray-600 space-y-1">
                <p>• Turn on tax tracking to see how much tax you've collected</p>
                <p>• Set your local tax rate (like 8.5% for sales tax)</p>
                <p>• The "Amount to Set Aside" shows what to save for tax payments</p>
                <p>• Always check with a tax professional for your specific situation</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Taxes;
