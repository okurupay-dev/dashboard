import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { supabase } from '../../lib/supabase/client';
import { useUser } from '@clerk/clerk-react';

interface UserProfile {
  name: string;
  email: string;
  role: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
}

interface CompanyProfile {
  businessName: string;
  businessAddress: string;
  businessWebsite: string;
  businessType: string;
  businessPhone: string;
  businessEmail: string;
}

interface NotificationSettings {
  email: boolean;
  push: boolean;
  sms: boolean;
  transactionAlerts: boolean;
  securityAlerts: boolean;
  marketingUpdates: boolean;
}

const Settings: React.FC = () => {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // User preferences (editable)
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    email: '',
    role: '',
    theme: 'system',
    language: 'English',
    timezone: 'America/New_York'
  });

  // Company information (read-only, managed by Okuru admin)
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>({
    businessName: '',
    businessAddress: '',
    businessWebsite: '',
    businessType: '',
    businessPhone: '',
    businessEmail: ''
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    email: true,
    push: true,
    sms: false,
    transactionAlerts: true,
    securityAlerts: true,
    marketingUpdates: false
  });

  // Load user and company data from database
  useEffect(() => {
    const loadUserData = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);

        // Get user profile from database
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select(`
            name,
            email,
            role,
            merchant_id
          `)
          .eq('clerk_user_id', user.id)
          .single();

        if (userError) {
          console.error('Error loading user data:', userError);
          return;
        }

        if (userData) {
          // Set user profile data
          setProfile({
            name: userData.name || '',
            email: userData.email || '',
            role: userData.role || '',
            theme: 'system', // Default theme, could be stored in user preferences
            language: 'English', // Default language, could be stored in user preferences
            timezone: 'America/New_York' // Default timezone, could be stored in user preferences
          });

          // Get merchant data separately
          if (userData.merchant_id) {
            const { data: merchantData, error: merchantError } = await supabase
              .from('merchants')
              .select(`
                business_name,
                business_address,
                business_website,
                business_type,
                business_phone,
                business_email
              `)
              .eq('merchant_id', userData.merchant_id)
              .single();

            if (!merchantError && merchantData) {
              setCompanyProfile({
                businessName: merchantData.business_name || '',
                businessAddress: merchantData.business_address || '',
                businessWebsite: merchantData.business_website || '',
                businessType: merchantData.business_type || '',
                businessPhone: merchantData.business_phone || '',
                businessEmail: merchantData.business_email || ''
              });
            }
          }
        }
      } catch (error) {
        console.error('Error loading settings data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [user?.id]);

  // Save user preferences (only editable fields)
  const handleSavePreferences = async () => {
    if (!user?.id) return;

    try {
      setSaving(true);

      // Only save user preferences, not company data
      const { error } = await supabase
        .from('users')
        .update({
          name: profile.name,
          // Note: email and role are managed by Okuru admin
          // theme, language, timezone could be added to user_preferences table
        })
        .eq('clerk_user_id', user.id);

      if (error) {
        console.error('Error saving preferences:', error);
        alert('Error saving preferences. Please try again.');
        return;
      }

      alert('Preferences saved successfully!');
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Error saving preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">Settings</h1>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* User Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle>User Profile</CardTitle>
            <p className="text-sm text-gray-600">Manage your personal account settings</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
              <input
                type="text"
                className="w-full p-3 sm:p-2 border rounded-lg bg-gray-50 text-base sm:text-sm"
                value={profile.name}
                disabled
                title="Name is managed by Okuru"
              />
              <p className="text-xs text-gray-500 mt-1">Name is managed by Okuru</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                className="w-full p-3 sm:p-2 border rounded-lg bg-gray-50 text-base sm:text-sm"
                value={profile.email}
                disabled
                title="Email is managed by Okuru"
              />
              <p className="text-xs text-gray-500 mt-1">Email is managed by Okuru</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <input
                type="text"
                className="w-full p-3 sm:p-2 border rounded-lg bg-gray-50 text-base sm:text-sm"
                value={profile.role}
                disabled
                title="Role is managed by Okuru"
              />
              <p className="text-xs text-gray-500 mt-1">Role is managed by Okuru</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
              <select
                className="w-full p-3 sm:p-2 border rounded-lg text-base sm:text-sm appearance-none bg-white"
                value={profile.theme}
                onChange={(e) => setProfile({ ...profile, theme: e.target.value as 'light' | 'dark' | 'system' })}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System Default</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
              <select
                className="w-full p-3 sm:p-2 border rounded-lg text-base sm:text-sm appearance-none bg-white"
                value={profile.language}
                onChange={(e) => setProfile({ ...profile, language: e.target.value })}
              >
                <option value="English">English</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="German">German</option>
                <option value="Japanese">Japanese</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
              <select
                className="w-full p-3 sm:p-2 border rounded-lg text-base sm:text-sm appearance-none bg-white"
                value={profile.timezone}
                onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
              >
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="Europe/London">Greenwich Mean Time (GMT)</option>
                <option value="Europe/Paris">Central European Time (CET)</option>
                <option value="Asia/Tokyo">Japan Standard Time (JST)</option>
              </select>
            </div>
            <Button 
              onClick={handleSavePreferences} 
              disabled={saving}
              className="w-full mt-4 py-3 text-base font-medium"
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </CardContent>
        </Card>

        {/* Company Information Section (Read-Only) */}
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <p className="text-sm text-gray-600">Business details managed by Okuru</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
              <input
                type="text"
                className="w-full p-3 sm:p-2 border rounded-lg bg-gray-50 text-base sm:text-sm"
                value={companyProfile.businessName}
                disabled
                title="Managed by Okuru"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Business Address</label>
              <input
                type="text"
                className="w-full p-3 sm:p-2 border rounded-lg bg-gray-50 text-base sm:text-sm"
                value={companyProfile.businessAddress}
                disabled
                title="Managed by Okuru"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
              <input
                type="url"
                className="w-full p-3 sm:p-2 border rounded-lg bg-gray-50 text-base sm:text-sm"
                value={companyProfile.businessWebsite}
                disabled
                title="Managed by Okuru"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Business Type</label>
              <input
                type="text"
                className="w-full p-3 sm:p-2 border rounded-lg bg-gray-50 text-base sm:text-sm"
                value={companyProfile.businessType}
                disabled
                title="Managed by Okuru"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Business Phone</label>
              <input
                type="tel"
                className="w-full p-3 sm:p-2 border rounded-lg bg-gray-50 text-base sm:text-sm"
                value={companyProfile.businessPhone}
                disabled
                title="Managed by Okuru"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Business Email</label>
              <input
                type="email"
                className="w-full p-3 sm:p-2 border rounded-lg bg-gray-50 text-base sm:text-sm"
                value={companyProfile.businessEmail}
                disabled
                title="Managed by Okuru"
              />
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Company information is managed by Okuru. 
                Contact support if you need to update these details.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <p className="text-sm text-gray-600">Choose how you want to receive notifications</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 text-base">Notification Types</h4>
                <div className="space-y-4">
                  <label className="flex items-center p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 sm:w-5 sm:h-5 rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      checked={notificationSettings.transactionAlerts}
                      onChange={(e) => setNotificationSettings({
                        ...notificationSettings,
                        transactionAlerts: e.target.checked
                      })}
                    />
                    <span className="ml-3 text-sm sm:text-base text-gray-700">Transaction Alerts</span>
                  </label>
                  <label className="flex items-center p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 sm:w-5 sm:h-5 rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      checked={notificationSettings.securityAlerts}
                      onChange={(e) => setNotificationSettings({
                        ...notificationSettings,
                        securityAlerts: e.target.checked
                      })}
                    />
                    <span className="ml-3 text-sm sm:text-base text-gray-700">Security Alerts</span>
                  </label>
                  <label className="flex items-center p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 sm:w-5 sm:h-5 rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      checked={notificationSettings.marketingUpdates}
                      onChange={(e) => setNotificationSettings({
                        ...notificationSettings,
                        marketingUpdates: e.target.checked
                      })}
                    />
                    <span className="ml-3 text-sm sm:text-base text-gray-700">Marketing Updates</span>
                  </label>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 text-base">Delivery Methods</h4>
                <div className="space-y-4">
                  <label className="flex items-center p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 sm:w-5 sm:h-5 rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      checked={notificationSettings.email}
                      onChange={(e) => setNotificationSettings({
                        ...notificationSettings,
                        email: e.target.checked
                      })}
                    />
                    <span className="ml-3 text-sm sm:text-base text-gray-700">Email</span>
                  </label>
                  <label className="flex items-center p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 sm:w-5 sm:h-5 rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      checked={notificationSettings.push}
                      onChange={(e) => setNotificationSettings({
                        ...notificationSettings,
                        push: e.target.checked
                      })}
                    />
                    <span className="ml-3 text-sm sm:text-base text-gray-700">Push Notifications</span>
                  </label>
                  <label className="flex items-center p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 sm:w-5 sm:h-5 rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      checked={notificationSettings.sms}
                      onChange={(e) => setNotificationSettings({
                        ...notificationSettings,
                        sms: e.target.checked
                      })}
                    />
                    <span className="ml-3 text-sm sm:text-base text-gray-700">SMS</span>
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
