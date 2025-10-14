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
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

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
  const { userData } = useAuth();
  const [storefront, setStorefront] = useState<StorefrontConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  useEffect(() => {
    if (userData?.merchant_id) {
      loadStorefront();
    }
  }, [userData?.merchant_id]);

  const loadStorefront = async () => {
    if (!userData?.merchant_id) return;
    
    try {
      setLoading(true);
      console.log('🏪 Loading storefront from API...');
      
      // Try backend API first
      try {
        const data = await storefrontService.getStorefront();
        console.log('🏪 Storefront API response:', data);
        if (data) {
          setStorefront(data);
          return;
        }
      } catch (apiError) {
        console.log('⚠️ Backend API failed, trying Supabase fallback...');
        console.error('🚨 API Error details:', apiError);
      }

      // Fallback: Query Supabase directly (same as StorefrontBuilder)
      console.log('🔍 Querying Supabase for merchant_id:', userData.merchant_id);
      
      const { data: storefronts, error: sfError } = await supabase
        .from('storefronts')
        .select('*')
        .eq('merchant_id', userData.merchant_id)
        .single();

      console.log('📊 Supabase query result:', { data: storefronts, error: sfError });

      if (sfError) {
        console.log('📭 Supabase error details:', sfError);
        
        // Try without .single() to see if there are multiple results
        const { data: allStorefronts, error: allError } = await supabase
          .from('storefronts')
          .select('*')
          .eq('merchant_id', userData.merchant_id);
          
        console.log('🔍 All storefronts for merchant:', { data: allStorefronts, error: allError });
        
        if (allStorefronts && allStorefronts.length > 0) {
          console.log('✅ Found storefront(s), using first one:', allStorefronts[0]);
          
          // Load product count from storefront_products table
          const storefrontWithProducts = await loadStorefrontProducts(allStorefronts[0]);
          setStorefront(storefrontWithProducts);
        } else {
          setStorefront(null);
        }
      } else {
        console.log('✅ Loaded storefront from Supabase fallback:', storefronts);
        console.log('🛍️ Storefront selected_products:', storefronts.selected_products);
        console.log('📊 Storefront product_count:', storefronts.product_count);
        
        // Load product count from storefront_products table
        const storefrontWithProducts = await loadStorefrontProducts(storefronts);
        setStorefront(storefrontWithProducts);
      }
    } catch (error) {
      console.error('❌ Error loading storefront:', error);
      setStorefront(null);
    } finally {
      setLoading(false);
    }
  };

  const loadStorefrontProducts = async (storefront: any) => {
    try {
      // Get actual product count from storefront_products table
      const { data: storefrontProducts, error: productsError } = await supabase
        .from('storefront_products')
        .select('product_id')
        .eq('storefront_id', storefront.storefront_id);

      if (!productsError && storefrontProducts) {
        console.log('🛍️ Found storefront products:', storefrontProducts);
        return {
          ...storefront,
          actual_product_count: storefrontProducts.length,
          selected_products: storefrontProducts.map(sp => sp.product_id)
        };
      } else {
        console.log('📭 No products found for storefront:', productsError);
        return {
          ...storefront,
          actual_product_count: 0,
          selected_products: []
        };
      }
    } catch (error) {
      console.error('❌ Error loading storefront products:', error);
      return storefront;
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
    window.open(`https://shop.okurupay.com/${slug}`, '_blank');
  };

  const handleCopyLink = (slug: string) => {
    const url = `https://shop.okurupay.com/${slug}`;
    navigator.clipboard.writeText(url);
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

      {/* Storefront Display - Redesigned */}
      {storefront && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Store Info & Actions */}
          <div className="lg:col-span-1">
            <Card className="overflow-hidden border-0 shadow-lg">
              <div className="p-5">
                {/* Logo & Status */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    {storefront.merchant_logo ? (
                      <img src={storefront.merchant_logo} alt="" className="w-16 h-16 rounded-xl object-cover border-2 border-gray-200" />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center border-2 border-gray-200">
                        <Store className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div>
                    {getStatusBadge(storefront.status || 'draft')}
                  </div>
                </div>

                {/* Store Name & URL */}
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{storefront.name || ''}</h3>
                  <p className="text-xs text-gray-500">okurupay.com/s/{storefront.slug}</p>
                  {storefront.description && (
                    <p className="text-sm text-gray-600 mt-2">{storefront.description}</p>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-xl font-bold text-gray-900">
                      {(storefront as any).actual_product_count ?? storefront.selected_products?.length ?? (storefront as any).product_count ?? 0}
                    </div>
                    <div className="text-xs text-gray-500">Products</div>
                  </div>
                  <div className="text-center border-x border-gray-200">
                    <div className="text-xl font-bold text-gray-900">{storefront.order_count || 0}</div>
                    <div className="text-xs text-gray-500">Orders</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-gray-900">${(storefront.total_revenue || 0).toLocaleString()}</div>
                    <div className="text-xs text-gray-500">Revenue</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  {storefront.status === 'published' ? (
                    <>
                      <button
                        onClick={() => handleViewStorefront(storefront.slug)}
                        className="w-full flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Visit Store
                      </button>
                      <button
                        onClick={handlePublishToggle}
                        className="w-full flex items-center justify-center px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                      >
                        <EyeOff className="h-4 w-4 mr-2" />
                        Unpublish
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handlePublishToggle}
                      className="w-full flex items-center justify-center px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Publish Store
                    </button>
                  )}
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleEditStorefront}
                      className="flex items-center justify-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-xs"
                    >
                      <Edit className="h-3.5 w-3.5 mr-1.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleCopyLink(storefront.slug)}
                      className="flex items-center justify-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-xs"
                    >
                      <Copy className="h-3.5 w-3.5 mr-1.5" />
                      Copy Link
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column - Recent Activity */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Orders */}
            <Card className="p-5 border-0 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Recent Orders</h3>
                <button
                  onClick={() => navigate(`/storefronts/${storefront.storefront_id}/orders`)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View All
                </button>
              </div>
              
              {storefront.order_count === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm text-gray-600">No orders yet</p>
                  <p className="text-xs text-gray-500 mt-1">Orders will appear here once customers make purchases</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-sm">No recent orders yet</p>
                  <p className="text-gray-500 text-xs mt-1">Orders will appear here once customers start purchasing</p>
                </div>
              )}
            </Card>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={handleEditStorefront}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <SettingsIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Customize</p>
                    <p className="text-xs text-gray-500">Edit design & products</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={() => handleDownloadQR(storefront.slug)}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <QrCode className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">QR Code</p>
                    <p className="text-xs text-gray-500">Download & share</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Storefronts;
