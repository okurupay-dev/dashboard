import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Plus, Minus, ArrowLeft, Save, Send, Eye } from 'lucide-react';
import { useInvoiceStore } from '../../stores/invoiceStore';
import { invoiceFormSchema, InvoiceFormData } from '../../schemas/invoiceSchemas';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { invoiceApi, InvoiceApiPayload } from '../../services/invoiceApi';

const InvoiceCreate: React.FC = () => {
  const navigate = useNavigate();
  const { userData, merchantData } = useAuth();
  const { createInvoice, mockWallets } = useInvoiceStore();
  const [activeTab, setActiveTab] = useState('details');
  const [loading, setLoading] = useState(false);
  const [verifiedWallets, setVerifiedWallets] = useState<any[]>([]);
  const [createdInvoice, setCreatedInvoice] = useState<any>(null);
  const [qrCodeData, setQrCodeData] = useState<string>('');

  const form = useForm({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      is_simple_amount: true,
      currency_mode: 'crypto',
      crypto_asset: 'USDC',
      chain: 'BASE',
      price_lock_secs: 900,
      min_confirmations: 1,
      allow_partial: false,
      tip_suggestions: [0, 10, 15],
      tax_inclusive: false,
      fee_payer: 'merchant',
      restricted_jurisdictions: false,
      line_items: [],
      customer_email: '',
      customer_name: '',
      customer_cc_emails: '',
      billing_address: {
        street: '',
        city: '',
        state: '',
        postal_code: '',
        country: ''
      },
      settlement_wallet_id: '',
      due_date: '',
      notes: '',
      tags: '',
      webhook_url: '',
      notification_email: '',
      send_email: true
    }
  });

  const { register, handleSubmit, watch, setValue, formState: { errors } } = form;
  const watchedValues = watch();

  // Load verified wallets from database
  const loadVerifiedWallets = async () => {
    if (!userData || !merchantData) return;
    
    try {
      const { data, error } = await supabase
        .from('wallet_addresses')
        .select(`
          address_id,
          blockchain,
          address,
          is_verified,
          verified_at,
          merchant_wallets!inner(merchant_id)
        `)
        .eq('merchant_wallets.merchant_id', merchantData.merchant_id)
        .eq('is_verified', true)
        .eq('blockchain', 'Base')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setVerifiedWallets(data || []);
      
      // Auto-select first verified wallet if available
      if (data && data.length > 0 && !watchedValues.settlement_wallet_id) {
        setValue('settlement_wallet_id', data[0].address_id);
      }
    } catch (err: any) {
      console.error('Error loading verified wallets:', err);
    }
  };

  useEffect(() => {
    if (userData && merchantData) {
      loadVerifiedWallets();
    }
  }, [userData, merchantData]);

  const tabs = [
    { id: 'details', label: 'Details' },
    { id: 'payment', label: 'Payment' },
    { id: 'customer', label: 'Customer' },
    { id: 'settlement', label: 'Settlement' },
    { id: 'policy', label: 'Policy' },
    { id: 'preview', label: 'Preview' }
  ];

  const onSubmit = async (data: InvoiceFormData, isDraft = false) => {
    if (!merchantData || !userData) return;

    try {
      setLoading(true);
      
      // Process comma-separated strings for arrays
      const processedCCEmails = data.customer_cc_emails ? 
        data.customer_cc_emails.split(',').map(email => email.trim()).filter(email => email) : [];
      
      const processedTags = data.tags ? 
        data.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

      const payload: InvoiceApiPayload = {
        // Basic info
        title: data.title,
        description: data.description,
        
        // Amount structure
        is_simple_amount: data.is_simple_amount,
        simple_amount: data.simple_amount,
        line_items: data.line_items || [],
        
        // Payment configuration
        currency_mode: "crypto" as const,
        crypto_asset: data.crypto_asset || 'USDC',
        chain: "BASE" as const,
        price_lock_secs: data.price_lock_secs || 900,
        min_confirmations: data.min_confirmations || 1,
        allow_partial: data.allow_partial || false,
        
        // Customer details
        customer_email: data.customer_email,
        customer_name: data.customer_name,
        customer_cc_emails: processedCCEmails,
        billing_address: data.billing_address?.street ? data.billing_address : undefined,
        
        // Settlement & metadata
        settlement_wallet_id: data.settlement_wallet_id,
        fee_payer: "merchant",
        due_date: data.due_date,
        notes: data.notes,
        tags: processedTags,
        
        // Notifications
        webhook_url: data.webhook_url,
        notification_email: data.notification_email,
        send_email: data.send_email !== false,
        
        // Policy
        terms_conditions: data.terms_url,
        refund_policy: data.refund_policy_url,
        
        // Status
        status: (isDraft ? 'draft' : 'sent') as 'draft' | 'sent'
      };

      const result = await invoiceApi.createInvoice(payload);
      console.log('Invoice created:', result);
      
      // Store created invoice for QR code and pay link
      setCreatedInvoice(result);
      
      // Generate QR code if not draft
      if (!isDraft && result.id) {
        try {
          const qrResult = await invoiceApi.getQRCode(result.id);
          setQrCodeData(qrResult.qr_code_data);
        } catch (qrError) {
          console.error('Error generating QR code:', qrError);
        }
      }
      
      // Only redirect if it's a draft, otherwise stay on preview
      if (isDraft) {
        navigate('/invoices');
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
    } finally {
      setLoading(false);
    }
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
                    <div className="flex items-center space-x-4 mb-4">
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

                    {!watchedValues.is_simple_amount && (
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
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-blue-700">
                      Only stablecoins are supported for payments. Select your preferred stablecoin and network.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Stablecoin *
                      </label>
                      <select
                        {...register('crypto_asset')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="USDC">USDC</option>
                        <option value="USDT">USDT</option>
                        <option value="DAI">DAI</option>
                        <option value="USDbC">USDbC</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Network *
                      </label>
                      <select
                        {...register('chain')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="BASE">Base</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        {...register('amount_crypto', { valueAsNumber: true })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CC Emails (Optional)
                    </label>
                    <input
                      type="text"
                      {...register('customer_cc_emails')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="email1@example.com, email2@example.com"
                    />
                    <p className="text-sm text-gray-500 mt-1">Separate multiple emails with commas</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Billing Address (Optional)</h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                        <input
                          {...register('billing_address.street')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="123 Main St"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                          <input
                            {...register('billing_address.city')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="New York"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                          <input
                            {...register('billing_address.state')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="NY"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                          <input
                            {...register('billing_address.postal_code')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="10001"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                          <input
                            {...register('billing_address.country')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="United States"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Settlement Tab */}
              {activeTab === 'settlement' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Settlement Wallet
                    </label>
                    {verifiedWallets.length > 0 ? (
                      <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-gray-900">Base Network</span>
                            <p className="text-sm text-gray-600">
                              {verifiedWallets[0].address.slice(0, 8)}...{verifiedWallets[0].address.slice(-6)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm text-green-600 font-medium">Verified</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full px-3 py-2 border border-red-200 rounded-md bg-red-50">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span className="text-sm text-red-600">No verified Base wallet found</span>
                        </div>
                        <p className="text-xs text-red-500 mt-1">
                          Please verify a Base network wallet in the Wallets section first
                        </p>
                      </div>
                    )}
                    <input
                      type="hidden"
                      {...register('settlement_wallet_id')}
                      value={verifiedWallets[0]?.address_id || ''}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Due Date (Optional)
                    </label>
                    <input
                      type="date"
                      {...register('due_date')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Internal Notes (Optional)
                    </label>
                    <textarea
                      {...register('notes')}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Internal notes for this invoice..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tags (Optional)
                    </label>
                    <input
                      type="text"
                      {...register('tags')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="tag1, tag2, tag3"
                    />
                    <p className="text-sm text-gray-500 mt-1">Separate tags with commas</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Webhook URL (Optional)
                    </label>
                    <input
                      type="url"
                      {...register('webhook_url')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://your-site.com/webhook"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notification Email (Optional)
                    </label>
                    <input
                      type="email"
                      {...register('notification_email')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="notifications@yourcompany.com"
                    />
                  </div>

                  <div className="flex items-center">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        {...register('send_email')}
                        className="mr-2"
                      />
                      Send email to customer automatically
                    </label>
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
                </div>
              )}

              {/* Preview Tab */}
              {activeTab === 'preview' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium mb-4">Invoice Preview</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="font-medium">Title:</span>
                        <span>{watchedValues.title || 'Untitled Invoice'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Customer:</span>
                        <span>{watchedValues.customer_name || 'Not set'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Email:</span>
                        <span>{watchedValues.customer_email || 'Not set'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Amount:</span>
                        <span>
                          {`${watchedValues.amount_crypto || watchedValues.simple_amount || 0} ${watchedValues.crypto_asset}`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Chain:</span>
                        <span>{watchedValues.chain}</span>
                      </div>
                      {watchedValues.due_date && (
                        <div className="flex justify-between">
                          <span className="font-medium">Due Date:</span>
                          <span>{new Date(watchedValues.due_date).toLocaleDateString()}</span>
                        </div>
                      )}
                      {watchedValues.description && (
                        <div className="flex justify-between">
                          <span className="font-medium">Description:</span>
                          <span className="text-right max-w-xs truncate">{watchedValues.description}</span>
                        </div>
                      )}
                      {watchedValues.tags && (
                        <div className="flex justify-between">
                          <span className="font-medium">Tags:</span>
                          <span className="text-right">{watchedValues.tags.split(',').map(tag => tag.trim()).join(', ')}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                          {qrCodeData ? (
                            <img 
                              src={qrCodeData} 
                              alt="Payment QR Code" 
                              className="w-full h-full object-contain rounded"
                            />
                          ) : (
                            <span className="text-xs text-gray-500">QR Code</span>
                          )}
                        </div>
                      </div>
                      <Button 
                        className="w-full mt-4" 
                        variant="outline"
                        onClick={() => {
                          if (createdInvoice?.public_url) {
                            navigator.clipboard.writeText(createdInvoice.public_url);
                            alert('Pay link copied to clipboard!');
                          } else {
                            alert('Create invoice first to get pay link');
                          }
                        }}
                      >
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
                    onClick={(e) => {
                      e.preventDefault();
                      handleSubmit((data: InvoiceFormData) => onSubmit(data, true))();
                    }}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Draft
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={activeTab !== 'preview'}
                  >
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
                  {`${watchedValues.amount_crypto || watchedValues.simple_amount || 0} ${watchedValues.crypto_asset || 'USDC'}`}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Settlement:</span>
                <div className="font-medium">
                  {verifiedWallets.find(w => w.address_id === watchedValues.settlement_wallet_id)?.address.slice(0, 6) + '...' + verifiedWallets.find(w => w.address_id === watchedValues.settlement_wallet_id)?.address.slice(-4) || 'Not selected'}
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
