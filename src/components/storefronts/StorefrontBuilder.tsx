import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Eye,
  Smartphone,
  Monitor,
  Save,
  Globe,
  Palette,
  Image as ImageIcon,
  Type,
  Layout,
  ShoppingBag,
  Settings,
  Upload,
  Plus,
  Trash2,
  ExternalLink,
  Store
} from 'lucide-react';
import { Card } from '../ui/card';
import { productService, Product as DBProduct } from '../../services/productService';
import { supabase } from '../../lib/supabase';
import { storefrontService } from '../../services/storefrontService';

interface StorefrontConfig {
  name: string;
  slug: string;
  description: string;
  tagline: string;
  theme: 'light' | 'dark';
  primaryColor: string;
  contact_email?: string;
  social_links: {
    instagram?: string;
    twitter?: string;
    tiktok?: string;
    website?: string;
  };
  selectedProducts: string[];
  refund_policy?: string;
  terms?: string;
}

const StorefrontBuilder: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'design' | 'products' | 'settings'>('design');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [isSaving, setIsSaving] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [merchantLogo, setMerchantLogo] = useState<string | null>(null);
  const [merchantName, setMerchantName] = useState<string>('');
  
  const [config, setConfig] = useState<StorefrontConfig>({
    name: '',
    slug: '',
    description: '',
    tagline: '',
    theme: 'dark',
    primaryColor: '#3B82F6',
    contact_email: '',
    social_links: {},
    selectedProducts: [],
    refund_policy: '',
    terms: ''
  });

  const [availableProducts, setAvailableProducts] = useState<DBProduct[]>([]);

  // Load products and merchant info from database
  useEffect(() => {
    loadProducts();
    loadMerchantInfo();
  }, []);

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      const products = await productService.getActiveProducts();
      setAvailableProducts(products);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadMerchantInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found');
        return;
      }

      // Get user's merchant_id first
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('merchant_id')
        .eq('auth_user_id', user.id)
        .single();

      if (userError || !userData?.merchant_id) {
        console.error('Error getting merchant_id:', userError);
        return;
      }

      // Get merchant info from database
      const { data: merchant, error } = await supabase
        .from('merchants')
        .select('name, logo_url')
        .eq('merchant_id', userData.merchant_id)
        .single();

      if (error) {
        console.error('Error loading merchant info:', error);
        return;
      }

      console.log('Merchant data:', merchant);

      if (merchant) {
        setMerchantName(merchant.name || '');
        
        // Handle Supabase storage URLs - get fresh signed URL if needed
        if (merchant.logo_url) {
          console.log('Original logo URL:', merchant.logo_url);
          
          // If it's a storage path (not a full URL), get the public URL
          if (merchant.logo_url.includes('merchant-logos/')) {
            // Extract the path from the URL
            const pathMatch = merchant.logo_url.match(/merchant-logos\/(.+?)(?:\?|$)/);
            if (pathMatch) {
              const path = pathMatch[1]; // Just the file path without bucket name
              console.log('Extracted path:', path);
              
              // Get a fresh signed URL (valid for 1 hour)
              const { data: signedData, error: signError } = await supabase.storage
                .from('merchant-logos')
                .createSignedUrl(path, 3600);
              
              if (signError) {
                console.error('Error creating signed URL:', signError);
                setMerchantLogo(merchant.logo_url); // Fallback to original
              } else if (signedData?.signedUrl) {
                console.log('New signed URL:', signedData.signedUrl);
                setMerchantLogo(signedData.signedUrl);
              } else {
                setMerchantLogo(merchant.logo_url);
              }
            } else {
              console.log('Could not extract path, using original URL');
              setMerchantLogo(merchant.logo_url);
            }
          } else {
            console.log('Not a storage URL, using as-is');
            setMerchantLogo(merchant.logo_url);
          }
        } else {
          console.log('No logo URL found');
        }
      }
    } catch (error) {
      console.error('Error loading merchant info:', error);
    }
  };

  const updateConfig = (updates: Partial<StorefrontConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    if (!config.name || !config.slug) {
      alert('Please add a store name before saving.');
      return;
    }

    setIsSaving(true);
    try {
      // Prepare data for API
      const storefrontData = {
        name: config.name || merchantName || 'My Store', // Backend requires this
        slug: config.slug,
        description: config.description,
        tagline: config.tagline,
        theme: config.theme,
        primary_color: config.primaryColor,
        contact_email: config.contact_email || '', // Backend requires this
        wallet_id: undefined, // Optional - backend will use default
        social_links: config.social_links,
        selected_products: config.selectedProducts,
        refund_policy: config.refund_policy,
        terms: config.terms
      };

      // Check if storefront exists
      const existingStorefront = await storefrontService.getStorefront();
      
      if (existingStorefront?.storefront_id) {
        // Update existing storefront
        await storefrontService.updateStorefront(existingStorefront.storefront_id, storefrontData);
        alert('Storefront saved successfully!');
      } else {
        // Create new storefront
        await storefrontService.createStorefront(storefrontData);
        alert('Storefront created successfully!');
      }
    } catch (error) {
      console.error('Error saving storefront:', error);
      alert(error instanceof Error ? error.message : 'Failed to save storefront. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    // Basic validation - just need a name and slug
    if (!config.name || !config.slug) {
      alert('Please add a store name before publishing.');
      return;
    }

    try {
      setIsSaving(true);

      // Prepare storefront data
      const storefrontData = {
        name: config.name || merchantName || 'My Store', // Backend requires this
        slug: config.slug,
        description: config.description,
        tagline: config.tagline,
        theme: config.theme,
        primary_color: config.primaryColor,
        contact_email: config.contact_email || '', // Backend requires this
        wallet_id: undefined, // Optional - backend will use default
        social_links: config.social_links,
        selected_products: config.selectedProducts,
        refund_policy: config.refund_policy,
        terms: config.terms
      };

      let storefrontId: string;
      
      try {
        // Try to check if storefront exists
        const existingStorefront = await storefrontService.getStorefront();
        
        if (existingStorefront?.storefront_id) {
          // Update existing storefront
          await storefrontService.updateStorefront(existingStorefront.storefront_id, storefrontData);
          storefrontId = existingStorefront.storefront_id;
        } else {
          // Create new storefront
          const newStorefront = await storefrontService.createStorefront(storefrontData);
          storefrontId = newStorefront.storefront_id!;
        }
      } catch (checkError) {
        // If checking fails (404 or 500), assume it doesn't exist and create new
        console.log('Could not check existing storefront, creating new one:', checkError);
        const newStorefront = await storefrontService.createStorefront(storefrontData);
        storefrontId = newStorefront.storefront_id!;
      }

      // Then publish it
      await storefrontService.publishStorefront(storefrontId);
      
      alert('Storefront published! Your store is now live at /s/' + config.slug);
      navigate('/storefronts');
    } catch (error) {
      console.error('Error publishing storefront:', error);
      alert(error instanceof Error ? error.message : 'Failed to publish storefront. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleProduct = (productId: string) => {
    setConfig(prev => ({
      ...prev,
      selectedProducts: prev.selectedProducts.includes(productId)
        ? prev.selectedProducts.filter(id => id !== productId)
        : [...prev.selectedProducts, productId]
    }));
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/storefronts')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Storefront Builder</h1>
            <p className="text-sm text-gray-500">Build your store visually</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Preview Mode Toggle */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setPreviewMode('desktop')}
              className={`p-2 rounded ${previewMode === 'desktop' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
            >
              <Monitor className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPreviewMode('mobile')}
              className={`p-2 rounded ${previewMode === 'mobile' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
            >
              <Smartphone className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save'}
          </button>

          <button
            onClick={handlePublish}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Globe className="h-4 w-4" />
            Publish
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Editor */}
        <div className="w-96 bg-white border-r border-gray-200 overflow-y-auto">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('design')}
                className={`flex-1 px-4 py-3 text-sm font-medium ${
                  activeTab === 'design'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Palette className="h-4 w-4 inline mr-2" />
                Design
              </button>
              <button
                onClick={() => setActiveTab('products')}
                className={`flex-1 px-4 py-3 text-sm font-medium ${
                  activeTab === 'products'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ShoppingBag className="h-4 w-4 inline mr-2" />
                Products
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex-1 px-4 py-3 text-sm font-medium ${
                  activeTab === 'settings'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Settings className="h-4 w-4 inline mr-2" />
                Settings
              </button>
            </div>
          </div>

          {/* Editor Content */}
          <div className="p-6 space-y-6">
            {/* Design Tab */}
            {activeTab === 'design' && (
              <>
                {/* Store Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Store Name
                  </label>
                  <input
                    type="text"
                    value={config.name}
                    onChange={(e) => {
                      updateConfig({ 
                        name: e.target.value,
                        slug: generateSlug(e.target.value)
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="My Awesome Store"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    URL: /s/{config.slug}
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={config.description}
                    onChange={(e) => updateConfig({ description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Tell customers about your store..."
                  />
                </div>

                {/* Tagline */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tagline
                  </label>
                  <input
                    type="text"
                    value={config.tagline}
                    onChange={(e) => updateConfig({ tagline: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your catchy tagline..."
                  />
                </div>

                {/* Theme */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Theme
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => updateConfig({ theme: 'light' })}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        config.theme === 'light'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="w-full h-12 bg-white rounded mb-2"></div>
                      <p className="text-sm font-medium">Light</p>
                    </button>
                    <button
                      onClick={() => updateConfig({ theme: 'dark' })}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        config.theme === 'dark'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="w-full h-12 bg-gray-900 rounded mb-2"></div>
                      <p className="text-sm font-medium">Dark</p>
                    </button>
                  </div>
                </div>

                {/* Primary Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primary Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={config.primaryColor}
                      onChange={(e) => updateConfig({ primaryColor: e.target.value })}
                      className="h-10 w-20 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={config.primaryColor}
                      onChange={(e) => updateConfig({ primaryColor: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Logo Info (Read-only - uses merchant logo) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Store Logo
                  </label>
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">
                      Your store uses your business logo from Settings
                    </p>
                    <button
                      onClick={() => navigate('/settings')}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Update logo in Settings →
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Products Tab */}
            {activeTab === 'products' && (
              <>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Select Products to Display
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Choose which products to show on your storefront. Products are managed in the Products section.
                  </p>

                  {availableProducts.length === 0 && (
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800 mb-2">
                        No products found. Create products first to add them to your storefront.
                      </p>
                      <button
                        onClick={() => navigate('/products')}
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Go to Products
                      </button>
                    </div>
                  )}

                  <div className="space-y-3">
                    {availableProducts.map((product) => (
                      <div
                        key={product.product_id}
                        onClick={() => toggleProduct(product.product_id)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          config.selectedProducts.includes(product.product_id)
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{product.item_name}</h4>
                            <p className="text-sm text-gray-600 mt-1">{product.description || 'No description'}</p>
                            <p className="text-lg font-semibold text-gray-900 mt-2">
                              ${Number(product.price).toFixed(2)}
                            </p>
                          </div>
                          {config.selectedProducts.includes(product.product_id) && (
                            <div className="ml-3 flex-shrink-0">
                              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {config.selectedProducts.length === 0 && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        💡 No products selected yet. You can publish your store and add products later.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <>
                {/* Contact Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Email *
                  </label>
                  <input
                    type="email"
                    value={config.contact_email}
                    onChange={(e) => updateConfig({ contact_email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="support@example.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Required for customer support
                  </p>
                </div>

                {/* Social Links */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Social Media Links
                  </label>
                  <div className="space-y-2">
                    <input
                      type="url"
                      value={config.social_links.instagram || ''}
                      onChange={(e) => updateConfig({
                        social_links: { ...config.social_links, instagram: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Instagram URL"
                    />
                    <input
                      type="url"
                      value={config.social_links.twitter || ''}
                      onChange={(e) => updateConfig({
                        social_links: { ...config.social_links, twitter: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Twitter URL"
                    />
                    <input
                      type="url"
                      value={config.social_links.website || ''}
                      onChange={(e) => updateConfig({
                        social_links: { ...config.social_links, website: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Website URL"
                    />
                  </div>
                </div>

                {/* Refund Policy */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Refund Policy
                  </label>
                  <textarea
                    value={config.refund_policy}
                    onChange={(e) => updateConfig({ refund_policy: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe your refund policy..."
                  />
                </div>

                {/* Terms */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Terms of Service
                  </label>
                  <textarea
                    value={config.terms}
                    onChange={(e) => updateConfig({ terms: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your terms of service..."
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Panel - Live Preview */}
        <div className="flex-1 bg-gray-100 p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            <div
              className={`bg-white rounded-lg shadow-xl overflow-hidden transition-all ${
                previewMode === 'mobile' ? 'max-w-sm mx-auto' : 'w-full'
              }`}
            >
              {/* Preview Content */}
              <div className={config.theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}>
                {/* Header */}
                <div className="p-8 text-center border-b border-gray-700">
                  {/* Logo - uses merchant logo from settings */}
                  {merchantLogo ? (
                    <img 
                      src={merchantLogo} 
                      alt={merchantName} 
                      className="w-20 h-20 mx-auto rounded-2xl mb-4 object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 mx-auto rounded-2xl bg-gray-700 mb-4 flex items-center justify-center">
                      <Store className="w-10 h-10 text-gray-500" />
                    </div>
                  )}
                  <h1 className="text-3xl font-bold mb-2">{config.name || merchantName || 'Your Store'}</h1>
                  <p className={`text-lg mb-2 ${config.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {config.description}
                  </p>
                  {config.tagline && (
                    <p className={`text-sm ${config.theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                      {config.tagline}
                    </p>
                  )}
                </div>

                {/* Products Section */}
                <div className="p-8">
                  <h2 className="text-2xl font-bold mb-6">Products</h2>
                  {config.selectedProducts.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-gray-700 rounded-lg">
                      <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                      <p className={config.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                        No products selected yet
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        Go to Products tab to add items
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {availableProducts
                        .filter(p => config.selectedProducts.includes(p.product_id))
                        .map((product) => (
                          <div
                            key={product.product_id}
                            className={`rounded-xl overflow-hidden border ${
                              config.theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                            }`}
                          >
                            <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                              <ShoppingBag className="w-16 h-16 text-white opacity-50" />
                            </div>
                            <div className="p-6">
                              <div className="flex items-start justify-between mb-2">
                                <h3 className="text-xl font-bold">{product.item_name}</h3>
                                <span
                                  className="px-3 py-1 rounded-full text-sm font-semibold text-white"
                                  style={{ backgroundColor: config.primaryColor }}
                                >
                                  ${Number(product.price).toFixed(2)}
                                </span>
                              </div>
                              <p className={`text-sm mb-4 ${config.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                {product.description || 'No description'}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className={`p-8 border-t ${config.theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">
                      Powered by <span className="font-semibold text-blue-600">OkuruPay</span>
                    </p>
                    {config.contact_email && (
                      <p className="text-sm mt-2">
                        Contact: {config.contact_email}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorefrontBuilder;
