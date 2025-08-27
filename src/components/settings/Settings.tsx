import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, ExternalLink } from 'lucide-react';

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
  businessStreet: string;
  businessCity: string;
  businessState: string;
  businessCountry: string;
  businessPostalCode: string;
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
  const { userData } = useAuth();
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
    businessStreet: '',
    businessCity: '',
    businessState: '',
    businessCountry: '',
    businessPostalCode: '',
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
      if (!userData?.auth_user_id) return;

      try {
        setLoading(true);

        // Get user profile from database
        const { data: userDataQuery, error: userError } = await supabase
          .from('users')
          .select(`
            user_id,
            name,
            email,
            role,
            merchant_id
          `)
          .eq('auth_user_id', userData?.auth_user_id)
          .single();

        if (userError) {
          console.error('Error loading user data:', userError);
          return;
        }

        if (userDataQuery) {
          // Set user profile data from database query
          setProfile({
            name: userDataQuery.name || '',
            email: userDataQuery.email || '',
            role: userDataQuery.role || '',
            theme: 'system', // Default until user_preferences table is created
            language: 'English',
            timezone: 'America/New_York'
          });

          // Try to get user preferences (gracefully handle if table doesn't exist)
          try {
            const { data: preferencesData, error: prefError } = await supabase
              .from('user_preferences')
              .select('*')
              .eq('user_id', userData.user_id)
              .maybeSingle();

            if (!prefError && preferencesData) {
              // Update profile with saved preferences
              setProfile(prev => ({
                ...prev,
                theme: preferencesData.theme || 'system',
                language: preferencesData.language || 'English',
                timezone: preferencesData.timezone || 'America/New_York'
              }));

              // Set notification preferences
              setNotificationSettings({
                email: preferencesData.notification_email ?? true,
                push: preferencesData.notification_push ?? true,
                sms: preferencesData.notification_sms ?? false,
                transactionAlerts: preferencesData.notification_transaction_alerts ?? true,
                securityAlerts: preferencesData.notification_security_alerts ?? true,
                marketingUpdates: preferencesData.notification_marketing_updates ?? false
              });
            }
          } catch (prefError) {
            console.log('User preferences table not found, using defaults');
          }

          // Get merchant data separately
          if (userData.merchant_id) {
            const { data: merchantData, error: merchantError } = await supabase
              .from('merchants')
              .select(`
                name,
                business_street,
                business_city,
                business_state,
                business_country,
                business_postal_code,
                website,
                industry,
                business_phone,
                business_email
              `)
              .eq('merchant_id', userData.merchant_id)
              .single();

            if (!merchantError && merchantData) {
              setCompanyProfile({
                businessName: merchantData.name || '',
                businessStreet: merchantData.business_street || '',
                businessCity: merchantData.business_city || '',
                businessState: merchantData.business_state || '',
                businessCountry: merchantData.business_country || '',
                businessPostalCode: merchantData.business_postal_code || '',
                businessWebsite: merchantData.website || '',
                businessType: merchantData.industry || '',
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
  }, [userData?.auth_user_id]);

  // Save user preferences (only editable fields)
  const handleSavePreferences = async () => {
    if (!userData?.auth_user_id) return;

    try {
      setSaving(true);

      // Get user_id first
      const { data: userDataQuery, error: userError } = await supabase
        .from('users')
        .select('user_id')
        .eq('auth_user_id', userData?.auth_user_id)
        .single();

      if (userError || !userData) {
        console.error('Error finding user:', userError);
        alert('Error saving preferences. Please try again.');
        return;
      }

      // Try to save user preferences (gracefully handle if table doesn't exist)
      try {
        const { error: preferencesError } = await supabase
          .from('user_preferences')
          .upsert({
            user_id: userData.user_id,
            theme: profile.theme,
            language: profile.language,
            timezone: profile.timezone,
            notification_email: notificationSettings.email,
            notification_push: notificationSettings.push,
            notification_sms: notificationSettings.sms,
            notification_transaction_alerts: notificationSettings.transactionAlerts,
            notification_security_alerts: notificationSettings.securityAlerts,
            notification_marketing_updates: notificationSettings.marketingUpdates,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });

        if (preferencesError) {
          console.error('Error saving preferences:', preferencesError);
          alert('Preferences saved locally but could not sync to database. Please contact support.');
          return;
        }
      } catch (prefError) {
        console.log('User preferences table not found, preferences saved locally only');
        alert('Preferences saved locally. Database sync will be available after setup.');
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
              <input
                type="text"
                className="w-full p-3 sm:p-2 border rounded-lg bg-gray-50 text-base sm:text-sm"
                value={companyProfile.businessStreet}
                disabled
                title="Managed by Okuru"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  className="w-full p-3 sm:p-2 border rounded-lg bg-gray-50 text-base sm:text-sm"
                  value={companyProfile.businessCity}
                  disabled
                  title="Managed by Okuru"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">State/Province</label>
                <input
                  type="text"
                  className="w-full p-3 sm:p-2 border rounded-lg bg-gray-50 text-base sm:text-sm"
                  value={companyProfile.businessState}
                  disabled
                  title="Managed by Okuru"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                <input
                  type="text"
                  className="w-full p-3 sm:p-2 border rounded-lg bg-gray-50 text-base sm:text-sm"
                  value={companyProfile.businessCountry}
                  disabled
                  title="Managed by Okuru"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Postal Code</label>
                <input
                  type="text"
                  className="w-full p-3 sm:p-2 border rounded-lg bg-gray-50 text-base sm:text-sm"
                  value={companyProfile.businessPostalCode}
                  disabled
                  title="Managed by Okuru"
                />
              </div>
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
            {companyProfile.businessPhone && (
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
            )}
            {companyProfile.businessEmail && (
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
            )}
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

        {/* Documents Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Legal Documents</span>
            </CardTitle>
            <p className="text-sm text-gray-600">
              Access important agreements and disclosures you've signed with Okurupay
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Merchant Agreement */}
                <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors h-full flex flex-col">
                  <div className="flex items-start justify-between flex-1">
                    <div className="flex-1 flex flex-col">
                      <h3 className="font-medium text-gray-900 mb-1">
                        Okurupay Merchant Agreement
                      </h3>
                      <p className="text-sm text-gray-600 mb-3 flex-1">
                        Terms and conditions for merchant services, payment processing, and platform usage.
                      </p>
                      <div className="flex items-center text-xs text-gray-500 space-x-4 mt-auto">
                        <span>Signed: {new Date().toLocaleDateString()}</span>
                        <span>Version: 2.1</span>
                      </div>
                    </div>
                    <button 
                      className="ml-4 p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md transition-colors flex-shrink-0"
                      onClick={() => window.open('/documents/merchant-agreement.pdf', '_blank')}
                      title="View Merchant Agreement"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Crypto Disclosure Document */}
                <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors h-full flex flex-col">
                  <div className="flex items-start justify-between flex-1">
                    <div className="flex-1 flex flex-col">
                      <h3 className="font-medium text-gray-900 mb-1">
                        Okurupay Crypto Disclosure Document
                      </h3>
                      <p className="text-sm text-gray-600 mb-3 flex-1">
                        Important disclosures regarding cryptocurrency transactions, risks, and regulatory compliance.
                      </p>
                      <div className="flex items-center text-xs text-gray-500 space-x-4 mt-auto">
                        <span>Signed: {new Date().toLocaleDateString()}</span>
                        <span>Version: 1.3</span>
                      </div>
                    </div>
                    <button 
                      className="ml-4 p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md transition-colors flex-shrink-0"
                      onClick={() => window.open('/documents/crypto-disclosure.pdf', '_blank')}
                      title="View Crypto Disclosure Document"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Privacy Policy */}
                <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors h-full flex flex-col">
                  <div className="flex items-start justify-between flex-1">
                    <div className="flex-1 flex flex-col">
                      <h3 className="font-medium text-gray-900 mb-1">
                        Privacy Policy
                      </h3>
                      <p className="text-sm text-gray-600 mb-3 flex-1">
                        How we collect, use, and protect your personal and business information.
                      </p>
                      <div className="flex items-center text-xs text-gray-500 space-x-4 mt-auto">
                        <span>Effective: {new Date().toLocaleDateString()}</span>
                        <span>Version: 3.0</span>
                      </div>
                    </div>
                    <button 
                      className="ml-4 p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md transition-colors flex-shrink-0"
                      onClick={() => window.open('/documents/privacy-policy.pdf', '_blank')}
                      title="View Privacy Policy"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Terms of Service */}
                <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors h-full flex flex-col">
                  <div className="flex items-start justify-between flex-1">
                    <div className="flex-1 flex flex-col">
                      <h3 className="font-medium text-gray-900 mb-1">
                        Terms of Service
                      </h3>
                      <p className="text-sm text-gray-600 mb-3 flex-1">
                        General terms governing your use of the Okurupay platform and services.
                      </p>
                      <div className="flex items-center text-xs text-gray-500 space-x-4 mt-auto">
                        <span>Effective: {new Date().toLocaleDateString()}</span>
                        <span>Version: 2.5</span>
                      </div>
                    </div>
                    <button 
                      className="ml-4 p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md transition-colors flex-shrink-0"
                      onClick={() => window.open('/documents/terms-of-service.pdf', '_blank')}
                      title="View Terms of Service"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-start space-x-3">
                  <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">Document Access</h4>
                    <p className="text-sm text-blue-800">
                      These documents represent the agreements you've signed with Okurupay. 
                      If you need assistance understanding any terms or have questions, please contact our support team.
                    </p>
                    <button 
                      className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
                      onClick={() => window.open('mailto:support@okurupay.com?subject=Document Inquiry', '_blank')}
                    >
                      Contact Support
                    </button>
                  </div>
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
