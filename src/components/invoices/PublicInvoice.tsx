import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Calendar, Clock, MapPin, Mail, Phone, CreditCard, Wallet, Copy, Check, ExternalLink } from 'lucide-react';
import { useInvoiceStore } from '../../stores/invoiceStore';
import { Button } from '../ui/button';

const PublicInvoice: React.FC = () => {
  const { publicId } = useParams<{ publicId: string }>();
  const { invoices, getInvoiceByPublicId } = useInvoiceStore();
  const [invoice, setInvoice] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'crypto' | 'bank'>('crypto');

  useEffect(() => {
    if (publicId) {
      const foundInvoice = getInvoiceByPublicId(publicId);
      setInvoice(foundInvoice);
    }
  }, [publicId, getInvoiceByPublicId]);

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invoice Not Found</h1>
          <p className="text-gray-600">The invoice you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'expired': return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'partially_paid': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'overpaid': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const mockPaymentAddress = "0x742d35Cc6635C0532925a3b8D8B8F8D8E8F8D8E8";
  const mockQRData = `ethereum:${mockPaymentAddress}?value=${invoice.total_amount}&token=USDC`;

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(mockPaymentAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCurrency = (amount: number, currency: string) => {
    if (invoice.currency_mode === 'fiat') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'USD'
      }).format(amount);
    } else {
      return `${amount} ${currency}`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header with Logo */}
        <div className="bg-white rounded-lg shadow-sm border mb-6 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">O</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Okuru</h1>
                <p className="text-gray-600">Digital Payment Solutions</p>
              </div>
            </div>
            <div className="text-right">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(invoice.status)}`}>
                {invoice.status.replace('_', ' ').toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Invoice Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Invoice Info */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice Details</h2>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Invoice #</span>
                      <span className="font-medium">{invoice.invoice_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created</span>
                      <span className="font-medium">{new Date(invoice.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Due Date</span>
                      <span className="font-medium">{new Date(invoice.expires_at).toLocaleDateString()}</span>
                    </div>
                    {invoice.title && (
                      <div className="pt-2">
                        <span className="text-gray-600">Description</span>
                        <p className="font-medium mt-1">{invoice.title}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Bill To</h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span>{invoice.customer_email}</span>
                    </div>
                    {invoice.customer_name && (
                      <p className="font-medium">{invoice.customer_name}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Line Items */}
            {invoice.line_items && invoice.line_items.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Items</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 text-sm font-medium text-gray-600">Description</th>
                        <th className="text-right py-2 text-sm font-medium text-gray-600">Qty</th>
                        <th className="text-right py-2 text-sm font-medium text-gray-600">Price</th>
                        <th className="text-right py-2 text-sm font-medium text-gray-600">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.line_items.map((item: any, index: number) => (
                        <tr key={index} className="border-b border-gray-100">
                          <td className="py-3 text-sm">{item.name}</td>
                          <td className="py-3 text-sm text-right">{item.quantity}</td>
                          <td className="py-3 text-sm text-right">
                            {formatCurrency(item.unit_price, invoice.fiat_currency || invoice.crypto_currency)}
                          </td>
                          <td className="py-3 text-sm text-right font-medium">
                            {formatCurrency(item.quantity * item.unit_price, invoice.fiat_currency || invoice.crypto_currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Totals */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span>{formatCurrency(invoice.subtotal, invoice.fiat_currency || invoice.crypto_currency)}</span>
                </div>
                {invoice.tax_amount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax</span>
                    <span>{formatCurrency(invoice.tax_amount, invoice.fiat_currency || invoice.crypto_currency)}</span>
                  </div>
                )}
                {invoice.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{formatCurrency(invoice.discount_amount, invoice.fiat_currency || invoice.crypto_currency)}</span>
                  </div>
                )}
                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>{formatCurrency(invoice.total_amount, invoice.fiat_currency || invoice.crypto_currency)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Section */}
          <div className="space-y-6">
            {invoice.status === 'paid' ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-green-900 mb-2">Payment Received</h3>
                <p className="text-green-700">This invoice has been paid in full.</p>
                {invoice.paid_at && (
                  <p className="text-sm text-green-600 mt-2">
                    Paid on {new Date(invoice.paid_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            ) : invoice.status === 'expired' || invoice.status === 'cancelled' ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Invoice {invoice.status}</h3>
                <p className="text-gray-600">This invoice is no longer available for payment.</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pay Invoice</h3>
                
                {/* Payment Method Tabs */}
                <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-6">
                  <button
                    onClick={() => setPaymentMethod('crypto')}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                      paymentMethod === 'crypto'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Wallet className="h-4 w-4 inline mr-2" />
                    Crypto
                  </button>
                  <button
                    onClick={() => setPaymentMethod('bank')}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                      paymentMethod === 'bank'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <CreditCard className="h-4 w-4 inline mr-2" />
                    Bank Transfer
                  </button>
                </div>

                {paymentMethod === 'crypto' ? (
                  <div className="space-y-4">
                    {/* QR Code */}
                    <div className="bg-gray-50 rounded-lg p-6 text-center">
                      <QRCodeSVG
                        value={mockQRData}
                        size={200}
                        className="mx-auto mb-4"
                        includeMargin={true}
                      />
                      <p className="text-sm text-gray-600 mb-2">Scan to pay with crypto wallet</p>
                      <div className="text-xs text-gray-500">
                        <p>Network: {invoice.crypto_chain || 'Ethereum'}</p>
                        <p>Token: {invoice.crypto_currency || 'USDC'}</p>
                      </div>
                    </div>

                    {/* Payment Address */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Address
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={mockPaymentAddress}
                          readOnly
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCopyAddress}
                          className="flex-shrink-0"
                        >
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="text-center">
                        <p className="text-sm text-blue-600 mb-1">Amount to Pay</p>
                        <p className="text-2xl font-bold text-blue-900">
                          {invoice.total_amount} {invoice.crypto_currency || 'USDC'}
                        </p>
                      </div>
                    </div>

                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open in Wallet
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-6 text-center">
                      <CreditCard className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h4 className="font-medium text-gray-900 mb-2">Bank Transfer</h4>
                      <p className="text-sm text-gray-600">
                        Contact us to arrange bank transfer payment
                      </p>
                    </div>
                    
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="font-medium">Account Name:</span>
                        <p>Okuru Digital Solutions</p>
                      </div>
                      <div>
                        <span className="font-medium">Reference:</span>
                        <p>{invoice.invoice_number}</p>
                      </div>
                      <div>
                        <span className="font-medium">Amount:</span>
                        <p className="text-lg font-bold">
                          {formatCurrency(invoice.total_amount, invoice.fiat_currency || 'USD')}
                        </p>
                      </div>
                    </div>

                    <Button variant="outline" className="w-full">
                      <Mail className="h-4 w-4 mr-2" />
                      Contact for Bank Details
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Invoice Info */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h4 className="font-medium text-gray-900 mb-3">Need Help?</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <p>Questions about this invoice?</p>
                <p>Contact: support@okuru.com</p>
                <p>Phone: +1 (555) 123-4567</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Powered by Okuru • Secure Digital Payments</p>
        </div>
      </div>
    </div>
  );
};

export default PublicInvoice;
