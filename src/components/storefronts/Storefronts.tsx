import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Store, 
  Plus, 
  ExternalLink, 
  Copy, 
  QrCode, 
  Edit, 
  Eye, 
  EyeOff,
  Trash2,
  MoreVertical,
  Globe,
  ShoppingBag,
  Settings as SettingsIcon
} from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { storefrontService, StorefrontConfig } from '../../services/storefrontService';

interface Storefront {
  storefront_id: string;
  name: string;
  slug: string;
  description?: string;
  status: 'draft' | 'published' | 'unpublished';
  theme: 'light' | 'dark';
  logo_url?: string;
  banner_url?: string;
  wallet_id?: string;
  product_count: number;
  order_count: number;
  total_revenue: number;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

const Storefronts: React.FC = () => {
  const navigate = useNavigate();
  const [storefront, setStorefront] = useState<StorefrontConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  useEffect(() => {
    loadStorefront();
  }, []);

  const loadStorefront = async () => {
    try {
      setLoading(true);
      const data = await storefrontService.getStorefront();
      setStorefront(data);
    } catch (error) {
      console.error('Error loading storefront:', error);
      setStorefront(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStorefront = () => {
    navigate('/storefronts/create');
  };

  const handleEditStorefront = () => {
    // Navigate to setup/configuration wizard
    navigate('/storefronts/setup');
  };

  const handleViewStorefront = (slug: string) => {
    const url = `${window.location.origin}/s/${slug}`;
    window.open(url, '_blank');
  };

  const handleCopyLink = (slug: string) => {
    const url = `${window.location.origin}/s/${slug}`;
    navigator.clipboard.writeText(url);
    // TODO: Show toast notification
    alert('Store link copied to clipboard!');
  };

  const handleDownloadQR = (slug: string) => {
    // TODO: Implement QR code generation and download
    console.log('Download QR for:', slug);
  };

  const handlePublishToggle = async () => {
    if (!storefront || !storefront.storefront_id) return;
    
    try {
      if (storefront.status === 'published') {
        await storefrontService.unpublishStorefront(storefront.storefront_id);
      } else {
        await storefrontService.publishStorefront(storefront.storefront_id);
      }
      loadStorefront();
    } catch (error) {
      console.error('Error toggling publish status:', error);
      alert(error instanceof Error ? error.message : 'Failed to update status');
    }
  };

  const handleDeleteStorefront = async () => {
    if (!storefront) return;
    
    if (!window.confirm('Are you sure you want to delete this storefront? This action cannot be undone.')) {
      return;
    }
    
    try {
      // TODO: API call to delete
      // await storefrontService.deleteStorefront(storefront.storefront_id);
      setStorefront(null);
    } catch (error) {
      console.error('Error deleting storefront:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'success' | 'warning'> = {
      published: 'success',
      draft: 'warning',
      unpublished: 'default'
    };
    return <Badge variant={variants[status] || 'default'}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading storefronts...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Storefront</h2>
          <p className="text-gray-600 mt-1">
            {storefront 
              ? 'Manage your hosted store page and start selling.' 
              : 'Launch a hosted store page and start selling today.'}
          </p>
        </div>
        {!storefront && (
          <button
            onClick={handleCreateStorefront}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Storefront
          </button>
        )}
      </div>

      {/* Empty State */}
      {!storefront && (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Store className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No storefronts yet</h3>
            <p className="text-gray-600 mb-6 max-w-md">
              Launch your hosted page in minutes—no code needed. Name your store, pick products, and publish.
            </p>
            <button
              onClick={handleCreateStorefront}
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Your First Storefront
            </button>
          </div>
        </Card>
      )}

      {/* Storefront Display */}
      {storefront && (
        <div className="max-w-2xl mx-auto">
          <Card className="overflow-hidden hover:shadow-lg transition-shadow">
              {/* Header with Gradient (no banner) */}
              <div className="h-32 bg-gradient-to-br from-blue-500 to-purple-600 relative">
                <div className="absolute top-4 right-4">
                  {getStatusBadge(storefront.status || 'draft')}
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Logo & Name */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    {storefront.merchant_logo ? (
                      <img src={storefront.merchant_logo} alt="" className="w-14 h-14 rounded-lg object-cover border-2 border-gray-200" />
                    ) : (
                      <div className="w-14 h-14 bg-gray-200 rounded-lg flex items-center justify-center border-2 border-gray-300">
                        <Store className="h-7 w-7 text-gray-500" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{storefront.merchant_name || 'My Store'}</h3>
                      <p className="text-sm text-gray-500">okurupay.com/s/{storefront.slug}</p>
                    </div>
                  </div>
                  
                  {/* Edit Button */}
                  <button
                    onClick={handleEditStorefront}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Edit Storefront"
                  >
                    <Edit className="h-5 w-5 text-gray-600" />
                  </button>
                </div>

                {/* Description */}
                {storefront.description && (
                  <p className="text-sm text-gray-600 mb-6">{storefront.description}</p>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{storefront.product_count || 0}</div>
                    <div className="text-xs text-gray-500 mt-1">Products</div>
                  </div>
                  <div className="text-center border-x border-gray-200">
                    <div className="text-2xl font-bold text-gray-900">{storefront.order_count || 0}</div>
                    <div className="text-xs text-gray-500 mt-1">Orders</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      ${(storefront.total_revenue || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Revenue</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {/* Visit Store / Publish Toggle */}
                  {storefront.status === 'published' ? (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleViewStorefront(storefront.slug)}
                        className="flex-1 flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        <ExternalLink className="h-5 w-5 mr-2" />
                        Visit Store
                      </button>
                      <button
                        onClick={handlePublishToggle}
                        className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                      >
                        <EyeOff className="h-5 w-5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handlePublishToggle}
                      className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      <Eye className="h-5 w-5 mr-2" />
                      Publish Store
                    </button>
                  )}

                  {/* Secondary Actions */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => navigate(`/storefronts/${storefront.storefront_id}/orders`)}
                      className="flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                    >
                      <ShoppingBag className="h-4 w-4 mr-2" />
                      Orders
                    </button>
                    <button
                      onClick={() => handleCopyLink(storefront.slug)}
                      className="flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Link
                    </button>
                  </div>
                </div>
              </div>
            </Card>
        </div>
      )}
    </div>
  );
};

export default Storefronts;
