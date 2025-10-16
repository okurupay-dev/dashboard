import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { ArrowLeft, Copy, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Invoice } from '../../services/invoiceApi';

const InvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadInvoice(id);
    }
  }, [id]);

  const loadInvoice = async (invoiceId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('standalone_invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();
      
      if (error) throw error;
      setInvoice(data);
    } catch (error) {
      console.error('Error loading invoice:', error);
      setInvoice(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">Loading invoice...</div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Invoice not found</h3>
          <p className="text-gray-600 mb-4">The invoice you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/invoices')}>
            Back to Invoices
          </Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'viewed': return 'bg-purple-100 text-purple-800';
      case 'pending_payment': return 'bg-yellow-100 text-yellow-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'canceled': return 'bg-gray-100 text-gray-800';
      case 'voided': return 'bg-gray-100 text-gray-800';
      case 'underpaid': return 'bg-orange-100 text-orange-800';
      case 'overpaid': return 'bg-blue-100 text-blue-800';
      case 'refunded': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Check if invoice is expired based on due_date OR expires_at
  const isInvoiceExpired = (invoice: Invoice) => {
    if (invoice.status === 'paid' || invoice.status === 'canceled' || invoice.status === 'voided') {
      return false;
    }
    
    const now = new Date();
    
    // Check expires_at first (payment window), then due_date (payment deadline)
    if (invoice.expires_at) {
      const expiresAt = new Date(invoice.expires_at);
      if (expiresAt < now && (invoice.status === 'sent' || invoice.status === 'viewed')) {
        return true;
      }
    }
    
    if (invoice.due_date) {
      const dueDate = new Date(invoice.due_date);
      if (dueDate < now && (invoice.status === 'sent' || invoice.status === 'viewed')) {
        return true;
      }
    }
    
    return false;
  };

  // Get effective status (considering expiration)
  const getEffectiveStatus = (invoice: Invoice) => {
    if (isInvoiceExpired(invoice)) {
      return 'expired';
    }
    return invoice.status;
  };

  // Get display text for status
  const getStatusDisplayText = (status: string) => {
    switch (status) {
      case 'sent': return 'Published';
      case 'draft': return 'Draft';
      case 'paid': return 'Paid';
      case 'expired': return 'Expired';
      case 'canceled': return 'Canceled';
      case 'cancelled': return 'Canceled';
      case 'voided': return 'Voided';
      default: return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  // Format seconds into human readable time
  const formatExpirationTime = (seconds: number) => {
    if (!seconds || seconds <= 0) return 'No expiration';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  };

  const handleCopyPayLink = () => {
    if (invoice.public_url) {
      navigator.clipboard.writeText(invoice.public_url);
      alert(`Pay link copied: ${invoice.public_url}`);
    } else {
      alert('Public URL not available for this invoice');
    }
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
            <h1 className="text-2xl font-bold text-gray-900">{invoice.invoice_number}</h1>
            <div className="flex items-center space-x-3 mt-1">
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(getEffectiveStatus(invoice))}`}>
                {getStatusDisplayText(getEffectiveStatus(invoice))}
              </span>
              <span className="text-gray-600">
                Created {new Date(invoice.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3">
          {invoice.public_url && (
            <Button variant="outline" onClick={handleCopyPayLink}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Payment Link
            </Button>
          )}
          
          {invoice.public_url && (
            <Button 
              variant="outline" 
              onClick={() => window.open(invoice.public_url, '_blank')}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Payment Page
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <Card className="p-6">
            <h3 className="font-medium text-gray-900 mb-4">Customer</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-600">Name:</span>
                <div className="font-medium">{invoice.customer_name || 'N/A'}</div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Email:</span>
                <div className="font-medium">{invoice.customer_email}</div>
              </div>
            </div>
          </Card>

          {/* Payment Status - Only shows what customer actually chose */}
          <Card className="p-6">
            <h3 className="font-medium text-gray-900 mb-4">Payment Status</h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-600">Status:</span>
                <div className="mt-1">
                  <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(getEffectiveStatus(invoice))}`}>
                    {getStatusDisplayText(getEffectiveStatus(invoice))}
                  </span>
                </div>
              </div>
              
              {/* Only show payment details AFTER customer has paid and chosen their method */}
              {(invoice.status === 'paid' || invoice.status === 'overpaid' || invoice.status === 'underpaid') && (
                <>
                  <div>
                    <span className="text-sm text-gray-600">Customer Paid With:</span>
                    <div className="font-medium">
                      {invoice.paid_currency || 'Unknown Currency'}
                      {invoice.paid_chain && (
                        <span className="text-sm text-gray-500 ml-1">on {invoice.paid_chain}</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Amount Paid:</span>
                    <div className="font-medium">
                      {invoice.paid_amount ? `${invoice.paid_amount} ${invoice.paid_currency}` : `$${(invoice.total_amount || 0).toFixed(2)}`}
                    </div>
                  </div>
                  {invoice.transaction_hash && (
                    <div>
                      <span className="text-sm text-gray-600">Transaction:</span>
                      <div className="font-mono text-xs text-blue-600 break-all mt-1">
                        <a 
                          href={`https://basescan.org/tx/${invoice.transaction_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {invoice.transaction_hash}
                        </a>
                      </div>
                    </div>
                  )}
                  {invoice.paid_at && (
                    <div>
                      <span className="text-sm text-gray-600">Paid At:</span>
                      <div className="font-medium">{new Date(invoice.paid_at).toLocaleString()}</div>
                    </div>
                  )}
                </>
              )}

              {/* Simple pending state - customer hasn't chosen payment method yet */}
              {(invoice.status === 'sent' || invoice.status === 'viewed' || invoice.status === 'pending_payment') && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-sm text-yellow-800 font-medium">
                    Awaiting Customer Payment
                  </div>
                  <div className="text-xs text-yellow-700 mt-1">
                    Customer will choose their preferred payment method. Details will appear here once payment is received.
                  </div>
                </div>
              )}

              {/* Expired state */}
              {invoice.status === 'expired' && (
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-sm text-red-800 font-medium">
                    Payment Expired
                  </div>
                  <div className="text-xs text-red-700 mt-1">
                    This invoice has expired and can no longer receive payments.
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Settlement & Totals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Settlement Card */}
            <Card className="p-4">
              <h3 className="font-medium text-gray-900 mb-3">Settlement</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-600">Wallet ID:</span>
                  <div className="font-medium font-mono text-sm">
                    {invoice.settlement_wallet_id || 'Auto-Generated'}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Fee Payer:</span>
                  <div className="font-medium capitalize">{invoice.fee_payer || 'Merchant'}</div>
                </div>
              </div>
            </Card>

            {/* Totals Card */}
            <Card className="p-4">
              <h3 className="font-medium text-gray-900 mb-3">Totals</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Subtotal:</span>
                  <span className="font-medium">${(invoice.subtotal || 0).toFixed(2)}</span>
                </div>
                {(invoice.tax_amount || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Tax:</span>
                    <span className="font-medium">${(invoice.tax_amount || 0).toFixed(2)}</span>
                  </div>
                )}
                {(invoice.discount_amount || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Discount:</span>
                    <span className="font-medium text-green-600">-${(invoice.discount_amount || 0).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium">Total:</span>
                  <span className="font-bold text-lg">${(invoice.total_amount || 0).toFixed(2)}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Line Items */}
          {!invoice.is_simple_amount && invoice.line_items && invoice.line_items.length > 0 && (
            <Card className="p-4">
              <h3 className="font-medium text-gray-900 mb-4">Line Items</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 font-medium text-gray-900">Item</th>
                      <th className="text-right py-2 font-medium text-gray-900">Qty</th>
                      <th className="text-right py-2 font-medium text-gray-900">Unit Price</th>
                      <th className="text-right py-2 font-medium text-gray-900">Tax</th>
                      <th className="text-right py-2 font-medium text-gray-900">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.line_items.map((item: any, index: number) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-2">{item.name}</td>
                        <td className="py-2 text-right">{item.quantity}</td>
                        <td className="py-2 text-right">${item.unit_price.toFixed(2)}</td>
                        <td className="py-2 text-right">{item.tax_rate ? `${item.tax_rate}%` : '-'}</td>
                        <td className="py-2 text-right font-medium">
                          ${(item.quantity * item.unit_price).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Notes */}
          {invoice.description && (
            <Card className="p-4">
              <h3 className="font-medium text-gray-900 mb-3">Notes</h3>
              <p className="text-gray-700">{invoice.description}</p>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="p-4">
            <h3 className="font-medium text-gray-900 mb-4">Invoice Information</h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-600">Invoice Number:</span>
                <div className="font-medium">{invoice.invoice_number}</div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Status:</span>
                <div>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(getEffectiveStatus(invoice))}`}>
                    {getStatusDisplayText(getEffectiveStatus(invoice))}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Created:</span>
                <div className="font-medium">{new Date(invoice.created_at).toLocaleDateString()}</div>
              </div>
              {invoice.due_date && (
                <div>
                  <span className="text-sm text-gray-600">Due Date:</span>
                  <div className="font-medium">{new Date(invoice.due_date).toLocaleDateString()}</div>
                </div>
              )}
              {invoice.public_url && (
                <div>
                  <span className="text-sm text-gray-600">Payment URL:</span>
                  <div className="text-xs text-blue-600 break-all">{invoice.public_url}</div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetail;
