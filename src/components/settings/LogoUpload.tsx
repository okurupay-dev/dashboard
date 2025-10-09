import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface LogoUploadProps {
  currentLogoUrl?: string | null;
  merchantId: string;
  onLogoUpdated: (newLogoUrl: string) => void;
}

const LogoUpload: React.FC<LogoUploadProps> = ({ currentLogoUrl, merchantId, onLogoUpdated }) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentLogoUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be less than 2MB');
      return;
    }

    try {
      setUploading(true);

      // Create file name
      const fileExt = file.name.split('.').pop();
      const fileName = `logos/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('merchant-logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        alert('Failed to upload logo. Please try again.');
        return;
      }

      // Get a signed URL (valid for 1 year)
      const { data: signedData, error: signedError } = await supabase.storage
        .from('merchant-logos')
        .createSignedUrl(fileName, 31536000); // 1 year

      if (signedError || !signedData?.signedUrl) {
        console.error('Error getting signed URL:', signedError);
        alert('Failed to get logo URL. Please try again.');
        return;
      }

      const newLogoUrl = signedData.signedUrl;

      // Update merchant record in database
      const { error: updateError } = await supabase
        .from('merchants')
        .update({ logo_url: newLogoUrl })
        .eq('merchant_id', merchantId);

      if (updateError) {
        console.error('Error updating merchant:', updateError);
        alert('Failed to update logo in database. Please try again.');
        return;
      }

      // Update preview
      setPreview(newLogoUrl);
      onLogoUpdated(newLogoUrl);
      alert('Logo updated successfully!');

    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!window.confirm('Are you sure you want to remove your logo?')) {
      return;
    }

    try {
      setUploading(true);

      // Update merchant record to remove logo
      const { error } = await supabase
        .from('merchants')
        .update({ logo_url: null })
        .eq('merchant_id', merchantId);

      if (error) {
        console.error('Error removing logo:', error);
        alert('Failed to remove logo. Please try again.');
        return;
      }

      setPreview(null);
      onLogoUpdated('');
      alert('Logo removed successfully!');

    } catch (error) {
      console.error('Error removing logo:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Business Logo
      </label>
      
      <div className="flex items-start gap-4">
        {/* Logo Preview */}
        <div className="flex-shrink-0">
          {preview ? (
            <div className="relative group">
              <img
                src={preview}
                alt="Business logo"
                className="w-24 h-24 object-cover rounded-lg border-2 border-gray-200"
              />
              <button
                onClick={handleRemoveLogo}
                disabled={uploading}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove logo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="w-24 h-24 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>

        {/* Upload Button */}
        <div className="flex-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <Upload className="w-4 h-4" />
            {uploading ? 'Uploading...' : preview ? 'Replace Logo' : 'Upload Logo'}
          </button>
          
          <p className="text-xs text-gray-500 mt-2">
            Recommended: Square image, PNG or JPG, max 2MB
          </p>
          <p className="text-xs text-gray-500">
            This logo will appear on your storefront, invoices, and throughout the dashboard
          </p>
        </div>
      </div>
    </div>
  );
};

export default LogoUpload;
