import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
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
import { Calculator, DollarSign, TrendingUp, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface TaxSettings {
  tax_id: string;
  merchant_id: string;
  tax_rate: number;
  tax_name: string;
  is_enabled: boolean;
  auto_calculate: boolean;
  created_at: string;
  updated_at: string;
}

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
  const [taxSettings, setTaxSettings] = useState<TaxSettings>({
    tax_id: '',
    merchant_id: merchantData?.merchant_id || '',
    tax_rate: 8.5,
    tax_name: 'Sales Tax',
    is_enabled: false,
    auto_calculate: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  const [transactionData, setTransactionData] = useState<TransactionData>({
    total_revenue: 12450.75,
    total_tax_collected: 1058.31,
    tax_liability: 1058.31,
    transaction_count: 156
  });

  const [newTaxRate, setNewTaxRate] = useState(taxSettings.tax_rate.toString());
  const [newTaxName, setNewTaxName] = useState(taxSettings.tax_name);

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

  const handleSaveTaxSettings = () => {
    const updatedSettings = {
      ...taxSettings,
      tax_rate: parseFloat(newTaxRate) || 0,
      tax_name: newTaxName,
      updated_at: new Date().toISOString()
    };
    
    setTaxSettings(updatedSettings);
    
    // Recalculate tax liability based on new rate
    const newTaxLiability = (transactionData.total_revenue * updatedSettings.tax_rate) / 100;
    setTransactionData(prev => ({
      ...prev,
      tax_liability: newTaxLiability,
      total_tax_collected: newTaxLiability
    }));
    
    alert('Tax settings saved successfully!');
  };

  const calculateTaxAmount = (amount: number) => {
    return (amount * taxSettings.tax_rate) / 100;
  };

  if (!userData || !merchantData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tax Management</h1>
          <p className="text-gray-600 mt-2">
            Configure tax settings and track tax liability for your transactions
          </p>
        </div>
      </div>

      {/* Tax Toggle Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Calculator className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle>Tax Management</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Enable automatic tax calculation and tracking
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">
                  {taxEnabled ? 'Enabled' : 'Disabled'}
                </span>
                <Switch
                  checked={taxEnabled}
                  onCheckedChange={handleTaxToggle}
                />
              </div>
              {taxEnabled && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-2"
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {taxEnabled && isExpanded && (
          <CardContent className="space-y-6">
            {/* Tax Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Tax Configuration
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tax Name
                    </label>
                    <input
                      type="text"
                      value={newTaxName}
                      onChange={(e) => setNewTaxName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Sales Tax, VAT"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={newTaxRate}
                      onChange={(e) => setNewTaxRate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="8.5"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={taxSettings.auto_calculate}
                      onCheckedChange={(checked: boolean) => 
                        setTaxSettings(prev => ({ ...prev, auto_calculate: checked }))
                      }
                    />
                    <span className="text-sm font-medium">Auto-calculate tax on transactions</span>
                  </div>
                  
                  <Button onClick={handleSaveTaxSettings} className="w-full">
                    Save Tax Settings
                  </Button>
                </div>
              </div>

              {/* Current Settings Display */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Current Settings</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Tax Name:</span>
                    <Badge variant="secondary">{taxSettings.tax_name}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Tax Rate:</span>
                    <Badge variant="secondary">{taxSettings.tax_rate}%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Auto Calculate:</span>
                    <Badge variant={taxSettings.auto_calculate ? "default" : "secondary"}>
                      {taxSettings.auto_calculate ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Status:</span>
                    <Badge variant={taxSettings.is_enabled ? "default" : "secondary"}>
                      {taxSettings.is_enabled ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Tax Analytics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
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
                    At {taxSettings.tax_rate}% rate
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Tax Liability</p>
                      <p className="text-2xl font-bold text-orange-900">
                        ${transactionData.tax_liability.toLocaleString()}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-orange-600" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Amount to hold for taxes
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Tax Calculator */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calculator className="h-5 w-5 mr-2" />
                  Tax Calculator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Transaction Amount ($)
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
                        const nextSibling = e.target.parentElement?.nextElementSibling?.querySelector('input') as HTMLInputElement;
                        if (nextSibling) {
                          nextSibling.value = taxAmount.toFixed(2);
                        }
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
                </div>
              </CardContent>
            </Card>
          </CardContent>
        )}
      </Card>

      {/* Information Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 text-sm font-medium">i</span>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">Tax Management Information</h3>
              <div className="mt-2 text-sm text-gray-600 space-y-1">
                <p>• Enable tax management to automatically calculate and track taxes on your transactions</p>
                <p>• For non-custodial processes, you can view tax amounts without automatic collection</p>
                <p>• Tax liability shows the amount you should hold aside for tax payments</p>
                <p>• Consult with a tax professional for specific tax requirements in your jurisdiction</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Taxes;
