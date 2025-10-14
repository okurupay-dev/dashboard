import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Calendar, Clock, MapPin, Mail, Phone, CreditCard, Wallet, Copy, Check, ExternalLink, Sparkles, Shield, Zap } from 'lucide-react';
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

  // Payment data should come from the invoice object from backend
  const paymentAddress = invoice.payment_address || "Payment address not available";
  const qrData = invoice.qr_code_data || `Payment data not available`;

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(paymentAddress);
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
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
        
        {/* Floating Orbs */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-40 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 min-h-screen py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Liquid Glass Header */}
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl mb-8 p-8 relative overflow-hidden">
            {/* Shimmer Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 animate-shimmer"></div>
            
            <div className="relative flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Sparkles className="h-8 w-8 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                    Okuru
                  </h1>
                  <p className="text-white/80 text-lg">Secure Digital Payments</p>
                </div>
              </div>
              <div className="text-right">
                <div className={`inline-flex items-center px-6 py-3 rounded-2xl text-sm font-bold backdrop-blur-sm border border-white/30 ${
                  invoice.status === 'paid' 
                    ? 'bg-green-400/20 text-green-100 border-green-400/30' 
                    : 'bg-blue-400/20 text-blue-100 border-blue-400/30'
                }`}>
                  <Shield className="h-4 w-4 mr-2" />
                  {invoice.status.replace('_', ' ').toUpperCase()}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Invoice Details */}
            <div className="lg:col-span-2 space-y-8">
              {/* Invoice Info */}
              <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 animate-shimmer"></div>
                
                <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                      <Calendar className="h-6 w-6 mr-3 text-blue-300" />
                      Invoice Details
                    </h2>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-white/70">Invoice #</span>
                        <span className="font-bold text-white">{invoice.invoice_number}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-white/70">Created</span>
                        <span className="font-bold text-white">{new Date(invoice.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-white/70">Due Date</span>
                        <span className="font-bold text-white">{new Date(invoice.expires_at).toLocaleDateString()}</span>
                      </div>
                      {invoice.title && (
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                          <span className="text-white/70 text-sm">Description</span>
                          <p className="font-medium text-white mt-2">{invoice.title}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                      <Mail className="h-6 w-6 mr-3 text-purple-300" />
                      Bill To
                    </h3>
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex items-center space-x-3 mb-2">
                          <Mail className="h-5 w-5 text-blue-300" />
                          <span className="text-white font-medium">{invoice.customer_email}</span>
                        </div>
                        {invoice.customer_name && (
                          <p className="text-white/80 ml-8">{invoice.customer_name}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Line Items */}
              {invoice.line_items && invoice.line_items.length > 0 && (
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-8 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 animate-shimmer"></div>
                  
                  <div className="relative">
                    <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                      <Sparkles className="h-6 w-6 mr-3 text-yellow-300" />
                      Items
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/20">
                            <th className="text-left py-4 text-sm font-bold text-white/80">Description</th>
                            <th className="text-right py-4 text-sm font-bold text-white/80">Qty</th>
                            <th className="text-right py-4 text-sm font-bold text-white/80">Price</th>
                            <th className="text-right py-4 text-sm font-bold text-white/80">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoice.line_items.map((item: any, index: number) => (
                            <tr key={index} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                              <td className="py-4 text-white font-medium">{item.name}</td>
                              <td className="py-4 text-white text-right">{item.quantity}</td>
                              <td className="py-4 text-white text-right">
                                {formatCurrency(item.unit_price, invoice.fiat_currency || invoice.crypto_currency)}
                              </td>
                              <td className="py-4 text-white text-right font-bold">
                                {formatCurrency(item.quantity * item.unit_price, invoice.fiat_currency || invoice.crypto_currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Totals */}
              <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 animate-shimmer"></div>
                
                <div className="relative">
                  <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                    <Zap className="h-6 w-6 mr-3 text-green-300" />
                    Total Amount
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-white/70">Subtotal</span>
                      <span className="font-bold text-white">{formatCurrency(invoice.subtotal, invoice.fiat_currency || invoice.crypto_currency)}</span>
                    </div>
                    {invoice.tax_amount > 0 && (
                      <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-white/70">Tax</span>
                        <span className="font-bold text-white">{formatCurrency(invoice.tax_amount, invoice.fiat_currency || invoice.crypto_currency)}</span>
                      </div>
                    )}
                    {invoice.discount_amount > 0 && (
                      <div className="flex justify-between items-center p-3 rounded-xl bg-green-400/20 border border-green-400/30">
                        <span className="text-green-200">Discount</span>
                        <span className="font-bold text-green-200">-{formatCurrency(invoice.discount_amount, invoice.fiat_currency || invoice.crypto_currency)}</span>
                      </div>
                    )}
                    <div className="border-t border-white/20 pt-4">
                      <div className="flex justify-between items-center p-4 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30">
                        <span className="text-xl font-bold text-white">Total</span>
                        <span className="text-2xl font-bold bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent">
                          {formatCurrency(invoice.total_amount, invoice.fiat_currency || invoice.crypto_currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Section */}
            <div className="space-y-8">
              {invoice.status === 'paid' ? (
                <div className="backdrop-blur-xl bg-green-400/20 border border-green-400/30 rounded-3xl shadow-2xl p-8 text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-400/10 to-transparent -skew-x-12 animate-shimmer"></div>
                  <div className="relative">
                    <div className="w-20 h-20 bg-green-400/30 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
                      <Check className="h-10 w-10 text-green-200" />
                    </div>
                    <h3 className="text-2xl font-bold text-green-100 mb-3">Payment Received</h3>
                    <p className="text-green-200/80 text-lg">This invoice has been paid in full.</p>
                    {invoice.paid_at && (
                      <p className="text-sm text-green-300 mt-3 font-medium">
                        Paid on {new Date(invoice.paid_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ) : invoice.status === 'expired' || invoice.status === 'cancelled' ? (
                <div className="backdrop-blur-xl bg-red-400/20 border border-red-400/30 rounded-3xl shadow-2xl p-8 text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-400/10 to-transparent -skew-x-12 animate-shimmer"></div>
                  <div className="relative">
                    <h3 className="text-2xl font-bold text-red-100 mb-3">Invoice {invoice.status}</h3>
                    <p className="text-red-200/80 text-lg">This invoice is no longer available for payment.</p>
                  </div>
                </div>
              ) : (
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-8 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 animate-shimmer"></div>
                  <div className="relative">
                    <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                      <Wallet className="h-6 w-6 mr-3 text-blue-300" />
                      Pay Invoice
                    </h3>
                
                    {/* Payment Method Tabs */}
                    <div className="flex space-x-2 bg-white/5 rounded-2xl p-2 mb-8 backdrop-blur-sm border border-white/10">
                      <button
                        onClick={() => setPaymentMethod('crypto')}
                        className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center ${
                          paymentMethod === 'crypto'
                            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105'
                            : 'text-white/70 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <Wallet className="h-5 w-5 mr-2" />
                        Crypto Payment
                      </button>
                      <button
                        onClick={() => setPaymentMethod('bank')}
                        className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center ${
                          paymentMethod === 'bank'
                            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105'
                            : 'text-white/70 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <CreditCard className="h-5 w-5 mr-2" />
                        Bank Transfer
                      </button>
                    </div>

                    {paymentMethod === 'crypto' ? (
                      <div className="space-y-6">
                        {/* QR Code */}
                        <div className="bg-white/5 rounded-2xl p-8 text-center backdrop-blur-sm border border-white/10">
                          <div className="bg-white rounded-2xl p-6 inline-block mb-6">
                            <QRCodeSVG
                              value={qrData}
                              size={200}
                              className="mx-auto"
                              includeMargin={true}
                            />
                          </div>
                          <p className="text-white font-medium mb-3">Scan to pay with crypto wallet</p>
                          <div className="flex justify-center space-x-6 text-sm">
                            <div className="bg-blue-500/20 px-4 py-2 rounded-xl border border-blue-400/30">
                              <span className="text-blue-200 font-medium">Network: {invoice.crypto_chain || 'BASE'}</span>
                            </div>
                            <div className="bg-purple-500/20 px-4 py-2 rounded-xl border border-purple-400/30">
                              <span className="text-purple-200 font-medium">Token: {invoice.crypto_currency || 'USDC'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Payment Address */}
                        <div>
                          <label className="block text-lg font-bold text-white mb-4">
                            Payment Address
                          </label>
                          <div className="flex items-center space-x-3">
                            <input
                              type="text"
                              value={paymentAddress}
                              readOnly
                              className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white font-mono text-sm backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                            />
                            <Button
                              size="sm"
                              onClick={handleCopyAddress}
                              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105"
                            >
                              {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                            </Button>
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-2xl p-6 backdrop-blur-sm">
                          <div className="text-center">
                            <p className="text-blue-200 font-medium mb-2">Amount to Pay</p>
                            <p className="text-3xl font-bold bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent">
                              {invoice.total_amount} {invoice.crypto_currency || 'USDC'}
                            </p>
                          </div>
                        </div>

                        <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-4 rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg">
                          <ExternalLink className="h-5 w-5 mr-3" />
                          Open in Wallet
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="bg-white/5 rounded-2xl p-8 text-center backdrop-blur-sm border border-white/10">
                          <CreditCard className="h-20 w-20 text-white/60 mx-auto mb-6" />
                          <h4 className="text-xl font-bold text-white mb-3">Bank Transfer</h4>
                          <p className="text-white/80">Contact us to arrange bank transfer payment</p>
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
