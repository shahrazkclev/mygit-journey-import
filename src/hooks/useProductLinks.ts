import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProductLink {
  id: string;
  tag_name: string;
  download_url: string;
  video_guide_url: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export const useProductLinks = () => {
  const [productLinks, setProductLinks] = useState<ProductLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProductLinks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('product_links')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProductLinks(data || []);
    } catch (err) {
      console.error('Error loading product links:', err);
      setError(err instanceof Error ? err.message : 'Failed to load product links');
    } finally {
      setLoading(false);
    }
  };

  const getProductLinkByTag = (tagName: string): ProductLink | null => {
    return productLinks.find(link => link.tag_name === tagName) || null;
  };

  const getProductLinkByProductName = (productName: string): ProductLink | null => {
    // Find by exact match or partial match
    return productLinks.find(link => 
      link.tag_name.toLowerCase().includes(productName.toLowerCase()) ||
      productName.toLowerCase().includes(link.tag_name.toLowerCase())
    ) || null;
  };

  useEffect(() => {
    loadProductLinks();
  }, []);

  return {
    productLinks,
    loading,
    error,
    loadProductLinks,
    getProductLinkByTag,
    getProductLinkByProductName
  };
};
