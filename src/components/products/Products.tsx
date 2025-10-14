import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Package, 
  Upload, 
  Download, 
  Search, 
  Plus, 
  Filter, 
  Edit, 
  Trash2, 
  ExternalLink,
  FileText,
  Zap,
  AlertCircle,
  CheckCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface Product {
  product_id: string;
  merchant_id: string;
  item_name: string;
  variation_name?: string;
  name?: string; // Keep for backward compatibility
  description?: string;
  sku: string;
  price: number;
  cost?: number;
  category?: string;
  barcode?: string;
  weight?: number;
  tax_name?: string;
  tax_rate?: number;
  stock_quantity?: number;
  low_stock_threshold?: number;
  image_url?: string;
  image_urls?: string[]; // Support multiple images
  is_active: boolean;
  is_taxable?: boolean;
  track_inventory?: boolean;
  allow_backorders?: boolean;
  is_variation?: boolean;
  import_source?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

interface POSIntegration {
  id: string;
  name: string;
  type: 'square' | 'shopify' | 'clover' | 'toast' | 'lightspeed' | 'other';
  status: 'connected' | 'disconnected' | 'syncing' | 'error';
  last_sync?: string;
  product_count?: number;
}

const Products: React.FC = () => {
  const { userData, merchantData } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [newProduct, setNewProduct] = useState({
    item_name: '',
    variation_name: '',
    description: '',
    sku: '',
    price: '',
    cost: '',
    category: '',
    barcode: '',
    weight: '',
    tax_name: '',
    tax_rate: '',
    image_url: '',
    image_urls: [] as string[],
    features: '',
    stock_quantity: '',
    is_active: true,
    is_taxable: true,
    track_inventory: true,
    allow_backorders: false
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Mock POS integrations data
  const [posIntegrations] = useState<POSIntegration[]>([
    {
      id: '1',
      name: 'Square POS',
      type: 'square',
      status: 'disconnected',
      product_count: 0
    },
    {
      id: '2',
      name: 'Shopify',
      type: 'shopify',
      status: 'disconnected',
      product_count: 0
    },
    {
      id: '3',
      name: 'Clover',
      type: 'clover',
      status: 'disconnected',
      product_count: 0
    },
    {
      id: '4',
      name: 'Toast POS',
      type: 'toast',
      status: 'disconnected',
      product_count: 0
    }
  ]);

  // Load products from database
  useEffect(() => {
    loadProducts();
  }, [userData]);

  const loadProducts = async () => {
    if (!userData?.merchant_id) return;

    try {
      setLoading(true);
      setError(null);

      // Try to load from database first
      const { data: dbProducts, error: dbError } = await supabase
        .from('products')
        .select('*')
        .eq('merchant_id', userData.merchant_id)
        .order('created_at', { ascending: false });

      if (dbError) {
        console.error('Products table error:', dbError);
        setError('Failed to load products from database');
        setProducts([]);
      } else {
        console.log(`✅ Loaded ${dbProducts?.length || 0} products from database`);
        setProducts(dbProducts || []);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      setError('Failed to load products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle image upload to Supabase Storage (supports up to 3 images)
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userData?.merchant_id) return;

    // Check if already at max images
    if (newProduct.image_urls.length >= 3) {
      alert('Maximum 3 images allowed');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    try {
      setUploadingImage(true);

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userData.merchant_id}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        alert('Failed to upload image. Please try again.');
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      // Add to image_urls array and set first image as primary
      setNewProduct(prev => ({
        ...prev,
        image_urls: [...prev.image_urls, publicUrl],
        image_url: prev.image_urls.length === 0 ? publicUrl : prev.image_url // Set first image as primary
      }));
      console.log('✅ Image uploaded successfully:', publicUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  // Remove image from array
  const handleRemoveImage = (indexToRemove: number) => {
    setNewProduct(prev => {
      const newImageUrls = prev.image_urls.filter((_, index) => index !== indexToRemove);
      return {
        ...prev,
        image_urls: newImageUrls,
        image_url: newImageUrls[0] || '' // Update primary image
      };
    });
  };

  // Handle edit product
  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setNewProduct({
      item_name: product.item_name || product.name || '',
      variation_name: product.variation_name || '',
      description: product.description || '',
      sku: product.sku,
      price: product.price.toString(),
      cost: product.cost?.toString() || '',
      category: product.category || '',
      barcode: product.barcode || '',
      weight: product.weight?.toString() || '',
      tax_name: product.tax_name || '',
      tax_rate: product.tax_rate?.toString() || '',
      image_url: product.image_url || '',
      image_urls: product.image_urls || [],
      features: product.metadata?.features?.join('\n') || '',
      stock_quantity: product.stock_quantity?.toString() || '',
      is_active: product.is_active,
      is_taxable: product.is_taxable || false,
      track_inventory: product.track_inventory || false,
      allow_backorders: product.allow_backorders || false
    });
    setShowEditModal(true);
  };

  // Handle update product
  const handleUpdateProduct = async () => {
    if (!userData?.merchant_id || !editingProduct) return;
    
    try {
      // Validate required fields
      if (!newProduct.item_name || !newProduct.price) {
        alert('Please fill in all required fields: Item Name and Price');
        return;
      }

      // Convert features string to array
      const featuresArray = newProduct.features
        ? newProduct.features.split('\n').filter(f => f.trim())
        : undefined;

      const productToUpdate = {
        item_name: newProduct.item_name,
        variation_name: newProduct.variation_name || null,
        sku: newProduct.sku,
        description: newProduct.description || null,
        category: newProduct.category || null,
        price: parseFloat(newProduct.price) || 0,
        cost: newProduct.cost ? parseFloat(newProduct.cost) : null,
        barcode: newProduct.barcode || null,
        weight: newProduct.weight ? parseFloat(newProduct.weight) : null,
        tax_name: newProduct.tax_name || null,
        tax_rate: newProduct.tax_rate ? parseFloat(newProduct.tax_rate) : 0,
        image_url: newProduct.image_url || null,
        image_urls: newProduct.image_urls.length > 0 ? newProduct.image_urls : null,
        stock_quantity: newProduct.stock_quantity ? parseInt(newProduct.stock_quantity) : null,
        is_active: newProduct.is_active,
        is_taxable: newProduct.is_taxable,
        track_inventory: newProduct.track_inventory,
        allow_backorders: newProduct.allow_backorders,
        is_variation: !!newProduct.variation_name,
        metadata: featuresArray ? { features: featuresArray } : null,
        updated_at: new Date().toISOString()
      };

      console.log('📝 Updating product:', productToUpdate);

      // Update in database
      const { data, error } = await supabase
        .from('products')
        .update(productToUpdate)
        .eq('product_id', editingProduct.product_id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating product:', error);
        alert(`Failed to update product: ${error.message}`);
        return;
      }

      console.log('✅ Product updated:', data);

      // Update local state
      setProducts(prev => prev.map(p => 
        p.product_id === editingProduct.product_id ? data : p
      ));
      
      // Reset form and close modal
      setNewProduct({
        item_name: '',
        variation_name: '',
        description: '',
        sku: '',
        price: '',
        cost: '',
        category: '',
        barcode: '',
        weight: '',
        tax_name: '',
        tax_rate: '',
        image_url: '',
        image_urls: [] as string[],
        features: '',
        stock_quantity: '',
        is_active: true,
        is_taxable: true,
        track_inventory: true,
        allow_backorders: false
      });
      setShowEditModal(false);
      setEditingProduct(null);
      setShowOptionalFields(false);
      
      console.log('✅ Product updated successfully');
    } catch (error) {
      console.error('❌ Error updating product:', error);
      alert('Failed to update product. Please try again.');
    }
  };

  // Handle CSV file upload
  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
    } else {
      alert('Please select a valid CSV file');
    }
  };

  // Process CSV import
  const handleAddProduct = async () => {
    if (!userData?.merchant_id) return;
    
    try {
      // Validate required fields
      if (!newProduct.item_name || !newProduct.price) {
        alert('Please fill in all required fields: Item Name and Price');
        return;
      }

      // Auto-generate SKU if not provided (useful for services)
      const finalSku = newProduct.sku || `SKU-${Date.now()}`;

      // Convert features string to array (split by newlines)
      const featuresArray = newProduct.features
        ? newProduct.features.split('\n').filter(f => f.trim())
        : undefined;

      const productToAdd = {
        merchant_id: userData.merchant_id,
        item_name: newProduct.item_name,
        variation_name: newProduct.variation_name || null,
        sku: finalSku,
        description: newProduct.description || null,
        category: newProduct.category || null,
        price: parseFloat(newProduct.price) || 0,
        cost: newProduct.cost ? parseFloat(newProduct.cost) : null,
        barcode: newProduct.barcode || null,
        weight: newProduct.weight ? parseFloat(newProduct.weight) : null,
        tax_name: newProduct.tax_name || null,
        tax_rate: newProduct.tax_rate ? parseFloat(newProduct.tax_rate) : 0,
        image_url: newProduct.image_url || null,
        image_urls: newProduct.image_urls.length > 0 ? newProduct.image_urls : null,
        is_active: newProduct.is_active,
        is_taxable: newProduct.is_taxable,
        track_inventory: newProduct.track_inventory,
        allow_backorders: newProduct.allow_backorders,
        is_variation: !!newProduct.variation_name,
        import_source: 'manual',
        metadata: featuresArray ? { features: featuresArray } : null
        // created_by removed - foreign key constraint issue
      };

      console.log('📦 Product data being sent to database:', productToAdd);
      console.log('📝 Description value:', newProduct.description);

      // Save to database
      const { data, error } = await supabase
        .from('products')
        .insert([productToAdd])
        .select()
        .single();

      if (error) {
        console.error('❌ Error saving product:', error);
        alert(`Failed to save product: ${error.message}`);
        return;
      }

      console.log('✅ Product saved to database:', data);

      // Add to local state for immediate UI update
      setProducts(prev => [data, ...prev]);
      
      // Reset form and close modal
      setNewProduct({
        item_name: '',
        variation_name: '',
        description: '',
        sku: '',
        price: '',
        cost: '',
        category: '',
        barcode: '',
        weight: '',
        tax_name: '',
        tax_rate: '',
        image_url: '',
        image_urls: [] as string[],
        features: '',
        stock_quantity: '',
        is_active: true,
        is_taxable: true,
        track_inventory: true,
        allow_backorders: false
      });
      setShowAddModal(false);
      setShowOptionalFields(false);
      
      console.log('✅ Product added successfully');
    } catch (error) {
      console.error('❌ Error adding product:', error);
      alert('Failed to add product. Please try again.');
    }
  };

  const handleImportCsv = async () => {
    if (!csvFile || !userData?.merchant_id) return;

    try {
      setImporting(true);
      
      // Read CSV file
      const text = await csvFile.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      // Square CSV format requirements
      const requiredHeaders = ['item name', 'variation name', 'description', 'sku'];
      const hasRequiredHeaders = requiredHeaders.every(header => 
        headers.some(h => h.toLowerCase().includes(header.toLowerCase()))
      );

      if (!hasRequiredHeaders) {
        alert('CSV must contain Square format columns: Item Name, Variation Name, Description, SKU');
        return;
      }

      const validateCSV = (data: any[]) => {
        // Square CSV format requirements
        const requiredColumns = [
          'item name',
          'variation name', 
          'description',
          'sku'
        ];
        const errors: string[] = [];
        
        if (data.length === 0) {
          errors.push('CSV file is empty');
          return { isValid: false, errors };
        }
        
        const headers = Object.keys(data[0]).map(h => h.toLowerCase());
        const missingColumns = requiredColumns.filter(col => 
          !headers.some(header => header.includes(col.toLowerCase()))
        );
        
        if (missingColumns.length > 0) {
          errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
        }
        
        // Check for tax column format (e.g., "Tax - Sales (7%)")
        const hasTaxColumn = headers.some(header => 
          header.includes('tax') && header.includes('(') && header.includes('%')
        );
        
        if (!hasTaxColumn) {
          errors.push('Tax column must include percentage in header format: "Tax - Sales (7%)"');
        }
        
        // Check for location-enabled columns if multiple locations
        const locationColumns = headers.filter(header => 
          header.includes('enabled') && header.includes('location')
        );
        
        // Validate each row
        data.forEach((row, index) => {
          const rowNum = index + 2; // +2 for header row and 1-based indexing
          
          if (!row['item name'] && !row['Item Name']) {
            errors.push(`Row ${rowNum}: Item Name is required`);
          }
          
          if (!row['sku'] && !row['SKU']) {
            errors.push(`Row ${rowNum}: SKU is required`);
          }
          
          // Check for price if not a variation
          const hasPrice = row['price'] || row['Price'] || row['Base Price'];
          if (!hasPrice && (!row['variation name'] && !row['Variation Name'])) {
            errors.push(`Row ${rowNum}: Price is required for main items`);
          }
        });
        
        return { isValid: errors.length === 0, errors };
      };

      const data = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header] = values[index];
        });
        return obj;
      });

      const { isValid, errors } = validateCSV(data);

      if (!isValid) {
        alert(`Invalid CSV format: ${errors.join('\n')}`);
        return;
      }

      // Parse products from Square CSV format
      const newProducts: Partial<Product>[] = [];
      
      data.forEach((row, index) => {
        if (Object.values(row).some(val => val && val.toString().trim())) {
          // Extract tax rate from tax column header (e.g., "Tax - Sales (7%)" -> 7)
          const taxHeader = Object.keys(row).find(key => 
            key.toLowerCase().includes('tax') && key.includes('(') && key.includes('%')
          );
          const taxRate = taxHeader ? 
            parseFloat(taxHeader.match(/\((\d+(?:\.\d+)?)\%\)/)?.[1] || '0') : 0;

          const product: Product = {
            product_id: `csv-${Date.now()}-${index}`,
            merchant_id: userData.merchant_id,
            item_name: row['Item Name'] || row['item name'] || '',
            name: row['Item Name'] || row['item name'] || '', // For backward compatibility
            variation_name: row['Variation Name'] || row['variation name'] || undefined,
            description: row['Description'] || row['description'] || '',
            sku: row['SKU'] || row['sku'] || `SKU-${Date.now()}-${index}`,
            price: parseFloat(row['Price'] || row['price'] || row['Base Price'] || '0'),
            cost: parseFloat(row['Cost'] || row['cost'] || '0'),
            category: row['Category'] || row['category'] || 'Uncategorized',
            barcode: row['Barcode'] || row['barcode'] || '',
            tax_name: taxHeader || 'Default Tax',
            tax_rate: taxRate,
            stock_quantity: 0,
            low_stock_threshold: 5,
            is_variation: !!(row['Variation Name'] || row['variation name']),
            is_active: true,
            is_taxable: true,
            track_inventory: true,
            allow_backorders: false,
            import_source: 'csv',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          // Handle location-based inventory if enabled columns exist
          const locationEnabledColumns = Object.keys(row).filter(key => 
            key.toLowerCase().includes('enabled') && key.toLowerCase().includes('location')
          );
          
          if (locationEnabledColumns.length > 0) {
            product.metadata = {
              ...product.metadata,
              location_inventory: locationEnabledColumns.reduce((acc, col) => {
                const locationName = col.match(/enabled\s+(.+)/i)?.[1] || 'Unknown Location';
                acc[locationName] = row[col] === 'Y' || row[col] === 'Yes' || row[col] === 'true';
                return acc;
              }, {} as Record<string, boolean>)
            };
          }
          
          newProducts.push(product);
        }
      });

      console.log(`📦 Importing ${newProducts.length} products from CSV`);
      
      // For now, just add to local state (in production, would save to database)
      const productsWithIds = newProducts.map((product, index) => ({
        ...product,
        product_id: `csv-${Date.now()}-${index}`,
      })) as Product[];

      setProducts(prev => [...productsWithIds, ...prev]);
      
      alert(`Successfully imported ${newProducts.length} products from CSV!`);
      setShowImportModal(false);
      setCsvFile(null);
      
    } catch (error) {
      console.error('Error importing CSV:', error);
      alert('Failed to import CSV. Please check the file format.');
    } finally {
      setImporting(false);
    }
  };

  // Filter products
  const filteredProducts = products.filter(product => {
    const displayName = product.item_name || product.name || '';
    const matchesSearch = displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.category?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  // Get status badge for POS integration
  const getStatusBadge = (status: POSIntegration['status']) => {
    const variants = {
      connected: 'bg-green-100 text-green-800',
      disconnected: 'bg-gray-100 text-gray-800',
      syncing: 'bg-blue-100 text-blue-800',
      error: 'bg-red-100 text-red-800'
    };
    
    return (
      <Badge className={variants[status]}>
        {status === 'syncing' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600">Manage your inventory and sync with POS systems</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <select
              onChange={(e) => {
                const value = e.target.value;
                if (value === 'csv') {
                  setShowImportModal(true);
                } else if (value.startsWith('pos-')) {
                  const posType = value.replace('pos-', '');
                  alert(`${posType.charAt(0).toUpperCase() + posType.slice(1)} integration coming soon!`);
                }
                e.target.value = ''; // Reset selection
              }}
              className="appearance-none bg-white border border-gray-300 rounded-md px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-gray-50"
            >
              <option value="">Import Products</option>
              <option value="csv">Upload CSV File</option>
              <option disabled>──────────────</option>
              <option value="pos-square">Square POS</option>
              <option value="pos-shopify">Shopify</option>
              <option value="pos-clover">Clover</option>
              <option value="pos-toast">Toast POS</option>
              <option value="pos-lightspeed">Lightspeed</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <Upload className="h-4 w-4 text-gray-400" />
            </div>
          </div>
          <Button 
            onClick={() => {
              console.log('🔥 Add Product button clicked');
              setShowAddModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>


      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Products ({filteredProducts.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || selectedCategory !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Add your first product to get started'
                }
              </p>
              {!searchTerm && selectedCategory === 'all' && (
                <Button onClick={() => {
                  console.log('🔥 Add Product button (empty state) clicked');
                  setShowAddModal(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedProducts.map((product) => (
                    <tr key={product.product_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {product.image_url && (
                            <img 
                              src={product.image_url} 
                              alt={product.item_name || product.name || ''}
                              className="w-10 h-10 rounded-lg object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {product.item_name || product.name}
                            </div>
                            {product.description && (
                              <div className="text-sm text-gray-500 truncate max-w-xs">
                                {product.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.sku}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="secondary">
                          {product.category || 'Uncategorized'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${product.price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-sm text-gray-900 mr-2">
                            {product.stock_quantity !== null && product.stock_quantity !== undefined ? product.stock_quantity : 'N/A'}
                          </span>
                          {product.low_stock_threshold && 
                           (product.stock_quantity || 0) <= product.low_stock_threshold && (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={product.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                        }>
                          {product.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEditProduct(product)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 hover:text-red-800">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 py-2 text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Import Products</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowImportModal(false);
                  setCsvFile(null);
                }}
              >
                ×
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  CSV should include: name, sku, price, cost, category, stock_quantity, description
                </p>
              </div>

              {csvFile && (
                <div className="bg-green-50 p-3 rounded-md">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-green-700">
                      {csvFile.name} ready to import
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowImportModal(false);
                    setCsvFile(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleImportCsv}
                  disabled={!csvFile || importing}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {importing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Import
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Add New Product</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddModal(false);
                  setShowOptionalFields(false);
                  setNewProduct({
                    item_name: '',
                    variation_name: '',
                    description: '',
                    sku: '',
                    price: '',
                    cost: '',
                    category: '',
                    barcode: '',
                    weight: '',
                    tax_name: '',
                    tax_rate: '',
                    image_url: '',
                    image_urls: [] as string[],
                    features: '',
                    stock_quantity: '',
                    is_active: true,
                    is_taxable: true,
                    track_inventory: true,
                    allow_backorders: false
                  });
                }}
              >
                ×
              </Button>
            </div>

            <div className="space-y-4">
              {/* Required Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Item Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newProduct.item_name}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, item_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter product name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SKU
                  </label>
                  <input
                    type="text"
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, sku: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Auto-generated if empty"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty for services - will auto-generate
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, price: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={newProduct.category}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select category</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newProduct.description}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Enter product description"
                />
              </div>

              {/* Optional Fields Toggle */}
              <div className="border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowOptionalFields(!showOptionalFields)}
                  className="w-full flex items-center justify-center"
                >
                  {showOptionalFields ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-2" />
                      Hide Optional Fields
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      Show Optional Fields
                    </>
                  )}
                </Button>
              </div>

              {/* Optional Fields */}
              {showOptionalFields && (
                <div className="space-y-4 border-t pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Variation Name
                      </label>
                      <input
                        type="text"
                        value={newProduct.variation_name}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, variation_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Size Large, Color Red"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cost
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={newProduct.cost}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, cost: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Barcode
                      </label>
                      <input
                        type="text"
                        value={newProduct.barcode}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, barcode: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter barcode"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Weight (lbs)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={newProduct.weight}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, weight: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tax Name
                      </label>
                      <input
                        type="text"
                        value={newProduct.tax_name}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, tax_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Sales Tax"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tax Rate (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={newProduct.tax_rate}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, tax_rate: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Stock Quantity
                      </label>
                      <input
                        type="number"
                        value={newProduct.stock_quantity}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, stock_quantity: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product Images (Up to 3)
                    </label>
                    
                    {/* Image Preview Grid */}
                    {newProduct.image_urls.length > 0 && (
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        {newProduct.image_urls.map((url, index) => (
                          <div key={index} className="relative group">
                            <img 
                              src={url} 
                              alt={`Product ${index + 1}`} 
                              className="w-full h-24 object-cover rounded-lg border-2 border-gray-200"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(index)}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                            {index === 0 && (
                              <span className="absolute bottom-1 left-1 bg-blue-500 text-white text-xs px-2 py-0.5 rounded">
                                Primary
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Upload Button */}
                    {newProduct.image_urls.length < 3 && (
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={uploadingImage}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {uploadingImage ? 'Uploading...' : `${newProduct.image_urls.length}/3 images. Max 5MB each. JPG, PNG, or WebP`}
                        </p>
                      </div>
                    )}
                    
                    {newProduct.image_urls.length >= 3 && (
                      <p className="text-xs text-gray-600 bg-gray-100 p-2 rounded">
                        Maximum 3 images reached. Remove an image to add a new one.
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Features (for storefront)
                    </label>
                    <textarea
                      value={newProduct.features}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, features: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={4}
                      placeholder="Enter features, one per line:&#10;✓ Feature 1&#10;✓ Feature 2&#10;✓ Feature 3"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Add one feature per line. These will appear as bullet points on your storefront.
                    </p>
                  </div>

                  {/* Checkboxes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={newProduct.is_active}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, is_active: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                        Active Product
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="is_taxable"
                        checked={newProduct.is_taxable}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, is_taxable: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="is_taxable" className="ml-2 block text-sm text-gray-700">
                        Taxable
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="track_inventory"
                        checked={newProduct.track_inventory}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, track_inventory: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="track_inventory" className="ml-2 block text-sm text-gray-700">
                        Track Inventory
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="allow_backorders"
                        checked={newProduct.allow_backorders}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, allow_backorders: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="allow_backorders" className="ml-2 block text-sm text-gray-700">
                        Allow Backorders
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowOptionalFields(false);
                    setNewProduct({
                      item_name: '',
                      variation_name: '',
                      description: '',
                      sku: '',
                      price: '',
                      cost: '',
                      category: '',
                      barcode: '',
                      weight: '',
                      tax_name: '',
                      tax_rate: '',
                      image_url: '',
                      image_urls: [] as string[],
                      features: '',
                      stock_quantity: '',
                      is_active: true,
                      is_taxable: true,
                      track_inventory: true,
                      allow_backorders: false
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddProduct}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={!newProduct.item_name || !newProduct.price}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Edit Product</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingProduct(null);
                  setShowOptionalFields(false);
                }}
              >
                ×
              </Button>
            </div>

            <div className="space-y-4">
              {/* Same form fields as Add Product */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Item Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newProduct.item_name}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, item_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter product name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SKU
                  </label>
                  <input
                    type="text"
                    value={newProduct.sku}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                    placeholder="Product SKU"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    SKU cannot be changed after product creation
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, price: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={newProduct.category}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select category</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newProduct.description}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Enter product description"
                />
              </div>

              {/* Optional Fields Toggle */}
              <div className="border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowOptionalFields(!showOptionalFields)}
                  className="w-full flex items-center justify-center"
                >
                  {showOptionalFields ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-2" />
                      Hide Optional Fields
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      Show Optional Fields
                    </>
                  )}
                </Button>
              </div>

              {/* Optional Fields */}
              {showOptionalFields && (
                <div className="space-y-4 border-t pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Variation Name
                      </label>
                      <input
                        type="text"
                        value={newProduct.variation_name}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, variation_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Size Large, Color Red"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cost
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={newProduct.cost}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, cost: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Barcode
                      </label>
                      <input
                        type="text"
                        value={newProduct.barcode}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, barcode: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter barcode"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Weight (lbs)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={newProduct.weight}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, weight: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Stock Quantity
                      </label>
                      <input
                        type="number"
                        value={newProduct.stock_quantity}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, stock_quantity: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product Images (Up to 3)
                    </label>
                    
                    {/* Image Preview Grid */}
                    {newProduct.image_urls.length > 0 && (
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        {newProduct.image_urls.map((url, index) => (
                          <div key={index} className="relative group">
                            <img 
                              src={url} 
                              alt={`Product ${index + 1}`} 
                              className="w-full h-24 object-cover rounded-lg border-2 border-gray-200"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(index)}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                            {index === 0 && (
                              <span className="absolute bottom-1 left-1 bg-blue-500 text-white text-xs px-2 py-0.5 rounded">
                                Primary
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Upload Button */}
                    {newProduct.image_urls.length < 3 && (
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={uploadingImage}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {uploadingImage ? 'Uploading...' : `${newProduct.image_urls.length}/3 images. Max 5MB each. JPG, PNG, or WebP`}
                        </p>
                      </div>
                    )}
                    
                    {newProduct.image_urls.length >= 3 && (
                      <p className="text-xs text-gray-600 bg-gray-100 p-2 rounded">
                        Maximum 3 images reached. Remove an image to add a new one.
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Features (for storefront)
                    </label>
                    <textarea
                      value={newProduct.features}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, features: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={4}
                      placeholder="Enter features, one per line:&#10;✓ Feature 1&#10;✓ Feature 2&#10;✓ Feature 3"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Add one feature per line. These will appear as bullet points on your storefront.
                    </p>
                  </div>

                  {/* Checkboxes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="edit_is_active"
                        checked={newProduct.is_active}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, is_active: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="edit_is_active" className="ml-2 block text-sm text-gray-700">
                        Active Product
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="edit_is_taxable"
                        checked={newProduct.is_taxable}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, is_taxable: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="edit_is_taxable" className="ml-2 block text-sm text-gray-700">
                        Taxable
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="edit_track_inventory"
                        checked={newProduct.track_inventory}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, track_inventory: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="edit_track_inventory" className="ml-2 block text-sm text-gray-700">
                        Track Inventory
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="edit_allow_backorders"
                        checked={newProduct.allow_backorders}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, allow_backorders: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="edit_allow_backorders" className="ml-2 block text-sm text-gray-700">
                        Allow Backorders
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingProduct(null);
                    setShowOptionalFields(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateProduct}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={!newProduct.item_name || !newProduct.price}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Update Product
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
