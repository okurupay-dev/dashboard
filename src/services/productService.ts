import { supabase } from '../lib/supabase';

export interface Product {
  product_id: string;
  merchant_id: string;
  item_name: string;
  variation_name?: string;
  sku: string;
  description?: string;
  category?: string;
  price: number;
  cost?: number;
  image_url?: string;
  is_active: boolean;
  is_taxable: boolean;
  track_inventory: boolean;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export const productService = {
  /**
   * Get all active products for the current merchant
   */
  async getActiveProducts(): Promise<Product[]> {
    try {
      // Get current user's merchant_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ No authenticated user for getActiveProducts');
        return [];
      }

      // Get user's merchant_id from the users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('merchant_id')
        .eq('auth_user_id', user.id)
        .single();

      if (userError || !userData?.merchant_id) {
        console.error('❌ Error getting merchant_id for products:', userError);
        return [];
      }

      console.log('🔍 Fetching products for merchant:', userData.merchant_id);

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('merchant_id', userData.merchant_id)
        .eq('is_active', true)
        .order('item_name', { ascending: true });

      if (error) {
        console.error('Error fetching products:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getActiveProducts:', error);
      throw error;
    }
  },

  /**
   * Get all products (active and inactive) for the current merchant
   */
  async getAllProducts(): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('item_name', { ascending: true });

      if (error) {
        console.error('Error fetching all products:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllProducts:', error);
      throw error;
    }
  },

  /**
   * Get a single product by ID
   */
  async getProductById(productId: string): Promise<Product | null> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('product_id', productId)
        .single();

      if (error) {
        console.error('Error fetching product:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getProductById:', error);
      throw error;
    }
  },

  /**
   * Get products by IDs (for storefront display)
   */
  async getProductsByIds(productIds: string[]): Promise<Product[]> {
    try {
      if (productIds.length === 0) return [];

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .in('product_id', productIds)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching products by IDs:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getProductsByIds:', error);
      throw error;
    }
  }
};
