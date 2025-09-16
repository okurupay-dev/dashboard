import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Copy, CheckCircle, Clock, AlertCircle, ExternalLink } from 'lucide-react';

interface Invoice {
  id: string;
  invoice_number: string;
  public_id: string;
  title: string;
  description: string;
  customer_name: string;
  customer_email: string;
  merchant_id: string;
  total_amount: string;
  simple_amount: string;
  subtotal: string;
  tax_amount: string;
  line_items: any[];
  crypto_currency: string;
  crypto_chain: string;
  status: string;
  payment_address?: string;
  payment_tx_hash?: string;
  amount_paid?: string;
  paid_at?: string;
  due_date?: string;
  created_at: string;
  qr_code_data?: string;
}

interface Merchant {
  business_name: string;
  email: string;
  logo_url?: string;
}

const InvoicePayment: React.FC = () => {
  const { publicId } = useParams<{ publicId: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'paid' | 'failed'>('pending');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (publicId) {
      loadInvoiceData();
      // Set up polling for payment status
      const interval = setInterval(checkPaymentStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [publicId]);

  const loadInvoiceData = async () => {
    try {
      setLoading(true);
      
      // Call the backend API to get invoice data
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://okurutest.up.railway.app'}/pay/${publicId}`);
      
      if (!response.ok) {
        throw new Error('Invoice not found');
      }
      
      const data = await response.json();
      setInvoice(data.invoice);
      setMerchant(data.merchant);
      setPaymentStatus(data.invoice.status === 'paid' ? 'paid' : 'pending');
      
    } catch (err: any) {
      setError(err.message || 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async () => {
    if (!publicId || paymentStatus === 'paid') return;
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://okurutest.up.railway.app'}/pay/${publicId}/status`);
      const data = await response.json();
      
      if (data.status === 'paid') {
        setPaymentStatus('paid');
        setInvoice(prev => prev ? { ...prev, ...data.invoice } : null);
      }
    } catch (err) {
      console.error('Error checking payment status:', err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatAmount = (amount: string | number) => {
    return parseFloat(amount.toString()).toFixed(2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Invoice Not Found</h2>
            <p className="text-gray-600">{error || 'The requested invoice could not be found.'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = () => {
    switch (paymentStatus) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
      case 'processing':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Processing</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />Pending Payment</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header with branding */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            {merchant?.logo_url ? (
              <img src={merchant.logo_url} alt={merchant.business_name} className="h-12 w-auto" />
            ) : (
              <div className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-xl">
                {merchant?.business_name?.charAt(0) || 'O'}
              </div>
            )}
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-900">{merchant?.business_name || 'Okuru Pay'}</h1>
              <p className="text-gray-600">Secure Crypto Payment</p>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            Powered by <span className="font-semibold text-blue-600">Okuru Pay</span>
          </div>
        </div>

        {/* Invoice Paper */}
        <Card className="bg-white shadow-lg border-0">
          <CardHeader className="border-b bg-gray-50">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl font-bold text-gray-900">INVOICE</CardTitle>
                <p className="text-gray-600 mt-1">{invoice.invoice_number}</p>
                <p className="text-sm text-gray-500">Created: {formatDate(invoice.created_at)}</p>
              </div>
              <div className="text-right">
                {getStatusBadge()}
                {invoice.due_date && (
                  <p className="text-sm text-gray-600 mt-2">
                    Due: {formatDate(invoice.due_date)}
                  </p>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-8">
            {/* Bill To Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">BILL TO</h3>
                <div className="text-gray-700">
                  <p className="font-medium">{invoice.customer_name}</p>
                  <p>{invoice.customer_email}</p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">INVOICE DETAILS</h3>
                <div className="text-gray-700 space-y-1">
                  <p><span className="font-medium">Subject:</span> {invoice.title}</p>
                  {invoice.description && (
                    <p><span className="font-medium">Description:</span> {invoice.description}</p>
                  )}
                  <p><span className="font-medium">Network:</span> {invoice.crypto_chain}</p>
                  <p><span className="font-medium">Currency:</span> {invoice.crypto_currency}</p>
                </div>
              </div>
            </div>

            {/* Line Items */}
            {invoice.line_items && invoice.line_items.length > 0 ? (
              <div className="mb-8">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-3 font-semibold text-gray-900">ITEM</th>
                        <th className="text-center py-3 font-semibold text-gray-900">QTY</th>
                        <th className="text-right py-3 font-semibold text-gray-900">UNIT PRICE</th>
                        <th className="text-right py-3 font-semibold text-gray-900">AMOUNT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.line_items.map((item: any, index: number) => (
                        <tr key={index} className="border-b border-gray-100">
                          <td className="py-3">
                            <div className="font-medium text-gray-900">{item.name}</div>
                            {item.description && (
                              <div className="text-sm text-gray-600">{item.description}</div>
                            )}
                          </td>
                          <td className="text-center py-3 text-gray-700">{item.quantity}</td>
                          <td className="text-right py-3 text-gray-700">${formatAmount(item.unit_price)}</td>
                          <td className="text-right py-3 text-gray-700">${formatAmount(item.quantity * item.unit_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="w-full max-w-sm">
                {invoice.line_items && invoice.line_items.length > 0 && (
                  <>
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="text-gray-900">${formatAmount(invoice.subtotal)}</span>
                    </div>
                    {parseFloat(invoice.tax_amount) > 0 && (
                      <div className="flex justify-between py-2 border-b border-gray-200">
                        <span className="text-gray-600">Tax</span>
                        <span className="text-gray-900">${formatAmount(invoice.tax_amount)}</span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-between py-3 border-t-2 border-gray-300">
                  <span className="text-xl font-bold text-gray-900">Total Amount</span>
                  <span className="text-xl font-bold text-blue-600">
                    ${formatAmount(invoice.total_amount || invoice.simple_amount)} {invoice.crypto_currency}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Section */}
            {paymentStatus === 'paid' ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-green-900 mb-2">Payment Received!</h3>
                <p className="text-green-700 mb-4">
                  This invoice has been paid successfully.
                </p>
                {invoice.payment_tx_hash && (
                  <div className="text-sm text-green-600">
                    <p>Transaction Hash: {invoice.payment_tx_hash}</p>
                    <p>Paid: {invoice.paid_at ? formatDate(invoice.paid_at) : 'Recently'}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-4">Payment Instructions</h3>
                
                {invoice.payment_address ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-blue-900 mb-2">
                        Send {invoice.crypto_currency} to this address:
                      </label>
                      <div className="flex items-center space-x-2">
                        <code className="flex-1 bg-white border border-blue-200 rounded px-3 py-2 text-sm font-mono break-all">
                          {invoice.payment_address}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(invoice.payment_address!)}
                          className="shrink-0"
                        >
                          {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    {invoice.qr_code_data && (
                      <div className="text-center">
                        <p className="text-sm text-blue-700 mb-2">Or scan this QR code:</p>
                        <div className="inline-block bg-white p-4 rounded-lg border border-blue-200">
                          <img 
                            src={invoice.qr_code_data} 
                            alt="Payment QR Code" 
                            className="w-48 h-48 mx-auto"
                          />
                        </div>
                      </div>
                    )}

                    <div className="text-sm text-blue-700 space-y-1">
                      <p>• Send exactly <strong>${formatAmount(invoice.total_amount || invoice.simple_amount)} {invoice.crypto_currency}</strong></p>
                      <p>• Network: <strong>{invoice.crypto_chain}</strong></p>
                      <p>• Payment will be confirmed automatically</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-blue-700">Generating payment address...</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Questions about this invoice? Contact {merchant?.email || 'support@okurupay.com'}</p>
          <p className="mt-2">
            Secured by <span className="font-semibold">Okuru Pay</span> • 
            <a href="#" className="text-blue-600 hover:underline ml-1">Terms</a> • 
            <a href="#" className="text-blue-600 hover:underline ml-1">Privacy</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default InvoicePayment;
