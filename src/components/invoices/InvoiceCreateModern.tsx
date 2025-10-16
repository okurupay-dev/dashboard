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

// Utility function to safely stringify objects avoiding circular references
const safeStringify = (obj: any, maxDepth = 3, currentDepth = 0): any => {
  if (currentDepth >= maxDepth) return '[Max Depth Reached]';
  
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }
  
  if (obj instanceof HTMLElement) return '[HTMLElement]';
  if (obj instanceof Date) return obj.toISOString();
  
  if (Array.isArray(obj)) {
    return obj.map(item => safeStringify(item, maxDepth, currentDepth + 1));
  }
  
  if (typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key.startsWith('__react') || key.startsWith('_react')) continue;
      result[key] = safeStringify(value, maxDepth, currentDepth + 1);
    }
    return result;
  }
  
  return obj;
};

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
  const [isPublished, setIsPublished] = useState(false);
  const [publishedInvoice, setPublishedInvoice] = useState<any>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [simpleQuantity, setSimpleQuantity] = useState(1);

  // Default onSubmit implementation if not provided
  const defaultOnSubmit = async (data: any, isDraft: boolean) => {
    try {
      setLoading(true);
      
      // Validate required auth data
      if (!userData?.auth_user_id) {
        throw new Error('User not authenticated. Please log in again.');
      }
      
      if (!merchantData?.merchant_id) {
        throw new Error('Merchant data not available. Please refresh the page and try again.');
      }
      
      console.log('Invoice submission started:', {
        isDraft,
        userId: userData.auth_user_id,
        merchantId: merchantData.merchant_id,
        formDataKeys: Object.keys(data),
        formDataSample: {
          title: data.title,
          customer_email: data.customer_email,
          simple_amount: data.simple_amount
        }
      });
      
      // Ensure user exists in database before creating invoice
      console.log('🔍 Checking if user exists in database:', userData.auth_user_id);
      
      try {
        const { data: existingUser, error: userError } = await supabase
          .from('users')
          .select('auth_user_id, email, role')
          .eq('auth_user_id', userData.auth_user_id)
          .single();
          
        console.log('👤 User lookup result:', { existingUser, userError });
          
        if (userError && userError.code === 'PGRST116') {
          // User doesn't exist, create user record
          console.log('❌ User not found in database, creating user record...');
          
          const newUserData = {
            auth_user_id: userData.auth_user_id,
            email: userData.email || '',
            name: userData.name || userData.email?.split('@')[0] || 'User',
            role: userData.role || 'merchant',
            approved: userData.approved || true,
            merchant_id: merchantData.merchant_id
          };
          
          console.log('📝 Creating user with data:', newUserData);
          
          const { data: createdUser, error: createUserError } = await supabase
            .from('users')
            .insert(newUserData)
            .select()
            .single();
            
          if (createUserError) {
            console.error('❌ Failed to create user:', createUserError);
            throw new Error(`Failed to create user record: ${createUserError.message} (Code: ${createUserError.code})`);
          }
          
          console.log('✅ User record created successfully:', createdUser);
        } else if (userError) {
          console.error('❌ Database error checking user:', userError);
          throw new Error(`Database error checking user: ${userError.message} (Code: ${userError.code})`);
        } else {
          console.log('✅ User already exists in database:', existingUser);
        }
      } catch (dbError) {
        console.error('💥 Error ensuring user exists:', dbError);
        throw new Error(`Database setup failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
      }
      
      if (isDraft) {
        // Save as draft using Supabase
        const draftData = {
          merchant_id: merchantData.merchant_id,
          created_by: userData.auth_user_id,
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
        
        console.log('Saving draft with data:', draftData);
        const result = await invoiceService.saveDraft(draftData as any, merchantData.merchant_id, userData.auth_user_id);
        console.log('Draft saved successfully:', result);
        navigate('/invoices');
        return result;
      } else {
        // Send invoice using API
        const subtotal = calculateSubtotal();
        const isUsingLineItems = lineItems.length > 0;
        
        const invoiceData: InvoiceApiPayload = {
          // Required basic fields
          title: data.title || 'Invoice',
          description: data.description || '',
          customer_email: data.customer_email,
          customer_name: data.customer_name || '',
          
          // Merchant context (critical for backend)
          merchant_id: merchantData.merchant_id,
          created_by: userData.auth_user_id,
          
          // Amount and payment fields
          simple_amount: isUsingLineItems ? subtotal : (data.simple_amount || 0),
          crypto_asset: data.crypto_asset || 'USDC',
          chain: 'BASE',
          currency_mode: 'crypto',
          is_simple_amount: !isUsingLineItems,
          status: 'sent',
          
          // Financial calculations
          subtotal: subtotal,
          tax_amount: 0,
          discount_amount: 0,
          total_amount: subtotal,
          
          // Line items if using them
          line_items: isUsingLineItems ? lineItems.map(item => ({
            id: item.id,
            name: item.name,
            description: item.description || item.name,
            quantity: item.quantity,
            unit_price: item.unit_price
          })) : [],
          
          // Email and notifications
          send_email: true,
          
          // Payment configuration - No price lock needed for stablecoins
          price_lock_secs: data.due_date ? 
            Math.max(86400, Math.floor((new Date(data.due_date).getTime() - Date.now()) / 1000)) : // Use due date or minimum 1 day
            2592000, // Default 30 days for stablecoins (no volatility)
          min_confirmations: 1,
          allow_partial: false,
          
          // Optional fields
          due_date: data.due_date || undefined,
          settlement_wallet_id: data.settlement_wallet_id || undefined,
          notes: '',
          tags: [],
          webhook_url: '',
          notification_email: '',
          
          // Blockchain fields (backend will populate)
          settlement_status: 'pending',
          confirmation_count: 0
        };
        
        // Debug merchant data
        console.log('🏪 Merchant Data:', merchantData);
        console.log('👤 User Data:', userData);
        
        // Debug payload before sending
        console.log('📤 Sending invoice payload:', JSON.stringify(invoiceData, null, 2));
        
        const result = await invoiceApi.createInvoice(invoiceData);
        console.log('Invoice created:', result);
        console.log('🔍 Result structure:', JSON.stringify(result, null, 2));
        
        // Set success state and show copy link
        setIsPublished(true);
        setPublishedInvoice(result);
        
        // Handle different response structures
        const resultAny = result as any;
        const publicUrl = result.public_url || resultAny.invoice?.public_url || resultAny.publicUrl || 
                         (result.public_id ? `https://pay.okurupay.com/pay/${result.public_id}` : '');
        
        // Try multiple ways to get invoice number
        const invoiceNumber = result.invoice_number || 
                             resultAny.invoice?.invoice_number || 
                             result.id || 
                             `INV-${Date.now()}` || // Fallback
                             'N/A';
        
        const amount = result.total_amount || resultAny.invoice?.total_amount || invoiceData.total_amount;
        
        setPaymentLink(publicUrl);
        
        // Store the extracted values for the success screen
        setPublishedInvoice({
          ...result,
          invoice_number: invoiceNumber,
          total_amount: amount,
          public_url: publicUrl
        });
        
        console.log('🔗 Setting payment link:', publicUrl);
        console.log('📋 Invoice number:', invoiceNumber);
        console.log('💰 Amount:', amount);
        console.log('🔍 Full API response for debugging:', result);
        
        return result;
      }
    } catch (error) {
      console.error('Error submitting invoice:', error);
      
      // Show user-friendly error message
      let errorMessage = 'Failed to save invoice';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        try {
          errorMessage = JSON.stringify(safeStringify(error));
        } catch (stringifyError) {
          errorMessage = 'Unknown error (could not serialize error details)';
        }
      }
      
      alert(`Error: ${errorMessage}`);
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

  const calculateSubtotal = () => {
    if (lineItems.length === 0) {
      return (form.watch('simple_amount') || 0) * simpleQuantity;
    }
    return lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const handleSaveAsDraft = () => {
    console.log('Save as Draft clicked');
    form.handleSubmit((data) => {
      handleSubmit(data, true);
    }, (errors) => {
      console.log('Form validation errors:', JSON.stringify(safeStringify(errors), null, 2));
    })();
  };

  const handlePublish = () => {
    console.log('Publish Invoice clicked');
    
    // Validate auth data before attempting to publish
    if (!userData?.auth_user_id) {
      alert('Error: User not authenticated. Please log in again.');
      return;
    }
    
    if (!merchantData?.merchant_id) {
      alert('Error: Merchant data not available. Please refresh the page and try again.');
      return;
    }
    
    form.handleSubmit((data) => {
      // Create invoice and set status to 'sent' (published)
      const modifiedData = { ...data, send_email: false };
      
      // Create invoice and handle publishing
      handleSubmit(modifiedData, false).then((result: any) => {
        if (result?.public_id) {
          const link = `${window.location.origin}/invoice/${result.public_id}`;
          setPaymentLink(link);
          setPublishedInvoice(result);
          setIsPublished(true);
          console.log('Invoice published successfully:', result);
        } else {
          throw new Error('Invoice was created but no public_id was returned');
        }
      }).catch((error: any) => {
        console.error('Error publishing invoice:', error);
        let errorMessage = 'Failed to publish invoice';
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        alert(`Publish Error: ${errorMessage}`);
      });
    }, (errors) => {
      console.log('Form validation errors:', JSON.stringify(safeStringify(errors), null, 2));
      alert('Please fix the form errors before publishing the invoice.');
    })();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(paymentLink);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleCreateAnother = () => {
    // Reset form and states
    setIsPublished(false);
    setPublishedInvoice(null);
    setPaymentLink('');
    setCopySuccess(false);
    form.reset();
    setLineItems([]);
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
            {!isPublished ? (
              <>
                <Button variant="outline" onClick={handleSaveAsDraft} disabled={loading}>
                  <Save className="w-4 h-4 mr-2" />
                  Save as Draft
                </Button>
                <Button onClick={handlePublish} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Send className="w-4 h-4 mr-2" />
                  Publish Invoice
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-2 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium">Invoice Published</span>
                </div>
                <Button variant="outline" onClick={handleCopyLink} className="flex items-center gap-2">
                  {copySuccess ? (
                    <>
                      <div className="w-4 h-4 text-green-600">✓</div>
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Link</span>
                    </>
                  )}
                </Button>
                <Button onClick={handleCreateAnother} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Another
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
      {/* Main Content */}
      <div className="flex-1 max-w-4xl mx-auto p-8">
        {isPublished ? (
          /* Success State - Invoice Published */
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg border p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Send className="w-8 h-8 text-green-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Invoice Published Successfully!</h2>
              <p className="text-gray-600 mb-6">Your invoice has been created and is ready to be shared with your customer.</p>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-700">Invoice Link</p>
                    <p className="text-xs text-gray-500 break-all">{paymentLink}</p>
                  </div>
                  <Button onClick={handleCopyLink} variant="outline" size="sm">
                    {copySuccess ? (
                      <>
                        <div className="w-4 h-4 text-green-600 mr-2">✓</div>
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {publishedInvoice && (
                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="font-medium text-blue-900">Invoice Number</p>
                    <p className="text-blue-700">{publishedInvoice.invoice_number || publishedInvoice.id || 'Generated'}</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="font-medium text-blue-900">Amount</p>
                    <p className="text-blue-700">${publishedInvoice.total_amount}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-center">
                <Button onClick={() => window.open(paymentLink, '_blank')} variant="outline">
                  <Eye className="w-4 h-4 mr-2" />
                  Preview Invoice
                </Button>
                <Button onClick={handleCreateAnother} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Another Invoice
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={form.handleSubmit((data) => (onSubmit || defaultOnSubmit)(data, false))} className="space-y-8">
            {/* Invoice Header - Like a Real Invoice */}
            <div className="bg-white rounded-lg border shadow-sm">
              {/* Invoice Header */}
              <div className="border-b bg-gray-50 px-6 py-4 rounded-t-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">INVOICE</h1>
                    <p className="text-sm text-gray-600 mt-1">Create a new invoice</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Invoice #</div>
                    <div className="font-mono text-lg font-semibold">
                      {`INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoice Body */}
              <div className="p-6 space-y-8">
                {/* Bill To & Invoice Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Bill To Section */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Bill To:</h3>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="customer_name">Customer Name *</Label>
                        <Input
                          id="customer_name"
                          {...form.register('customer_name')}
                          placeholder="Customer or Company Name"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="customer_email">Email Address *</Label>
                        <Input
                          id="customer_email"
                          type="email"
                          {...form.register('customer_email')}
                          placeholder="customer@email.com"
                          className="mt-1"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowContactPicker(true)}
                        className="w-full"
                      >
                        <Search className="h-4 w-4 mr-2" />
                        Use Saved Contact
                      </Button>
                    </div>
                  </div>

                  {/* Invoice Details */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Details:</h3>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="title">Invoice Title/Description *</Label>
                        <Input
                          id="title"
                          {...form.register('title')}
                          placeholder="e.g., Web Development Services"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="due_date">Due Date</Label>
                        <Input
                          id="due_date"
                          type="date"
                          {...form.register('due_date')}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="crypto_asset">Payment Currency</Label>
                        <Select value={form.watch('crypto_asset') || 'USDC'} onValueChange={(value) => form.setValue('crypto_asset', value as 'USDC' | 'USDT' | 'DAI' | 'USDbC')}>
                          <SelectTrigger className="mt-1">
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
                  </div>
                </div>

                {/* Invoice Items Section */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Invoice Items:</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addLineItem}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Item
                    </Button>
                  </div>
                  
                  <div className="border rounded-lg overflow-hidden">
                    {/* Table Header */}
                    <div className="bg-gray-50 border-b">
                      <div className="grid grid-cols-12 gap-4 px-4 py-3 text-sm font-medium text-gray-700">
                        <div className="col-span-5">Description</div>
                        <div className="col-span-2 text-center">Quantity</div>
                        <div className="col-span-2 text-right">Rate</div>
                        <div className="col-span-2 text-right">Amount</div>
                        <div className="col-span-1"></div>
                      </div>
                    </div>
                    
                    {/* Line Items */}
                    {lineItems.length === 0 ? (
                      <div className="bg-white">
                        <div className="grid grid-cols-12 gap-4 px-4 py-4 items-center">
                          <div className="col-span-5">
                            <Textarea
                              {...form.register('description')}
                              placeholder="Describe the service or product..."
                              rows={2}
                              className="resize-none border-0 p-0 focus:ring-0 text-sm"
                            />
                          </div>
                          <div className="col-span-2">
                            <Input
                              type="number"
                              value={simpleQuantity}
                              min="1"
                              className="text-center text-sm"
                              onChange={(e) => {
                                const quantity = parseInt(e.target.value) || 1;
                                setSimpleQuantity(quantity);
                              }}
                            />
                          </div>
                          <div className="col-span-2">
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">$</span>
                              <Input
                                id="simple_amount"
                                type="number"
                                step="0.01"
                                {...form.register('simple_amount', { valueAsNumber: true })}
                                placeholder="0.00"
                                className="pl-8 text-right text-sm"
                              />
                            </div>
                          </div>
                          <div className="col-span-2 text-right">
                            <div className="font-semibold text-sm">
                              ${((form.watch('simple_amount') || 0) * simpleQuantity).toFixed(2)}
                            </div>
                          </div>
                          <div className="col-span-1"></div>
                        </div>
                      </div>
                    ) : (
                      lineItems.map((item, index) => (
                        <div key={item.id} className="bg-white border-b last:border-b-0">
                          <div className="grid grid-cols-12 gap-4 px-4 py-4 items-center">
                            <div className="col-span-5">
                              <Textarea
                                value={item.name}
                                onChange={(e) => updateLineItem(item.id, 'name', e.target.value)}
                                placeholder="Describe the service or product..."
                                rows={2}
                                className="resize-none border-0 p-0 focus:ring-0 text-sm w-full"
                              />
                            </div>
                            <div className="col-span-2">
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                                min="1"
                                className="text-center text-sm"
                              />
                            </div>
                            <div className="col-span-2">
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">$</span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.unit_price}
                                  onChange={(e) => updateLineItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                                  placeholder="0.00"
                                  className="pl-8 text-right text-sm"
                                />
                              </div>
                            </div>
                            <div className="col-span-2 text-right">
                              <div className="font-semibold text-sm">
                                ${(item.quantity * item.unit_price).toFixed(2)}
                              </div>
                            </div>
                            <div className="col-span-1 flex justify-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeLineItem(item.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Invoice Summary */}
                <div className="flex justify-end">
                  <div className="w-full max-w-sm">
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>${calculateSubtotal().toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Tax:</span>
                        <span>$0.00</span>
                      </div>
                      <div className="border-t pt-2">
                        <div className="flex justify-between font-bold text-lg">
                          <span>Total:</span>
                          <span>${calculateSubtotal().toFixed(2)} {form.watch('crypto_asset') || 'USDC'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>


            {/* Saved Contacts Modal */}
            {showContactPicker && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                  <SavedContacts
                    showSelectMode={true}
                    onSelectContact={(contact) => {
                      form.setValue('customer_name', contact.name);
                      form.setValue('customer_email', contact.email);
                      setShowContactPicker(false);
                    }}
                    onClose={() => setShowContactPicker(false)}
                  />
                </div>
              </div>
            )}

          </form>
        )}
      </div>
    </div>
  );
};

export default InvoiceCreateModern;
