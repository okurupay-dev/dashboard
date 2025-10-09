import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Eye, Copy, Send, Trash2, Edit, Plus, Search, Calendar, FileText } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useInvoiceStore, InvoiceStatus } from '../../stores/invoiceStore';
import { invoiceApi, Invoice } from '../../services/invoiceApi';
import SavedContacts from './SavedContacts';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'drafted' | 'contacts'>('overview');
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

      let data;
      if (activeTab === 'drafted') {
        // For drafted tab, query standalone_invoices table directly
        const { data: drafts, error } = await supabase
          .from('standalone_invoices')
          .select('*')
          .eq('status', 'draft')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        data = drafts || [];
      } else {
        // For overview tab, query standalone_invoices directly
        const { data: allInvoices, error } = await supabase
          .from('standalone_invoices')
          .select('*')
          .neq('status', 'draft') // Show sent/paid invoices (not drafts)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        data = allInvoices || [];
      }
      
      // Ensure data is an array before filtering
      const invoicesArray = Array.isArray(data) ? data : [];
      
      // Filter based on active tab
      let filteredData = invoicesArray;
      if (activeTab === 'overview') {
        filteredData = invoicesArray.filter(invoice => 
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


  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<any>(null);

  const handleDeleteDraft = async (id: string, invoice: any) => {
    // Only allow deletion of draft invoices
    if (invoice.status !== 'draft') {
      alert('Only draft invoices can be deleted. Sent or paid invoices cannot be deleted.');
      return;
    }
    
    setInvoiceToDelete({ id, invoice });
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (invoiceToDelete) {
      try {
        const { error } = await supabase
          .from('standalone_invoices')
          .delete()
          .eq('id', invoiceToDelete.id);
        
        if (error) throw error;
        
        // Use a longer-lasting notification
        const notification = document.createElement('div');
        notification.innerHTML = `
          <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            font-weight: 500;
          ">
            ✅ Draft ${invoiceToDelete.invoice.invoice_number} deleted successfully
          </div>
        `;
        document.body.appendChild(notification);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
          document.body.removeChild(notification);
        }, 3000);
        
        setDeleteModalOpen(false);
        setInvoiceToDelete(null);
        loadInvoices(); // Refresh the list
      } catch (error) {
        console.error('Error deleting draft:', error);
        
        // Error notification
        const errorNotification = document.createElement('div');
        errorNotification.innerHTML = `
          <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ef4444;
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            font-weight: 500;
          ">
            ❌ Failed to delete draft. Please try again.
          </div>
        `;
        document.body.appendChild(errorNotification);
        
        setTimeout(() => {
          document.body.removeChild(errorNotification);
        }, 4000);
        
        setDeleteModalOpen(false);
        setInvoiceToDelete(null);
      }
    }
  };

  const cancelDelete = () => {
    setDeleteModalOpen(false);
    setInvoiceToDelete(null);
  };

  const handleCopyPayLink = (invoice: Invoice) => {
    console.log('🔍 Invoice object:', invoice);
    console.log('🔗 Public URL field:', invoice.public_url);
    console.log('🔗 Alternative fields:', {
      publicUrl: (invoice as any).publicUrl,
      public_id: invoice.public_id,
      invoice_number: invoice.invoice_number
    });
    
    // Try multiple possible URL fields
    const publicUrl = invoice.public_url || 
                     (invoice as any).publicUrl || 
                     (invoice.public_id ? `https://pay.okurupay.com/pay/${invoice.public_id}` : null);
    
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl);
      alert(`Pay link copied to clipboard: ${publicUrl}`);
    } else {
      alert('Public URL not available for this invoice. Please check the console for debugging info.');
    }
  };


  const handleCancelInvoice = async (invoiceId: string, invoice: Invoice) => {
    if (window.confirm(`Are you sure you want to cancel this invoice? This action cannot be undone.`)) {
      try {
        // Update invoice status to cancelled
        const { error } = await supabase
          .from('standalone_invoices')
          .update({ status: 'cancelled' })
          .eq('id', invoiceId);
        
        if (error) throw error;
        
        // Reload invoices
        loadInvoices();
        alert('Invoice cancelled successfully');
      } catch (error) {
        console.error('Error cancelling invoice:', error);
        alert('Failed to cancel invoice');
      }
    }
  };

  const handleVoidInvoice = async (invoiceId: string, invoice: Invoice) => {
    if (window.confirm(`Are you sure you want to void this invoice? This action cannot be undone.`)) {
      try {
        // Update invoice status to voided
        const { error } = await supabase
          .from('standalone_invoices')
          .update({ status: 'voided' })
          .eq('id', invoiceId);
        
        if (error) throw error;
        
        // Reload invoices
        loadInvoices();
        alert('Invoice voided successfully');
      } catch (error) {
        console.error('Error voiding invoice:', error);
        alert('Failed to void invoice');
      }
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
          onClick={() => navigate('/invoices/create')}
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
          <button
            onClick={() => setActiveTab('contacts')}
            className={`
              py-2 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'contacts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Saved Contacts
          </button>
        </nav>
      </div>

      {/* Filters and Search - Only show for invoice tabs */}
      {activeTab !== 'contacts' && (
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
      )}

      {/* Results Summary - Only show for invoice tabs */}
      {activeTab !== 'contacts' && (
        <div className="text-sm text-gray-600">
          Showing {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
          {statusFilter !== 'all' && ` with status "${statusFilter}"`}
          {searchTerm && ` matching "${searchTerm}"`}
        </div>
      )}

      {/* Invoices List - Only show for invoice tabs */}
      {activeTab !== 'contacts' && invoices.length === 0 ? (
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
                onClick={() => navigate('/invoices/create')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Invoice
              </Button>
            )}
          </div>
        </Card>
      ) : activeTab !== 'contacts' ? (
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
                          ? `${((invoice as any).total_amount || invoice.amount_crypto || invoice.simple_amount || 0).toFixed(2)} ${(invoice as any).crypto_currency || invoice.crypto_asset || 'USDC'}`
                          : `${invoice.fiat_currency || 'USD'} ${(invoice.total_amount || 0).toFixed(2)}`
                        }
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {invoice.currency_mode === 'crypto' ? (
                        <div className="text-sm">
                          <div className="font-medium">{(invoice as any).crypto_currency || invoice.crypto_asset || 'USDC'}</div>
                          <div className="text-gray-600">{(invoice as any).crypto_chain || invoice.chain || 'BASE'}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Fiat</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(getEffectiveStatus(invoice) as InvoiceStatus)}`}>
                        {getStatusDisplayText(getEffectiveStatus(invoice))}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-sm">
                      {new Date(invoice.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        {invoice.status === 'draft' ? (
                          // Draft actions: Edit and Delete only
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => navigate(`/invoices/create?edit=${invoice.id}`)}
                              title="Edit Draft"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleDeleteDraft(invoice.id, invoice)}
                              title="Delete Draft"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          // Non-draft actions: View, Copy, Send/Resend, Cancel
                          <>
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


                            {/* Show different actions based on status */}
                            {getEffectiveStatus(invoice) === 'expired' ? (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleVoidInvoice(invoice.id, invoice)}
                                title="Void Expired Invoice"
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            ) : invoice.status === 'sent' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleCancelInvoice(invoice.id, invoice)}
                                title="Cancel Invoice"
                                className="text-orange-600 hover:text-orange-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {/* Contacts Tab Content */}
      {activeTab === 'contacts' && (
        <SavedContacts />
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteModalOpen && invoiceToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">Delete Draft Invoice</h3>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-3">
                Are you sure you want to delete this draft invoice? This action cannot be undone.
              </p>
              
              <div className="bg-gray-50 rounded-md p-3 text-sm">
                <div><strong>Invoice:</strong> {invoiceToDelete.invoice.invoice_number}</div>
                <div><strong>Customer:</strong> {invoiceToDelete.invoice.customer_name || invoiceToDelete.invoice.customer_email || 'N/A'}</div>
                <div><strong>Amount:</strong> {invoiceToDelete.invoice.total_amount || invoiceToDelete.invoice.simple_amount || 0} USDC</div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={cancelDelete}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={confirmDelete}
                className="bg-red-600 text-white hover:bg-red-700 border-red-600"
              >
                Delete Draft
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;
