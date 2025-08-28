import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Plus, FileText, Send, Eye, Download, Edit, Trash2, Search, Filter, Copy, MoreHorizontal, Calendar } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useInvoiceStore, InvoiceStatus } from '../../stores/invoiceStore';
import { invoiceApi, Invoice } from '../../services/invoiceApi';

const Invoices: React.FC = () => {
  const navigate = useNavigate();
  const { 
    sendInvoice, 
    cancelInvoice, 
    copyPayLink 
  } = useInvoiceStore();
  
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'drafted'>('overview');
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // Load invoices from API
  const loadInvoices = async () => {
    try {
      setLoading(true);
      const params: any = {};
      
      if (searchTerm) params.search = searchTerm;
      if (activeTab === 'drafted') {
        params.status = 'draft';
      } else if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const data = await invoiceApi.listInvoices(params);
      
      // Filter based on active tab
      let filteredData = data;
      if (activeTab === 'overview') {
        filteredData = data.filter(invoice => 
          invoice.status !== 'draft'
        );
      }
      
      setInvoices(filteredData);
    } catch (error) {
      console.error('Error loading invoices:', error);
      // Check if it's an auth issue
      if (error instanceof Error && (error.message?.includes('401') || error.message?.includes('403'))) {
        console.error('Authentication error - user may need to re-login');
      }
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [activeTab, statusFilter, searchTerm]);

  const getStatusColor = (status: InvoiceStatus) => {
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

  const handleSendInvoice = async (id: string) => {
    try {
      await invoiceApi.updateInvoiceStatus(id, 'sent');
      alert('Invoice sent successfully!');
      loadInvoices(); // Refresh the list
    } catch (error) {
      console.error('Error sending invoice:', error);
      alert('Failed to send invoice. Please try again.');
    }
  };

  const handleCancelInvoice = async (id: string, invoice: any) => {
    if (window.confirm(`Are you sure you want to cancel invoice ${invoice.invoice_number}?`)) {
      try {
        await invoiceApi.updateInvoiceStatus(id, 'canceled');
        alert('Invoice canceled successfully!');
        loadInvoices(); // Refresh the list
      } catch (error) {
        console.error('Error canceling invoice:', error);
        alert('Failed to cancel invoice. Please try again.');
      }
    }
  };

  const handleCopyPayLink = (invoice: Invoice) => {
    if (invoice.public_url) {
      navigator.clipboard.writeText(invoice.public_url);
      alert(`Pay link copied to clipboard: ${invoice.public_url}`);
    } else {
      alert('Public URL not available for this invoice');
    }
  };

  const handleResendInvoice = async (id: string) => {
    try {
      await invoiceApi.updateInvoiceStatus(id, 'sent');
      alert('Invoice resent successfully!');
      loadInvoices(); // Refresh the list
    } catch (error) {
      console.error('Error resending invoice:', error);
      alert('Failed to resend invoice. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600">Create and manage one-time invoices</p>
        </div>
        <Button 
          onClick={() => navigate('/invoices/new')}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Invoice
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`
              py-2 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('drafted')}
            className={`
              py-2 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'drafted'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Drafted
          </button>
        </nav>
      </div>

      {/* Filters and Search */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search invoices, customers, or emails..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Status Filter - Only show for Overview tab */}
          {activeTab === 'overview' && (
            <div className="w-full lg:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | 'all')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="sent">Sent</option>
                <option value="viewed">Viewed</option>
                <option value="pending_payment">Pending Payment</option>
                <option value="paid">Paid</option>
                <option value="expired">Expired</option>
                <option value="canceled">Canceled</option>
                <option value="underpaid">Underpaid</option>
                <option value="overpaid">Overpaid</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
          )}

          {/* Date Filters Toggle */}
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="w-full lg:w-auto"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Date Range
          </Button>
        </div>

        {/* Date Range Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                  }}
                  className="w-full sm:w-auto"
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Results Summary */}
      <div className="text-sm text-gray-600">
        Showing {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
        {statusFilter !== 'all' && ` with status "${statusFilter}"`}
        {searchTerm && ` matching "${searchTerm}"`}
      </div>

      {/* Invoices List */}
      {invoices.length === 0 ? (
        <Card className="p-8">
          <div className="text-center">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm || statusFilter !== 'all' ? 'No matching invoices' : 'No invoices yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'Create your first invoice to get started'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Button 
                onClick={() => navigate('/invoices/new')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Invoice
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Invoice #</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Customer</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Asset/Chain</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Created</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <Link 
                        to={`/invoices/${invoice.id}`}
                        className="font-medium text-blue-600 hover:text-blue-800"
                      >
                        {invoice.invoice_number}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">
                        {invoice.customer_name || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-600">{invoice.customer_email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">
                        {invoice.currency_mode === 'crypto' 
                          ? `${(invoice.amount_crypto || invoice.simple_amount || 0).toFixed(6)} ${invoice.crypto_asset}`
                          : `${invoice.fiat_currency || 'USD'} ${(invoice.total_amount || 0).toFixed(2)}`
                        }
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {invoice.currency_mode === 'crypto' ? (
                        <div className="text-sm">
                          <div className="font-medium">{invoice.crypto_asset}</div>
                          <div className="text-gray-600">{invoice.chain}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Fiat</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.status as InvoiceStatus)}`}>
                        {invoice.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-sm">
                      {new Date(invoice.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <Link to={`/invoices/${invoice.id}`}>
                          <Button size="sm" variant="outline" title="View Details">
                            <Eye className="h-3 w-3" />
                          </Button>
                        </Link>
                        
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleCopyPayLink(invoice)}
                          title="Copy Pay Link"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>

                        {invoice.status === 'draft' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleSendInvoice(invoice.id)}
                            title="Send Invoice"
                          >
                            <Send className="h-3 w-3" />
                          </Button>
                        )}

                        {(invoice.status === 'sent' || invoice.status === 'viewed') && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleResendInvoice(invoice.id)}
                            title="Resend Invoice"
                          >
                            <Send className="h-3 w-3" />
                          </Button>
                        )}

                        {(invoice.status === 'draft' || invoice.status === 'sent') && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleCancelInvoice(invoice.id, invoice)}
                            title="Cancel Invoice"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Invoices;
