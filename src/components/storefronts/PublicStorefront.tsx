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

  useEffect(() => {
    loadStorefront();
  }, [slug]);

  const loadStorefront = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/storefronts/public/${slug}`);
      // const data = await response.json();
      
      // Mock data for now
      const mockStorefront: Storefront = {
        storefront_id: '1',
        merchant_id: '1',
        name: 'Forex Knowledge Base',
        slug: 'forex-knowledge-base',
        description: 'Dubai-based Global Forex Trading Community.',
        tagline: 'Master the markets with expert guidance',
        theme: 'dark',
        logo_url: 'https://via.placeholder.com/80',
        primary_color: '#3B82F6',
        contact_email: 'support@fkb.com',
        social_links: {
          instagram: 'https://instagram.com/fkb',
          twitter: 'https://twitter.com/fkb',
          tiktok: 'https://tiktok.com/@fkb',
          website: 'https://fkb.com'
        },
        refund_policy: 'Full refund within 7 days if not satisfied.',
        terms: 'By purchasing, you agree to our terms of service.',
        products: [
          {
            product_id: '1',
            name: 'Forex Knowledge Base Free',
            description: 'FKB Free - Access to basic trading resources and community',
            price: 0,
            image_url: 'https://via.placeholder.com/400x300/ef4444/ffffff?text=FKB+Free',
            features: ['Basic Knowledge', 'Community Access', 'Weekly Updates'],
            is_active: true
          },
          {
            product_id: '2',
            name: 'Forex Knowledge Base Premium',
            description: 'FKB Premium - Full access to all trading strategies and signals',
            price: 149.00,
            image_url: 'https://via.placeholder.com/400x300/10b981/ffffff?text=FKB+Premium',
            features: ['Full Knowledge Base', 'Live Trading Signals', 'Priority Support', '1-on-1 Mentorship'],
            is_active: true
          }
        ]
      };
      
      setStorefront(mockStorefront);
    } catch (error) {
      console.error('Error loading storefront:', error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyNow = (product: Product) => {
    // Navigate to checkout page
    navigate(`/s/${slug}/checkout/${product.product_id}`);
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleCloseProductDetail = () => {
    setSelectedProduct(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white">Loading storefront...</div>
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
      {/* Header */}
      <header className={`${cardBgClass} border-b ${borderClass}`}>
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col items-center text-center">
            {/* Logo */}
            {storefront.logo_url && (
              <div className="w-20 h-20 rounded-2xl overflow-hidden mb-4 bg-gray-700">
                <img src={storefront.logo_url} alt={storefront.name} className="w-full h-full object-cover" />
              </div>
            )}
            
            {/* Store Name */}
            <h1 className={`text-3xl font-bold ${textClass} mb-2`}>
              {storefront.name}
            </h1>
            
            {/* Description */}
            {storefront.description && (
              <p className={`${subtextClass} text-lg mb-4`}>
                {storefront.description}
              </p>
            )}
            
            {/* Social Links */}
            <div className="flex items-center gap-4">
              {storefront.social_links?.instagram && (
                <a href={storefront.social_links.instagram} target="_blank" rel="noopener noreferrer" 
                   className={`${subtextClass} hover:text-blue-500 transition-colors`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z"/>
                  </svg>
                </a>
              )}
              {storefront.social_links?.website && (
                <a href={storefront.social_links.website} target="_blank" rel="noopener noreferrer"
                   className={`${subtextClass} hover:text-blue-500 transition-colors`}>
                  <Globe className="w-5 h-5" />
                </a>
              )}
            </div>
            
            {/* Contact Seller Button */}
            {storefront.contact_email && (
              <button
                onClick={() => window.location.href = `mailto:${storefront.contact_email}`}
                className={`mt-6 flex items-center gap-2 px-4 py-2 ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} rounded-lg transition-colors`}
              >
                <Mail className="w-4 h-4" />
                <span className="text-sm">Contact seller</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Products Section */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        <h2 className={`text-2xl font-bold ${textClass} mb-8`}>Products</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {storefront.products.filter(p => p.is_active).map((product) => (
            <div
              key={product.product_id}
              onClick={() => handleProductClick(product)}
              className={`${cardBgClass} rounded-xl overflow-hidden border ${borderClass} hover:shadow-xl transition-all cursor-pointer group`}
            >
              {/* Product Image */}
              <div className="relative h-64 overflow-hidden">
                {product.image_url ? (
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <ShoppingCart className="w-16 h-16 text-white opacity-50" />
                  </div>
                )}
                
                {/* Price Badge */}
                <div className="absolute top-4 right-4">
                  <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    {product.price === 0 ? 'Free' : `$${product.price.toFixed(2)}/month`}
                  </div>
                </div>
              </div>
              
              {/* Product Info */}
              <div className="p-6">
                <h3 className={`text-xl font-bold ${textClass} mb-2`}>
                  {product.name}
                </h3>
                <p className={`${subtextClass} text-sm mb-4`}>
                  {product.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className={`${cardBgClass} border-t ${borderClass} mt-20`}>
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className={`text-sm ${subtextClass}`}>
              Powered by <span className="font-semibold text-blue-600">OkuruPay</span>
            </div>
            <div className="flex gap-6">
              {storefront.refund_policy && (
                <button className={`text-sm ${subtextClass} hover:text-blue-500`}>
                  Refund Policy
                </button>
              )}
              {storefront.terms && (
                <button className={`text-sm ${subtextClass} hover:text-blue-500`}>
                  Terms
                </button>
              )}
              {storefront.contact_email && (
                <button className={`text-sm ${subtextClass} hover:text-blue-500`}>
                  Contact
                </button>
              )}
            </div>
          </div>
        </div>
      </footer>

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
