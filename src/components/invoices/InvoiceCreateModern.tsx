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
  onSubmit?: (data: any, isDraft: boolean) => Promise<any>;
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

  // Default onSubmit implementation if not provided
  const defaultOnSubmit = async (data: any, isDraft: boolean) => {
    try {
      setLoading(true);
      
      if (isDraft) {
        // Save as draft using Supabase
        const draftData = {
          merchant_id: merchantData?.merchant_id,
          created_by: userData?.auth_user_id || '',
          title: data.title,
          description: data.description,
          notes: data.notes,
          customer_email: data.customer_email,
          customer_name: data.customer_name,
          simple_amount: data.simple_amount || 0,
          crypto_currency: data.crypto_asset || 'USDC',
          crypto_chain: 'BASE',
          status: 'draft'
        };
        
        const result = await invoiceService.saveDraft(draftData as any, merchantData?.merchant_id || '', userData?.auth_user_id || '');
        console.log('Draft saved:', result);
        navigate('/invoices');
        return result;
      } else {
        // Send invoice using API
        const invoiceData: InvoiceApiPayload = {
          title: data.title,
          description: data.description,
          customer_email: data.customer_email,
          customer_name: data.customer_name,
          simple_amount: data.simple_amount || 0,
          crypto_currency: data.crypto_asset || 'USDC',
          crypto_chain: 'BASE',
          send_email: data.send_email !== false,
          is_simple_amount: true,
          currency_mode: 'crypto',
          status: 'sent',
          // Required fields for API
          subtotal: data.simple_amount || 0,
          tax_amount: 0,
          discount_amount: 0,
          total_amount: data.simple_amount || 0,
          // Additional required fields
          chain: 'BASE',
          notes: data.notes || '',
          tags: data.tags ? data.tags.split(',').map((t: string) => t.trim()) : [],
          webhook_url: data.webhook_url || '',
          notification_email: data.notification_email || ''
        };
        
        const result = await invoiceApi.createInvoice(invoiceData);
        console.log('Invoice created:', result);
        
        if (!data.send_email) {
          // Return result for link generation
          return result;
        } else {
          navigate('/invoices');
        }
        return result;
      }
    } catch (error) {
      console.error('Error submitting invoice:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = onSubmit || defaultOnSubmit;

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
      send_email: true,
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
          notes: data.notes || '',
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
      handleSubmit(data, true);
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
      handleSubmit(modifiedData, false).then((result: any) => {
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
      handleSubmit(data, false);
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
      <div className="flex-1 max-w-4xl mx-auto p-8">
        <form onSubmit={form.handleSubmit((data) => (onSubmit || defaultOnSubmit)(data, false))} className="space-y-8">
            {/* Invoice Details Section */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-600" />
                Invoice Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="title">Invoice Title</Label>
                  <Input
                    id="title"
                    {...form.register('title')}
                    placeholder="Enter invoice title"
                  />
                </div>
                <div>
                  <Label htmlFor="simple_amount">Amount (USD)</Label>
                  <Input
                    id="simple_amount"
                    type="number"
                    step="0.01"
                    {...form.register('simple_amount', { valueAsNumber: true })}
                    placeholder="0.00"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...form.register('description')}
                    placeholder="Enter invoice description"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Customer Information Section */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <User className="h-5 w-5 mr-2 text-green-600" />
                Customer Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="customer_name">Customer Name</Label>
                  <Input
                    id="customer_name"
                    {...form.register('customer_name')}
                    placeholder="Enter customer name"
                  />
                </div>
                <div>
                  <Label htmlFor="customer_email">Customer Email</Label>
                  <Input
                    id="customer_email"
                    type="email"
                    {...form.register('customer_email')}
                    placeholder="customer@email.com"
                  />
                </div>
              </div>
            </div>

            {/* Payment Settings Section */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-purple-600" />
                Payment Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    {...form.register('notes')}
                    placeholder="Internal notes (optional)"
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Invoice Preview */}
            <div className="bg-gray-50 rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Eye className="h-5 w-5 mr-2 text-gray-600" />
                Preview
              </h3>
              <div className="bg-white rounded-lg p-4 border">
                <h4 className="font-medium text-lg">{form.watch('title') || 'Invoice Title'}</h4>
                <p className="text-sm text-gray-600 mt-1">{form.watch('description') || 'Invoice description'}</p>
                <div className="mt-3 pt-3 border-t">
                  <div className="flex justify-between">
                    <span>Amount:</span>
                    <span className="font-medium">${form.watch('simple_amount') || '0.00'} USDC</span>
                  </div>
                </div>
              </div>
            </div>
        </form>
      </div>
    </div>
  );
};

export default InvoiceCreateModern;
