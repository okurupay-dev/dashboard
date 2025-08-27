import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Plus, Minus, ArrowLeft, Save, Send, Eye } from 'lucide-react';
import { useInvoiceStore } from '../../stores/invoiceStore';
import { invoiceFormSchema, InvoiceFormData } from '../../schemas/invoiceSchemas';
import { useAuth } from '../../contexts/AuthContext';

const InvoiceCreate: React.FC = () => {
  const navigate = useNavigate();
  const { userData, merchantData } = useAuth();
  const { createInvoice, mockWallets } = useInvoiceStore();
  const [activeTab, setActiveTab] = useState('details');
  const [showPreview, setShowPreview] = useState(false);

  const form = useForm({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      is_simple_amount: true,
      currency_mode: 'fiat',
      fiat_currency: 'USD',
      price_lock_secs: 900,
      min_confirmations: 1,
      allow_partial: false,
      tip_suggestions: [0, 10, 15],
      tax_inclusive: false,
      fee_payer: 'merchant',
      restricted_jurisdictions: false,
      line_items: [],
      customer_email: '',
      settlement_wallet_id: ''
    }
  });

  const { register, handleSubmit, watch, setValue, formState: { errors } } = form;
  const watchedValues = watch();

  const tabs = [
    { id: 'details', label: 'Details' },
    { id: 'payment', label: 'Payment' },
    { id: 'customer', label: 'Customer' },
    { id: 'settlement', label: 'Settlement' },
    { id: 'policy', label: 'Policy' },
    { id: 'preview', label: 'Preview' }
  ];

  const onSubmit = (data: InvoiceFormData, isDraft = false) => {
    if (!merchantData || !userData) return;

    const invoice = createInvoice({
      ...data,
      status: isDraft ? 'draft' : 'sent',
      merchant_id: merchantData.merchant_id,
      created_by: userData.user_id,
      line_items: data.line_items || [],
      subtotal: 0,
      tax_amount: 0,
      discount_amount: 0,
      total_amount: 0
    });

    if (!isDraft) {
      alert('Invoice created and sent successfully!');
    } else {
      alert('Invoice saved as draft!');
    }

    navigate('/invoices');
  };

  const addLineItem = () => {
    const currentItems = watchedValues.line_items || [];
    setValue('line_items', [
      ...currentItems,
      {
        id: `item_${Date.now()}`,
        name: '',
        quantity: 1,
        unit_price: 0
      }
    ]);
  };

  const removeLineItem = (index: number) => {
    const currentItems = watchedValues.line_items || [];
    setValue('line_items', currentItems.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => navigate('/invoices')}
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Invoices
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create Invoice</h1>
            <p className="text-gray-600">Create a new one-time invoice</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-3">
          <Card className="p-6">
            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <form onSubmit={handleSubmit((data: InvoiceFormData) => onSubmit(data, false))}>
              {/* Details Tab */}
              {activeTab === 'details' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title (Optional)
                    </label>
                    <input
                      {...register('title')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Invoice title"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (Optional)
                    </label>
                    <textarea
                      {...register('description')}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Invoice description"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          {...register('is_simple_amount')}
                          value="true"
                          className="mr-2"
                        />
                        Simple Amount
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          {...register('is_simple_amount')}
                          value="false"
                          className="mr-2"
                        />
                        Line Items
                      </label>
                    </div>

                    {watchedValues.is_simple_amount ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Amount *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          {...register('simple_amount', { valueAsNumber: true })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                        {errors.simple_amount && (
                          <p className="text-red-600 text-sm mt-1">{errors.simple_amount.message}</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-medium">Line Items</h3>
                          <Button type="button" onClick={addLineItem} size="sm">
                            <Plus className="h-4 w-4 mr-1" />
                            Add Item
                          </Button>
                        </div>
                        
                        {(watchedValues.line_items || []).map((item, index) => (
                          <div key={index} className="grid grid-cols-12 gap-4 items-end">
                            <div className="col-span-4">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Item Name
                              </label>
                              <input
                                {...register(`line_items.${index}.name`)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Item name"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Qty
                              </label>
                              <input
                                type="number"
                                {...register(`line_items.${index}.quantity`, { valueAsNumber: true })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                min="1"
                              />
                            </div>
                            <div className="col-span-3">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Unit Price
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                {...register(`line_items.${index}.unit_price`, { valueAsNumber: true })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                min="0"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tax %
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                {...register(`line_items.${index}.tax_rate`, { valueAsNumber: true })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                min="0"
                                max="100"
                              />
                            </div>
                            <div className="col-span-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeLineItem(index)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Payment Tab */}
              {activeTab === 'payment' && (
                <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        {...register('currency_mode')}
                        value="fiat"
                        className="mr-2"
                      />
                      Fiat Currency
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        {...register('currency_mode')}
                        value="crypto"
                        className="mr-2"
                      />
                      Cryptocurrency
                    </label>
                  </div>

                  {watchedValues.currency_mode === 'fiat' ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Currency *
                        </label>
                        <select
                          {...register('fiat_currency')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="JPY">JPY</option>
                          <option value="THB">THB</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Amount *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          {...register('amount_fiat', { valueAsNumber: true })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Asset *
                        </label>
                        <select
                          {...register('crypto_asset')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select Asset</option>
                          <option value="USDC">USDC</option>
                          <option value="USDT">USDT</option>
                          <option value="ETH">ETH</option>
                          <option value="BTC">BTC</option>
                          <option value="SOL">SOL</option>
                          <option value="ADA">ADA</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Chain *
                        </label>
                        <select
                          {...register('chain')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select Chain</option>
                          <option value="ETHEREUM">Ethereum</option>
                          <option value="BASE">Base</option>
                          <option value="SOLANA">Solana</option>
                          <option value="CARDANO">Cardano</option>
                          <option value="AVALANCHE">Avalanche</option>
                          <option value="APTOS">Aptos</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Amount *
                        </label>
                        <input
                          type="number"
                          step="0.000001"
                          {...register('amount_crypto', { valueAsNumber: true })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0.000000"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Price Lock (seconds)
                      </label>
                      <input
                        type="number"
                        {...register('price_lock_secs', { valueAsNumber: true })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="60"
                        max="3600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Min Confirmations
                      </label>
                      <input
                        type="number"
                        {...register('min_confirmations', { valueAsNumber: true })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        max="12"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        {...register('allow_partial')}
                        className="mr-2"
                      />
                      Allow Partial Payments
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        {...register('tax_inclusive')}
                        className="mr-2"
                      />
                      Tax Inclusive
                    </label>
                  </div>
                </div>
              )}

              {/* Customer Tab */}
              {activeTab === 'customer' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Customer Email *
                      </label>
                      <input
                        type="email"
                        {...register('customer_email')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="customer@example.com"
                      />
                      {errors.customer_email && (
                        <p className="text-red-600 text-sm mt-1">{errors.customer_email.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Customer Name (Optional)
                      </label>
                      <input
                        {...register('customer_name')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Customer name"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Settlement Tab */}
              {activeTab === 'settlement' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Settlement Wallet *
                      <span className="ml-2 inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                        required
                      </span>
                    </label>
                    <select
                      {...register('settlement_wallet_id')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Wallet</option>
                      {mockWallets.map((wallet) => (
                        <option key={wallet.id} value={wallet.id}>
                          {wallet.name} ({wallet.asset}) - {wallet.balance.toFixed(2)}
                        </option>
                      ))}
                    </select>
                    {errors.settlement_wallet_id && (
                      <p className="text-red-600 text-sm mt-1">{errors.settlement_wallet_id.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fee Payer
                    </label>
                    <select
                      {...register('fee_payer')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="merchant">Merchant</option>
                      <option value="customer">Customer</option>
                      <option value="split">Split</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Policy Tab */}
              {activeTab === 'policy' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Terms URL (Optional)
                      </label>
                      <input
                        type="url"
                        {...register('terms_url')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://example.com/terms"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Refund Policy URL (Optional)
                      </label>
                      <input
                        type="url"
                        {...register('refund_policy_url')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://example.com/refund"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        {...register('restricted_jurisdictions')}
                        className="mr-2"
                      />
                      Restricted Jurisdictions
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      KYC Threshold (Optional)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      {...register('kyc_threshold', { valueAsNumber: true })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="1000.00"
                    />
                  </div>
                </div>
              )}

              {/* Preview Tab */}
              {activeTab === 'preview' && (
                <div className="space-y-6">
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-lg font-medium mb-4">Invoice Preview</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="font-medium">Title:</span>
                        <span>{watchedValues.title || 'Untitled Invoice'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Customer:</span>
                        <span>{watchedValues.customer_name || watchedValues.customer_email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Amount:</span>
                        <span>
                          {watchedValues.currency_mode === 'fiat' 
                            ? `${watchedValues.fiat_currency} ${watchedValues.amount_fiat || watchedValues.simple_amount || 0}`
                            : `${watchedValues.amount_crypto || watchedValues.simple_amount || 0} ${watchedValues.crypto_asset}`
                          }
                        </span>
                      </div>
                      {watchedValues.currency_mode === 'crypto' && (
                        <div className="flex justify-between">
                          <span className="font-medium">Chain:</span>
                          <span>{watchedValues.chain}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-blue-800">Quote valid for 15 minutes</span>
                        <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                          <span className="text-xs text-gray-500">QR Code</span>
                        </div>
                      </div>
                      <Button className="w-full mt-4" variant="outline">
                        Copy Pay Link
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex justify-between pt-6 border-t border-gray-200">
                <div className="flex space-x-3">
                  {activeTab !== 'details' && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
                        if (currentIndex > 0) {
                          setActiveTab(tabs[currentIndex - 1].id);
                        }
                      }}
                    >
                      Previous
                    </Button>
                  )}
                  {activeTab !== 'preview' && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
                        if (currentIndex < tabs.length - 1) {
                          setActiveTab(tabs[currentIndex + 1].id);
                        }
                      }}
                    >
                      Next
                    </Button>
                  )}
                </div>
                
                <div className="flex space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSubmit((data: InvoiceFormData) => onSubmit(data, true))}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Draft
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                    <Send className="h-4 w-4 mr-2" />
                    Create & Send
                  </Button>
                </div>
              </div>
            </form>
          </Card>
        </div>

        {/* Sidebar Preview */}
        <div className="lg:col-span-1">
          <Card className="p-4 sticky top-6">
            <h3 className="font-medium mb-4">Quick Preview</h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-600">Customer:</span>
                <div className="font-medium">{watchedValues.customer_name || 'Not set'}</div>
                <div className="text-gray-500">{watchedValues.customer_email || 'Not set'}</div>
              </div>
              <div>
                <span className="text-gray-600">Amount:</span>
                <div className="font-medium">
                  {watchedValues.currency_mode === 'fiat' 
                    ? `${watchedValues.fiat_currency || 'USD'} ${watchedValues.amount_fiat || watchedValues.simple_amount || 0}`
                    : `${watchedValues.amount_crypto || watchedValues.simple_amount || 0} ${watchedValues.crypto_asset || 'N/A'}`
                  }
                </div>
              </div>
              <div>
                <span className="text-gray-600">Settlement:</span>
                <div className="font-medium">
                  {mockWallets.find(w => w.id === watchedValues.settlement_wallet_id)?.name || 'Not selected'}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InvoiceCreate;
