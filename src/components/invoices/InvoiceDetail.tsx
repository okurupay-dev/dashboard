import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { ArrowLeft, Send, RefreshCw, X, Copy, Eye, Download } from 'lucide-react';
import { useInvoiceStore } from '../../stores/invoiceStore';

const InvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    getInvoice, 
    sendInvoice, 
    cancelInvoice, 
    copyPayLink,
    addTimelineEvent 
  } = useInvoiceStore();

  const invoice = id ? getInvoice(id) : null;

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
      case 'underpaid': return 'bg-orange-100 text-orange-800';
      case 'overpaid': return 'bg-blue-100 text-blue-800';
      case 'refunded': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleResend = () => {
    sendInvoice(invoice.id);
    alert('Invoice resent successfully!');
  };

  const handleRefreshQuote = () => {
    addTimelineEvent(invoice.id, {
      type: 'viewed',
      description: 'Quote refreshed'
    });
    alert('Quote refreshed successfully!');
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel this invoice?')) {
      cancelInvoice(invoice.id);
      // Add timeline event
      // In a real app, this would be handled by the backend
    }
  };

  const handleCopyPayLink = () => {
    const link = copyPayLink(invoice.id);
    alert(`Pay link copied: ${link}`);
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
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`}>
                {invoice.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
              <span className="text-gray-600">
                Created {new Date(invoice.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3">
          {(invoice.status === 'sent' || invoice.status === 'viewed') && (
            <Button variant="outline" onClick={handleResend}>
              <Send className="h-4 w-4 mr-2" />
              Resend
            </Button>
          )}
          
          {invoice.status !== 'paid' && invoice.status !== 'canceled' && (
            <Button variant="outline" onClick={handleRefreshQuote}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Quote
            </Button>
          )}
          
          {(invoice.status === 'draft' || invoice.status === 'sent') && (
            <Button variant="outline" onClick={handleCancel} className="text-red-600 hover:text-red-700">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Card */}
            <Card className="p-4">
              <h3 className="font-medium text-gray-900 mb-3">Customer</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-600">Name:</span>
                  <div className="font-medium">{invoice.customer_name || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Email:</span>
                  <div className="font-medium">{invoice.customer_email}</div>
                </div>
                {invoice.billing_address && (
                  <div>
                    <span className="text-sm text-gray-600">Address:</span>
                    <div className="text-sm">
                      {invoice.billing_address.street}<br />
                      {invoice.billing_address.city}, {invoice.billing_address.state} {invoice.billing_address.postal_code}<br />
                      {invoice.billing_address.country}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Payment Card */}
            <Card className="p-4">
              <h3 className="font-medium text-gray-900 mb-3">Payment Details</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-600">Mode:</span>
                  <div className="font-medium capitalize">{invoice.currency_mode}</div>
                </div>
                {invoice.currency_mode === 'fiat' ? (
                  <div>
                    <span className="text-sm text-gray-600">Currency:</span>
                    <div className="font-medium">{invoice.fiat_currency}</div>
                  </div>
                ) : (
                  <>
                    <div>
                      <span className="text-sm text-gray-600">Asset:</span>
                      <div className="font-medium">{invoice.crypto_asset}</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Chain:</span>
                      <div className="font-medium">{invoice.chain}</div>
                    </div>
                  </>
                )}
                <div>
                  <span className="text-sm text-gray-600">Price Lock:</span>
                  <div className="font-medium">{invoice.price_lock_secs}s</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Settlement & Totals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Settlement Card */}
            <Card className="p-4">
              <h3 className="font-medium text-gray-900 mb-3">Settlement</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-600">Wallet ID:</span>
                  <div className="font-medium">{invoice.settlement_wallet_id}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Fee Payer:</span>
                  <div className="font-medium capitalize">{invoice.fee_payer}</div>
                </div>
              </div>
            </Card>

            {/* Totals Card */}
            <Card className="p-4">
              <h3 className="font-medium text-gray-900 mb-3">Totals</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Subtotal:</span>
                  <span className="font-medium">${invoice.subtotal.toFixed(2)}</span>
                </div>
                {invoice.tax_amount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Tax:</span>
                    <span className="font-medium">${invoice.tax_amount.toFixed(2)}</span>
                  </div>
                )}
                {invoice.discount_amount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Discount:</span>
                    <span className="font-medium text-green-600">-${invoice.discount_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium">Total:</span>
                  <span className="font-bold text-lg">${invoice.total_amount.toFixed(2)}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Line Items */}
          {!invoice.is_simple_amount && invoice.line_items.length > 0 && (
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
                    {invoice.line_items.map((item, index) => (
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
          {/* Timeline */}
          <Card className="p-4">
            <h3 className="font-medium text-gray-900 mb-4">Timeline</h3>
            <div className="space-y-4">
              {invoice.timeline.map((event, index) => (
                <div key={event.id} className="flex items-start space-x-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    event.type === 'paid' ? 'bg-green-500' :
                    event.type === 'canceled' ? 'bg-red-500' :
                    event.type === 'sent' ? 'bg-blue-500' :
                    'bg-gray-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {event.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* On-chain Info */}
          {invoice.currency_mode === 'crypto' && (
            <Card className="p-4">
              <h3 className="font-medium text-gray-900 mb-4">On-chain</h3>
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Transaction Hash:</span>
                  <div className="font-mono text-xs text-gray-800 break-all">
                    0x742d35Cc6634C0532925a3b8D4C0532925a3b8D4...
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Confirmations:</span>
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                    12/12
                  </span>
                </div>
              </div>
            </Card>
          )}

          {/* Quick Actions */}
          <Card className="p-4">
            <h3 className="font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={handleCopyPayLink}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Pay Link
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Eye className="h-4 w-4 mr-2" />
                View Public Page
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetail;
