import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import SavedContacts from './SavedContacts';
import { 
  Plus, 
  Minus, 
  ArrowLeft, 
  Save, 
  Send, 
  Eye, 
  Grid3X3,
  User,
  Mail,
  X,
  Calendar,
  Clock,
  DollarSign,
  Settings,
  HelpCircle,
  Bell,
  Search,
  FileText,
  Trash2,
  Download,
  Link,
  Copy
} from 'lucide-react';
import { useInvoiceStore } from '../../stores/invoiceStore';
import { invoiceFormSchema, InvoiceFormData } from '../../schemas/invoiceSchemas';
import { useAuth } from '../../contexts/AuthContext';
import { invoiceApi, InvoiceApiPayload } from '../../services/invoiceApi';
import { invoiceService } from '../../services/invoiceService';
import { supabase } from '../../lib/supabase';

interface LineItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unit_price: number;
  image?: string;
}

interface InvoiceCreateModernProps {
  onSubmit: (data: any, isDraft: boolean) => Promise<any>;
}

const InvoiceCreateModern: React.FC<InvoiceCreateModernProps> = ({ onSubmit }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userData, merchantData } = useAuth();
  const { createInvoice, mockWallets } = useInvoiceStore();
  const [activeSection, setActiveSection] = useState('details');
  const [loading, setLoading] = useState(false);
  const [verifiedWallets, setVerifiedWallets] = useState<any[]>([]);
  const [createdInvoice, setCreatedInvoice] = useState<any>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [showLinkNotification, setShowLinkNotification] = useState(false);
  const [paymentLink, setPaymentLink] = useState('');

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
      title: 'Electronic purchasing',
      description: '',
      simple_amount: 0
    }
  });

  // Calculate totals from line items
  const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const taxAmount = subtotal * 0.1; // 10% tax for example
  const total = subtotal + taxAmount;

  // Load existing draft data if editing
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId) {
      loadDraftData(editId);
    }
  }, [searchParams]);

  const loadDraftData = async (invoiceId: string) => {
    try {
      const { data, error } = await supabase
        .from('standalone_invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (error) {
        console.error('Error loading draft:', error);
        return;
      }

      if (data) {
        // Populate form with existing data
        form.reset({
          title: data.title || '',
          description: data.description || '',
          customer_name: data.customer_name || '',
          customer_email: data.customer_email || '',
          simple_amount: data.simple_amount || 0,
          crypto_asset: data.crypto_currency || 'USDC',
          chain: data.crypto_chain || 'BASE',
          due_date: data.due_date || '',
          // ... other fields
        });

        // Load line items if they exist
        if (data.line_items && Array.isArray(data.line_items)) {
          setLineItems(data.line_items);
        }
      }
    } catch (error) {
      console.error('Error loading draft data:', error);
    }
  };

  // Load verified wallets
  useEffect(() => {
    const loadVerifiedWallets = async () => {
      try {
        if (merchantData?.merchant_id) {
          const wallets = await invoiceService.getVerifiedWallets(merchantData.merchant_id);
          setVerifiedWallets(wallets);
        } else {
          setVerifiedWallets(mockWallets);
        }
      } catch (error) {
        console.error('Error loading verified wallets:', error);
        setVerifiedWallets(mockWallets);
      }
    };

    if (merchantData?.merchant_id) {
      loadVerifiedWallets();
    }
  }, [merchantData, mockWallets]);

  // Line item management functions
  const addLineItem = () => {
    const newItem: LineItem = {
      id: Date.now().toString(),
      name: '',
      description: '',
      quantity: 1,
      unit_price: 0
    };
    setLineItems([...lineItems, newItem]);
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(lineItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const handleSaveAsDraft = () => {
    console.log('Save as Draft clicked');
    form.handleSubmit((data) => {
      onSubmit(data, true);
    }, (errors) => {
      console.log('Form validation errors:', JSON.stringify(errors, null, 2));
    })();
  };

  const handleCreateLink = () => {
    console.log('Create Invoice Link clicked');
    form.handleSubmit((data) => {
      // Create invoice without sending email and show link notification
      const modifiedData = { ...data, send_email: false };
      
      // Create invoice and handle link creation
      onSubmit(modifiedData, false).then((result: any) => {
        if (result?.public_id) {
          const link = `${window.location.origin}/pay/${result.public_id}`;
          setPaymentLink(link);
          setShowLinkNotification(true);
        }
      }).catch((error: any) => {
        console.error('Error creating invoice link:', error);
      });
    }, (errors) => {
      console.log('Form validation errors:', JSON.stringify(errors, null, 2));
    })();
  };

  const handleSendInvoice = () => {
    console.log('Send Invoice clicked');
    form.handleSubmit((data) => {
      onSubmit(data, false);
    }, (errors) => {
      console.log('Form validation errors:', JSON.stringify(errors, null, 2));
    })();
  };

  const sidebarSections = [
    { id: 'details', label: 'Invoice Details', icon: FileText },
    { id: 'customer', label: 'Customer Info', icon: User },
    { id: 'items', label: 'Line Items', icon: Grid3X3 },
    { id: 'payment', label: 'Payment Settings', icon: DollarSign },
    { id: 'preview', label: 'Preview', icon: Eye },
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Link copied to clipboard!');
  };

  // Link Notification Modal Component
  const LinkNotificationModal = () => {
    if (!showLinkNotification) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-green-600">Invoice Link Created!</h3>
            <button
              onClick={() => setShowLinkNotification(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-gray-600 mb-4">
            Your invoice payment link has been created. Share this link with your customer:
          </p>
          <div className="bg-gray-50 p-3 rounded border mb-4">
            <p className="text-sm font-mono break-all">{paymentLink}</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => copyToClipboard(paymentLink)}
              className="flex-1"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Link
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowLinkNotification(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Rest of the component with all the render functions...
  return (
    <div className="min-h-screen bg-gray-50">
      <LinkNotificationModal />
      
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/invoices')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Invoices</span>
              <span className="text-gray-400">/</span>
              <span className="font-medium">Create Invoice</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input placeholder="Search..." className="pl-10 w-64" />
            </div>
            <Button variant="outline" onClick={handleSaveAsDraft} disabled={loading}>
              Save as Draft
            </Button>
            <Button variant="outline" onClick={handleCreateLink} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white">
              Create Invoice Link
            </Button>
            <Button onClick={handleSendInvoice} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              Send Invoice
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-120px)] p-6">
        {/* Left Sidebar */}
        <div className="col-span-1 bg-white rounded-lg shadow-sm border p-4">
          <div className="space-y-2">
            {sidebarSections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full p-3 rounded-lg flex flex-col items-center gap-2 text-xs transition-colors ${
                    activeSection === section.id
                      ? 'bg-blue-50 text-blue-600 border border-blue-200'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-center leading-tight">{section.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="col-span-7 bg-white rounded-lg shadow-sm border p-6 overflow-y-auto">
          {activeSection === 'details' && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="title">Invoice Title</Label>
                <Input
                  {...form.register('title')}
                  placeholder="Enter invoice title"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  {...form.register('description')}
                  placeholder="Enter invoice description"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="simple_amount">Amount (USDC)</Label>
                <Input
                  {...form.register('simple_amount', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>

            </div>
          )}

          {activeSection === 'customer' && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="customer_name">Customer Name</Label>
                <Input
                  {...form.register('customer_name')}
                  placeholder="Enter customer name"
                />
              </div>
              
              <div>
                <Label htmlFor="customer_email">Customer Email</Label>
                <Input
                  {...form.register('customer_email')}
                  type="email"
                  placeholder="customer@email.com"
                />
              </div>
            </div>
          )}

          {activeSection === 'payment' && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="crypto_asset">Cryptocurrency</Label>
                <Select value={form.watch('crypto_asset') || 'USDC'} onValueChange={(value) => form.setValue('crypto_asset', value as 'USDC' | 'USDT' | 'DAI' | 'USDbC')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select cryptocurrency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USDC">USDC</SelectItem>
                    <SelectItem value="USDT">USDT</SelectItem>
                    <SelectItem value="DAI">DAI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Preview Panel */}
        <div className="col-span-4 bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4">Invoice Preview</h3>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium">{form.watch('title') || 'Invoice Title'}</h4>
              <p className="text-sm text-gray-600 mt-1">{form.watch('description') || 'Invoice description'}</p>
              <div className="mt-3 pt-3 border-t">
                <div className="flex justify-between">
                  <span>Amount:</span>
                  <span className="font-medium">${form.watch('simple_amount') || '0.00'} USDC</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceCreateModern;
