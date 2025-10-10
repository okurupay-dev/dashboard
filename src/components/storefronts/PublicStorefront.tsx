import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Globe, 
  Mail, 
  ExternalLink,
  ShoppingCart,
  Check,
  X
} from 'lucide-react';

interface Product {
  product_id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  features?: string[];
  is_active: boolean;
}

interface Storefront {
  storefront_id: string;
  merchant_id: string;
  name: string;
  slug: string;
  description?: string;
  tagline?: string;
  theme: 'light' | 'dark';
  logo_url?: string;
  banner_url?: string;
  primary_color: string;
  contact_email?: string;
  contact_link?: string;
  social_links?: {
    instagram?: string;
    twitter?: string;
    tiktok?: string;
    website?: string;
  };
  refund_policy?: string;
  terms?: string;
  products: Product[];
}

const PublicStorefront: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [storefront, setStorefront] = useState<Storefront | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showContactDropdown, setShowContactDropdown] = useState(false);

  useEffect(() => {
    loadStorefront();
  }, [slug]);

  const loadStorefront = async () => {
    try {
      setLoading(true);
      
      // Fetch storefront data from backend API
      const response = await fetch(`https://okurutest.up.railway.app/storefronts/public/${slug}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setNotFound(true);
          return;
        }
        throw new Error('Failed to load storefront');
      }
      
      const response_data = await response.json();
      
      // Backend wraps response in { success: true, data: {...} }
      const data = response_data.data || response_data;
      
      setStorefront(data);
    } catch (error) {
      console.error('Error loading storefront:', error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyNow = async (product: Product) => {
    try {
      // Call checkout API
      const response = await fetch(`https://okurutest.up.railway.app/storefronts/public/${slug}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: product.product_id,
          quantity: 1,
          customer_email: '', // Can add email input later
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout');
      }

      const data = await response.json();
      
      // Redirect to payment page or show payment details
      if (data.payment_url) {
        window.location.href = data.payment_url;
      } else {
        // Show payment details modal
        alert(`Order created! Payment details:\nAmount: $${product.price}\nOrder ID: ${data.order_id}`);
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      alert('Failed to create checkout. Please try again.');
    }
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleCloseProductDetail = () => {
    setSelectedProduct(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 animate-pulse">
        {/* Header Skeleton */}
        <div className="pt-16 pb-12 px-6">
          <div className="max-w-4xl mx-auto text-center">
            {/* Logo Skeleton */}
            <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gray-800 animate-pulse"></div>
            
            {/* Title Skeleton */}
            <div className="h-10 w-48 mx-auto mb-3 bg-gray-800 rounded-lg"></div>
            
            {/* Description Skeleton */}
            <div className="h-6 w-64 mx-auto mb-6 bg-gray-800 rounded-lg"></div>
            
            {/* Button Skeleton */}
            <div className="h-10 w-40 mx-auto bg-gray-800 rounded-lg"></div>
          </div>
        </div>

        {/* Products Section Skeleton */}
        <div className="px-6 pb-16">
          <div className="max-w-4xl mx-auto">
            {/* Products Title Skeleton */}
            <div className="h-8 w-32 mb-8 bg-gray-800 rounded-lg"></div>
            
            {/* Product Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="rounded-2xl overflow-hidden border border-gray-800 bg-gray-800/50">
                  {/* Image Skeleton */}
                  <div className="h-64 bg-gradient-to-br from-gray-700 to-gray-800 animate-pulse"></div>
                  
                  {/* Content Skeleton */}
                  <div className="p-5 space-y-3">
                    <div className="h-6 w-3/4 bg-gray-700 rounded"></div>
                    <div className="h-4 w-full bg-gray-700 rounded"></div>
                    <div className="h-4 w-2/3 bg-gray-700 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Loading Spinner Overlay */}
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="text-gray-400 text-sm mt-4 text-center">Loading storefront...</p>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !storefront) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">404</h1>
          <p className="text-gray-400">Storefront not found</p>
        </div>
      </div>
    );
  }

  const isDark = storefront.theme === 'dark';
  const bgClass = isDark ? 'bg-gray-900' : 'bg-gray-50';
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const subtextClass = isDark ? 'text-gray-400' : 'text-gray-600';
  const cardBgClass = isDark ? 'bg-gray-800' : 'bg-white';
  const borderClass = isDark ? 'border-gray-700' : 'border-gray-200';

  return (
    <div className={`min-h-screen ${bgClass}`}>
      {/* Header - Whop Style */}
      <div className="pt-16 pb-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo */}
          {storefront.logo_url ? (
            <div className="w-24 h-24 mx-auto mb-6 rounded-3xl overflow-hidden bg-gray-800 border border-gray-700">
              <img 
                src={storefront.logo_url} 
                alt={storefront.name} 
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gray-800 border border-gray-700 flex items-center justify-center">
              <Globe className="w-12 h-12 text-gray-500" />
            </div>
          )}
          
          {/* Store Name */}
          <h1 className={`text-4xl font-bold mb-3 ${textClass}`}>
            {storefront.name}
          </h1>
          
          {/* Description */}
          {storefront.description && (
            <p className={`text-base mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {storefront.description}
            </p>
          )}
          
          
          {/* Social Links */}
          <div className="flex items-center justify-center gap-4 mb-6">
            {storefront.social_links?.instagram && (
              <a href={storefront.social_links.instagram} target="_blank" rel="noopener noreferrer" 
                 className={`${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z"/>
                </svg>
              </a>
            )}
            {storefront.social_links?.twitter && (
              <a href={storefront.social_links.twitter} target="_blank" rel="noopener noreferrer"
                 className={`${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
                </svg>
              </a>
            )}
          </div>
          
          {/* Contact Seller Dropdown */}
          {storefront.contact_email && (
            <div className="relative">
              <button
                onClick={() => setShowContactDropdown(!showContactDropdown)}
                className={`inline-flex items-center gap-2 px-6 py-2.5 ${isDark ? 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-200' : 'bg-white hover:bg-gray-50 border-gray-300 text-gray-900'} border rounded-lg transition-colors text-sm font-medium`}
              >
                <Mail className="w-4 h-4" />
                Contact seller
              </button>
              
              {showContactDropdown && (
                <div className={`absolute top-full mt-2 left-1/2 -translate-x-1/2 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg shadow-xl p-2 min-w-[200px] z-10`}>
                  <a
                    href={`mailto:${storefront.contact_email}`}
                    className={`flex items-center gap-3 px-4 py-2.5 ${isDark ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-50 text-gray-900'} rounded-lg transition-colors`}
                  >
                    <Mail className="w-4 h-4" />
                    <span className="text-sm">Email</span>
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Products Section - Whop Style */}
      <div className="px-6 pb-16">
        <div className="max-w-4xl mx-auto">
          <h2 className={`text-2xl font-bold mb-8 text-center ${textClass}`}>Products</h2>
          
          {!storefront.products || storefront.products.length === 0 ? (
            <div className={`text-center py-16 border-2 border-dashed ${isDark ? 'border-gray-800' : 'border-gray-300'} rounded-2xl`}>
              <ShoppingCart className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-gray-700' : 'text-gray-400'}`} />
              <p className={isDark ? 'text-gray-500' : 'text-gray-600'}>
                No products available yet
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {storefront.products.filter(p => p.is_active).map((product) => (
                <div
                  key={product.product_id}
                  onClick={() => handleProductClick(product)}
                  className={`group rounded-2xl overflow-hidden border cursor-pointer transition-all hover:scale-[1.02] ${
                    isDark ? 'border-gray-800 bg-gray-800/50' : 'border-gray-200 bg-white'
                  }`}
                >
                  {/* Product Image with Gradient */}
                  <div className="relative h-64 bg-gradient-to-br from-red-500 via-pink-500 to-orange-500 flex items-center justify-center overflow-hidden">
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-white text-6xl font-bold opacity-20">
                        {product.name.substring(0, 3).toUpperCase()}
                      </div>
                    )}
                    
                    {/* Price Badge */}
                    <div className="absolute bottom-4 right-4">
                      <div className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-sm font-semibold shadow-lg">
                        {product.price === 0 ? 'Free' : `$${Number(product.price).toFixed(2)}/month`}
                      </div>
                    </div>
                  </div>
                  
                  {/* Product Info */}
                  <div className="p-5">
                    <h3 className={`text-lg font-bold mb-2 ${textClass}`}>
                      {product.name}
                    </h3>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} line-clamp-2`}>
                      {product.description || 'No description'}
                    </p>
                    
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Footer Badge */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="flex justify-center">
          <img 
            src="/poweredby.png" 
            alt="Powered by OkuruPay" 
            className="h-8 opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
            onClick={() => window.open('https://okurupay.com', '_blank')}
          />
        </div>
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className={`${cardBgClass} rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto`}>
            {/* Close Button */}
            <div className="sticky top-0 right-0 flex justify-end p-4">
              <button
                onClick={handleCloseProductDetail}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors`}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Product Image */}
            <div className="px-8 pb-6">
              <div className="relative h-80 rounded-xl overflow-hidden mb-6">
                {selectedProduct.image_url ? (
                  <img 
                    src={selectedProduct.image_url} 
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <ShoppingCart className="w-24 h-24 text-white opacity-50" />
                  </div>
                )}
              </div>
              
              {/* Product Details */}
              <h2 className={`text-3xl font-bold ${textClass} mb-4`}>
                {selectedProduct.name}
              </h2>
              
              <p className={`${subtextClass} text-lg mb-6`}>
                {selectedProduct.description}
              </p>
              
              {/* Features */}
              {selectedProduct.features && selectedProduct.features.length > 0 && (
                <div className="mb-6">
                  <h3 className={`text-lg font-semibold ${textClass} mb-3`}>What's included:</h3>
                  <ul className="space-y-2">
                    {selectedProduct.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className={subtextClass}>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Price & Buy Button */}
              <div className="flex items-center justify-between pt-6 border-t border-gray-700">
                <div>
                  <div className={`text-3xl font-bold ${textClass}`}>
                    {selectedProduct.price === 0 ? 'Free' : `$${selectedProduct.price.toFixed(2)}`}
                  </div>
                  {selectedProduct.price > 0 && (
                    <div className={`text-sm ${subtextClass}`}>per month</div>
                  )}
                </div>
                <button
                  onClick={() => handleBuyNow(selectedProduct)}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Buy Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicStorefront;
