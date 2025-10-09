import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Eye, 
  Download, 
  Save, 
  Calendar, 
  Filter, 
  BarChart3, 
  FileText, 
  Clock, 
  BookOpen, 
  Mail, 
  Webhook, 
  ChevronDown, 
  Plus, 
  Trash2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Transaction } from '../../lib/supabase';

interface ReportTemplate {
  template_id: string;
  name: string;
  description: string;
  filters: any;
  columns: string[];
  group_by: string;
  aggregations: any;
  created_at: string;
  created_by: string;
}

interface ScheduledReport {
  schedule_id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  delivery_method: 'email' | 'download' | 'webhook';
  next_run: string;
  status: 'active' | 'paused';
}

interface ExportJob {
  export_id: string;
  name: string;
  format: 'csv' | 'xlsx' | 'json';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  download_url?: string;
  file_size?: number;
  export_type?: string;
  record_count?: number;
  filters?: string;
  columns?: string;
}

const Reports: React.FC = () => {
  const { userData, merchantData } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  
  // Overview data
  const [overviewData, setOverviewData] = useState({
    totalSales: 0,
    totalTransactions: 0,
    totalTax: 0,
    totalRefunds: 0,
    topProducts: [] as any[],
    recentActivity: [] as any[]
  });

  // Builder state
  const [builderConfig, setBuilderConfig] = useState({
    dateRange: { start: '', end: '' },
    filters: { status: 'all' },
    columns: ['transaction_id', 'amount_fiat', 'status', 'created_at'],
    groupBy: 'none',
    aggregations: ['count'],
    sorting: { field: 'created_at', direction: 'desc' }
  });
  
  const [previewData, setPreviewData] = useState<Transaction[]>([]);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');

  // Load templates from database
  const loadTemplates = async () => {
    if (!merchantData?.merchant_id) return;
    
    try {
      const { data, error } = await supabase
        .from('report_templates')
        .select('*')
        .eq('merchant_id', merchantData.merchant_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading templates:', error);
        return;
      }

      const templates: ReportTemplate[] = data.map(item => ({
        template_id: item.template_id,
        name: item.name,
        description: item.description || '',
        filters: item.filters,
        columns: item.columns,
        group_by: item.group_by,
        aggregations: item.aggregations,
        created_by: item.created_by,
        created_at: item.created_at
      }));

      setTemplates(templates);
      console.log(`📋 Loaded ${templates.length} templates from database`);
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  // Load export history from database
  const loadExportHistory = async () => {
    if (!merchantData?.merchant_id) return;
    
    try {
      const { data, error } = await supabase
        .from('report_exports')
        .select('*')
        .eq('merchant_id', merchantData.merchant_id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading export history:', error);
        return;
      }

      const exports: ExportJob[] = data.map(item => ({
        export_id: item.export_id,
        name: item.filename,
        filename: item.filename,
        format: item.format,
        status: item.status,
        created_at: item.created_at,
        file_size: item.file_size,
        download_url: undefined // URLs are generated on demand
      }));

      setExportJobs(exports);
      console.log(`📊 Loaded ${exports.length} export jobs from database`);
    } catch (err) {
      console.error('Failed to load export history:', err);
    }
  };

  // Load data when component mounts or merchant changes
  useEffect(() => {
    if (merchantData?.merchant_id) {
      loadTemplates();
      loadExportHistory();
    }
  }, [merchantData?.merchant_id]);

  // Save template function
  const saveTemplate = async () => {
    if (!templateName.trim() || !merchantData?.merchant_id || !userData?.user_id) return;
    
    try {
      const { data, error } = await supabase
        .from('report_templates')
        .insert({
          merchant_id: merchantData.merchant_id,
          name: templateName.trim(),
          filters: builderConfig.filters,
          columns: builderConfig.columns,
          group_by: builderConfig.groupBy,
          aggregations: builderConfig.aggregations,
          created_by: userData.user_id
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving template:', error);
        return;
      }

      const template: ReportTemplate = {
        template_id: data.template_id,
        name: data.name,
        description: data.description || '',
        filters: data.filters,
        columns: data.columns,
        group_by: data.group_by,
        aggregations: data.aggregations,
        created_by: data.created_by,
        created_at: data.created_at
      };
      
      setTemplates(prev => [template, ...prev]);
      setShowSaveTemplate(false);
      setTemplateName('');
      setTemplateDescription('');
      
      console.log(`✅ Template saved to database: ${template.name}`);
    } catch (err) {
      console.error('Failed to save template:', err);
    }
  };

  // Load template function
  const loadTemplate = (template: ReportTemplate) => {
    setBuilderConfig(prev => ({
      ...prev,
      filters: template.filters as any,
      columns: template.columns as string[],
      groupBy: template.group_by as any,
      aggregations: template.aggregations as string[]
    }));
    console.log(`📋 Template loaded: ${template.name}`);
  };

  // Export from template
  const exportFromTemplate = (template: ReportTemplate, format: 'csv' | 'xlsx' | 'json') => {
    // Temporarily apply template config
    const originalConfig = { ...builderConfig };
    setBuilderConfig(prev => ({
      ...prev,
      filters: template.filters as any,
      columns: template.columns as string[],
      groupBy: template.group_by as any,
      aggregations: template.aggregations as string[]
    }));
    
    // Export with template name
    setTimeout(() => {
      exportReport(format, `template_${template.name.toLowerCase().replace(/\s+/g, '_')}`);
      // Restore original config
      setBuilderConfig(originalConfig);
    }, 100);
  };

  // Download function for export jobs
  const downloadExportFile = (job: ExportJob) => {
    if (job.status !== 'completed') return;
    
    try {
      // Create fresh CSV content with proper formatting
      const csvHeaders = [
        'Transaction ID',
        'Invoice Number', 
        'Amount',
        'Network/Chain',
        'Status',
        'Date',
        'Customer Email',
        'Customer Name',
        'Location',
        'Transaction Hash'
      ];
      
      if (job.download_url) {
        const link = document.createElement('a');
        link.href = job.download_url;
        link.download = job.name || 'export.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log(`📥 Downloaded export: ${job.name}`);
      } else {
        console.error('No download URL available for export:', job.name);
        alert('Download not available for this export.');
      }
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please try again.');
    }
  };

  // Available columns for report builder (updated for invoice data)
  const availableColumns = [
    { key: 'transaction_id', label: 'Invoice Number' },
    { key: 'amount_fiat', label: 'Amount' },
    { key: 'fiat_currency', label: 'Currency' },
    { key: 'blockchain', label: 'Network/Chain' },
    { key: 'tx_hash', label: 'Transaction Hash' },
    { key: 'status', label: 'Status' },
    { key: 'created_at', label: 'Date Created' },
    { key: 'customer_email', label: 'Customer Email' },
    { key: 'customer_name', label: 'Customer Name' }
  ];

  // Fetch overview data from standalone_invoices
  useEffect(() => {
    const fetchOverviewData = async () => {
      if (!merchantData?.merchant_id) return;
      
      setLoading(true);
      try {
        // Fetch invoice data from standalone_invoices table
        const { data: invoices, error } = await supabase
          .from('standalone_invoices')
          .select('total_amount, status, tax_amount, created_at, customer_email, invoice_number')
          .eq('merchant_id', merchantData.merchant_id);

        if (invoices && !error) {
          const paid = invoices.filter(inv => ['paid', 'partially_paid', 'overpaid'].includes(inv.status));
          const refunded = invoices.filter(inv => inv.status === 'refunded');
          
          setOverviewData({
            totalSales: paid.reduce((sum, inv) => sum + (parseFloat(inv.total_amount?.toString() || '0') || 0), 0),
            totalTransactions: paid.length,
            totalTax: paid.reduce((sum, inv) => sum + (parseFloat(inv.tax_amount?.toString() || '0') || 0), 0),
            totalRefunds: refunded.reduce((sum, inv) => sum + (parseFloat(inv.total_amount?.toString() || '0') || 0), 0),
            topProducts: [] as any[], // Not applicable for invoice-based system
            recentActivity: invoices.slice(0, 5) as any[]
          });
          
          console.log(`✅ Reports overview loaded: ${paid.length} paid invoices, $${paid.reduce((sum, inv) => sum + (parseFloat(inv.total_amount?.toString() || '0') || 0), 0).toFixed(2)} total sales`);
        }
      } catch (error) {
        console.error('Error fetching overview data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOverviewData();
  }, [merchantData?.merchant_id]);

  // Generate preview data from standalone_invoices
  const generatePreview = async () => {
    if (!merchantData?.merchant_id) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('standalone_invoices')
        .select('id, invoice_number, total_amount, status, created_at, customer_email, customer_name, crypto_chain, payment_tx_hash')
        .eq('merchant_id', merchantData.merchant_id);

      // Apply filters
      if (builderConfig.filters.status !== 'all') {
        query = query.eq('status', builderConfig.filters.status);
      }
      
      if (builderConfig.dateRange.start) {
        query = query.gte('created_at', builderConfig.dateRange.start);
      }
      
      if (builderConfig.dateRange.end) {
        query = query.lte('created_at', builderConfig.dateRange.end);
      }

      // Apply sorting
      query = query.order('created_at', { 
        ascending: builderConfig.sorting.direction === 'asc' 
      });

      // Limit for preview
      query = query.limit(10);

      const { data, error } = await query;
      
      if (data && !error) {
        // Transform data to match expected format - only include selected columns
        const transformedData = data.map(invoice => {
          const row: any = {};
          
          // Map database fields to display columns based on selection
          if (builderConfig.columns.includes('transaction_id')) {
            row.transaction_id = invoice.invoice_number;
          }
          if (builderConfig.columns.includes('amount_fiat')) {
            row.amount_fiat = parseFloat(invoice.total_amount?.toString() || '0');
          }
          if (builderConfig.columns.includes('fiat_currency')) {
            row.fiat_currency = 'USD';
          }
          if (builderConfig.columns.includes('blockchain')) {
            row.blockchain = invoice.crypto_chain || 'Base';
          }
          if (builderConfig.columns.includes('tx_hash')) {
            row.tx_hash = invoice.payment_tx_hash;
          }
          if (builderConfig.columns.includes('status')) {
            row.status = invoice.status;
          }
          if (builderConfig.columns.includes('created_at')) {
            row.created_at = invoice.created_at;
          }
          if (builderConfig.columns.includes('customer_email')) {
            row.customer_email = invoice.customer_email;
          }
          if (builderConfig.columns.includes('customer_name')) {
            row.customer_name = invoice.customer_name;
          }
          
          return row;
        });
        
        setPreviewData(transformedData as any);
      }
    } catch (error) {
      console.error('Error generating preview:', error);
    } finally {
      setLoading(false);
    }
  };

  // Export report data as CSV
  const exportReport = async (format: 'csv' | 'xlsx' | 'json', reportType?: string) => {
    if (!merchantData?.merchant_id) {
      console.error('No merchant ID available for export');
      return;
    }
    
    console.log(`🔄 Starting ${format} export for ${reportType || 'custom'} report...`);
    
    try {
      // First check what tables and data exist
      console.log('🔍 Checking available invoice data...');
      
      // Try standalone_invoices first
      const standaloneResult = await supabase
        .from('standalone_invoices')
        .select('*')
        .eq('merchant_id', merchantData.merchant_id)
        .limit(5);
        
      console.log('📋 Standalone invoices result:', standaloneResult);
      console.log('📋 Standalone data:', standaloneResult.data);
      console.log('📋 Standalone error:', standaloneResult.error);
      
      // Try invoices table as backup
      const invoicesResult = await supabase
        .from('invoices')
        .select('*')
        .eq('merchant_id', merchantData.merchant_id)
        .limit(5);
        
      console.log('📋 Invoices table result:', invoicesResult);
      console.log('📋 Invoices data:', invoicesResult.data);
      console.log('📋 Invoices error:', invoicesResult.error);
      
      // Use whichever table has data
      let query = supabase
        .from('standalone_invoices')
        .select('id, invoice_number, total_amount, status, created_at, customer_email, customer_name, crypto_chain, payment_tx_hash, billing_address')
        .eq('merchant_id', merchantData.merchant_id);
        
      // If standalone_invoices is empty, try invoices table
      if ((!standaloneResult.data || standaloneResult.data.length === 0) && 
          invoicesResult.data && invoicesResult.data.length > 0) {
        query = supabase
          .from('invoices')
          .select('id, invoice_number, total_amount, status, created_at, customer_email, customer_name, crypto_chain, payment_tx_hash, billing_address')
          .eq('merchant_id', merchantData.merchant_id);
      }

      // Apply date filters for specific report types
      const now = new Date();
      if (reportType === 'today') {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        console.log('📅 Today filter:', today.toISOString(), 'to', tomorrow.toISOString());
        query = query.gte('created_at', today.toISOString()).lt('created_at', tomorrow.toISOString());
      } else if (reportType === 'weekly') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        console.log('📅 Weekly filter: from', weekAgo.toISOString());
        query = query.gte('created_at', weekAgo.toISOString());
      } else if (reportType === 'monthly') {
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        console.log('📅 Monthly filter: from', monthAgo.toISOString());
        query = query.gte('created_at', monthAgo.toISOString());
      }

      // Apply builder filters if not a quick report
      if (!reportType) {
        if (builderConfig.filters.status !== 'all') {
          query = query.eq('status', builderConfig.filters.status);
        }
        if (builderConfig.dateRange.start) {
          query = query.gte('created_at', builderConfig.dateRange.start);
        }
        if (builderConfig.dateRange.end) {
          query = query.lte('created_at', builderConfig.dateRange.end);
        }
      }

      query = query.order('created_at', { ascending: false });
      const { data: invoicesData, error: queryError } = await query;
      
      // Handle empty results gracefully
      const invoices = invoicesData || [];
      const error = queryError;

      if (error || !invoices) {
        console.error('Error fetching export data:', error);
        alert('Failed to fetch data for export. Please try again.');
        return;
      }

      console.log(`📊 Found ${invoices.length} invoices for export`);
      console.log('🔍 Query details:', {
        merchant_id: merchantData.merchant_id,
        filters: JSON.stringify(builderConfig.filters),
        dateRange: JSON.stringify(builderConfig.dateRange),
        reportType
      });
      
      // Show sample of found data for debugging
      if (invoices.length > 0) {
        console.log('📋 Sample invoice data:', invoices[0]);
      } else {
        console.log('⚠️ No invoices found - checking raw data from standalone_invoices...');
        // Show what's actually in the table
        if (standaloneResult.data && standaloneResult.data.length > 0) {
          console.log('📋 Raw standalone invoice sample:', standaloneResult.data[0]);
          console.log('📋 Invoice created_at values:', standaloneResult.data.map(inv => inv.created_at));
        }
      }

      // Create export job immediately
      const exportJob: ExportJob = {
        export_id: `export-${Date.now()}`,
        name: `${reportType ? reportType.charAt(0).toUpperCase() + reportType.slice(1) : 'Custom'} Report ${new Date().toLocaleDateString()}`,
        format,
        status: 'processing',
        created_at: new Date().toISOString(),
        download_url: undefined,
        file_size: undefined
      };
      
      setExportJobs(prev => [exportJob, ...prev]);

      // Switch to exports tab to show progress
      setActiveTab('exports');

      if (format === 'csv') {
        // Generate CSV content
        const csvHeaders = [
          'Transaction ID',
          'Invoice Number', 
          'Amount',
          'Network/Chain',
          'Status',
          'Date',
          'Customer Email',
          'Customer Name',
          'Location',
          'Transaction Hash'
        ];

        const csvRows = invoices.map(invoice => {
          const billingAddress = invoice.billing_address as any;
          const location = billingAddress ? 
            `${billingAddress.city || ''}, ${billingAddress.state || ''}, ${billingAddress.country || ''}`.replace(/^,\s*|,\s*$/g, '') : 
            'N/A';
            
          // Sanitize strings to ensure valid UTF-8
          const sanitizeString = (str: any): string => {
            if (!str) return '';
            return String(str)
              .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '') // Remove control characters
              .replace(/[^\x00-\x7F]/g, (char) => {
                // Replace non-ASCII characters that might cause issues
                try {
                  return encodeURIComponent(char).replace(/%/g, '_');
                } catch {
                  return '_';
                }
              });
          };
            
          return [
            sanitizeString(invoice.id),
            sanitizeString(invoice.invoice_number),
            `$${parseFloat(invoice.total_amount?.toString() || '0').toFixed(2)}`,
            sanitizeString(invoice.crypto_chain || 'Base'),
            sanitizeString(invoice.status),
            new Date(invoice.created_at).toLocaleDateString(),
            sanitizeString(invoice.customer_email || ''),
            sanitizeString(invoice.customer_name || ''),
            sanitizeString(location),
            sanitizeString(invoice.payment_tx_hash || 'N/A')
          ];
        });

        // Always include headers, even with no data
        const csvContent = csvRows.length > 0 
          ? [
              csvHeaders.join(','),
              ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n')
          : csvHeaders.join(','); // Headers only when no data

        // Store CSV content for download
        const filename = `${reportType || 'custom'}_report_${new Date().toISOString().split('T')[0]}.csv`;
          
        console.log('📄 CSV Content Preview:', csvContent.substring(0, 200) + '...');
          
        // Create blob with proper MIME type without BOM to avoid UTF-8 issues
        const blob = new Blob([csvContent], { 
          type: 'text/csv;charset=utf-8;' 
        });
          
        // Create download URL
        const downloadUrl = URL.createObjectURL(blob);
        console.log('🔗 Download URL created:', downloadUrl);

        // Save to database and update state
        setTimeout(async () => {
          try {
            const exportPayload = {
              merchant_id: merchantData.merchant_id,
              name: filename,
              export_type: reportType ? 'quick' : 'custom',
              format: format,
              status: 'completed',
              record_count: invoices.length,
              file_size_kb: Math.round(blob.size / 1024),
              filters: builderConfig.filters,
              columns: builderConfig.columns,
              created_by: userData?.user_id
            };
            
            console.log('💾 Attempting to save export to database:');
            console.log('📄 Payload:', JSON.stringify(exportPayload, null, 2));

            const { data, error } = await supabase
              .from('report_exports')
              .insert(exportPayload)
              .select()
              .single();

            if (error) {
              console.error('❌ Database insert error:', error);
              console.error('❌ Error details:', JSON.stringify(error, null, 2));
              console.error('❌ Error message:', error.message);
              console.error('❌ Error code:', error.code);
            }

            if (!error) {
              setExportJobs(prev => prev.map(job => 
                job.export_id === exportJob.export_id 
                  ? { 
                      ...job, 
                      export_id: data.export_id,
                      status: 'completed', 
                      download_url: downloadUrl,
                      file_size: Math.round(blob.size / 1024),
                      filename,
                      csvContent: csvContent
                    }
                  : job
              ));
            }
          } catch (dbError) {
            console.error('Failed to save export to database:', dbError);
            // Still update UI even if DB save fails
            setExportJobs(prev => prev.map(job => 
              job.export_id === exportJob.export_id 
                ? { 
                    ...job, 
                    status: 'completed', 
                    download_url: downloadUrl,
                    file_size: Math.round(blob.size / 1024),
                    filename,
                    csvContent: csvContent
                  }
                : job
            ));
          }
          
          console.log(`✅ CSV export completed: ${invoices.length} records exported`);
          console.log(`📊 File size: ${Math.round(blob.size / 1024)} KB`);
        }, 1500);
      }
      
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  if (!userData || !merchantData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600">
            Generate custom reports and analytics for your business
          </p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6" defaultValue="overview">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="builder">Builder</TabsTrigger>
          <TabsTrigger value="exports">Exports</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Sales</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${overviewData.totalSales.toLocaleString()}
                    </p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Transactions</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {overviewData.totalTransactions.toLocaleString()}
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Tax Collected</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${overviewData.totalTax.toLocaleString()}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Refunds</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${overviewData.totalRefunds.toLocaleString()}
                    </p>
                  </div>
                  <Download className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={() => exportReport('csv', 'today')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Today's Sales
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={() => exportReport('csv', 'weekly')}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Weekly Summary
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={() => exportReport('csv', 'monthly')}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Monthly Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Builder Tab */}
        <TabsContent value="builder" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Filters Panel */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Filter className="h-5 w-5 mr-2" />
                  Filters & Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date Range
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={builderConfig.dateRange.start}
                      onChange={(e) => setBuilderConfig(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, start: e.target.value }
                      }))}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <input 
                      type="date"
                      value={builderConfig.dateRange.end}
                      onChange={(e) => setBuilderConfig(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, end: e.target.value }
                      }))}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={builderConfig.filters.status}
                    onChange={(e) => setBuilderConfig(prev => ({
                      ...prev,
                      filters: { ...prev.filters, status: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="all">All Statuses</option>
                    <option value="paid">Paid</option>
                    <option value="partially_paid">Partially Paid</option>
                    <option value="sent">Sent</option>
                    <option value="draft">Draft</option>
                    <option value="expired">Expired</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>

                {/* Columns Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Columns
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {availableColumns.map(column => (
                      <label key={column.key} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={builderConfig.columns.includes(column.key)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setBuilderConfig(prev => ({
                                ...prev,
                                columns: [...prev.columns, column.key]
                              }));
                            } else {
                              setBuilderConfig(prev => ({
                                ...prev,
                                columns: prev.columns.filter(c => c !== column.key)
                              }));
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm">{column.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <Button onClick={generatePreview} className="w-full" disabled={loading}>
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setShowSaveTemplate(true)}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Template
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Preview Panel */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Preview</CardTitle>
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => exportReport('csv')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      CSV
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => exportReport('xlsx')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      XLSX
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading preview...</div>
                ) : previewData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {builderConfig.columns.map(column => {
                            const columnDef = availableColumns.find(c => c.key === column);
                            console.log(`Column: ${column}, Label: ${columnDef?.label}`);
                            return (
                              <th key={column} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {columnDef?.label || column}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {previewData.map((row, index) => (
                          <tr key={index}>
                            {builderConfig.columns.map(column => (
                              <td key={column} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {column === 'created_at' || column === 'updated_at' 
                                  ? new Date((row as any)[column]).toLocaleDateString()
                                  : (row as any)[column] || '-'
                                }
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Click Preview to see your report data
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>


        {/* Exports Tab */}
        <TabsContent value="exports" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Export History</h3>
          </div>

          <Card>
            <CardContent className="p-6">
              {exportJobs.length > 0 ? (
                <div className="space-y-4">
                  {exportJobs.map(job => {
                    let filters = {};
                    let columns = [];
                    
                    // Safely parse JSON fields to avoid UTF-8 issues
                    try {
                      filters = job.filters ? JSON.parse(job.filters) : {};
                    } catch (error) {
                      console.warn('Failed to parse filters JSON:', error);
                      filters = {};
                    }
                    
                    try {
                      columns = job.columns ? JSON.parse(job.columns) : [];
                    } catch (error) {
                      console.warn('Failed to parse columns JSON:', error);
                      columns = [];
                    }
                    
                    return (
                      <div key={job.export_id} className="border rounded-lg p-4 space-y-3">
                        {/* Header Row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <FileText className="h-8 w-8 text-blue-600" />
                            <div>
                              <p className="font-medium text-lg">{job.name}</p>
                              <p className="text-sm text-gray-500">
                                {job.export_type === 'quick' ? 'Quick Export' : 'Custom Report'} • 
                                {job.format.toUpperCase()} • 
                                {new Date(job.created_at).toLocaleDateString()} at {new Date(job.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <Badge variant={
                              job.status === 'completed' ? 'default' :
                              job.status === 'failed' ? 'destructive' :
                              'secondary'
                            }>
                              {job.status}
                            </Badge>
                            {job.status === 'completed' && job.download_url && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => downloadExportFile(job)}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </Button>
                            )}
                            {job.status === 'processing' && (
                              <div className="flex items-center space-x-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                <span className="text-sm text-gray-500">Processing...</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Export Details */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="bg-gray-50 p-3 rounded">
                            <p className="font-medium text-gray-700 mb-1">Records Exported</p>
                            <p className="text-lg font-semibold">{job.record_count || 0}</p>
                            {job.file_size && (
                              <p className="text-gray-500">{job.file_size} KB</p>
                            )}
                          </div>
                          
                          <div className="bg-gray-50 p-3 rounded">
                            <p className="font-medium text-gray-700 mb-1">Date Range</p>
                            {(filters as any).dateRange ? (
                              <p>{(filters as any).dateRange === 'today' ? 'Today' : 
                                   (filters as any).dateRange === 'week' ? 'This Week' :
                                   (filters as any).dateRange === 'month' ? 'This Month' :
                                   (filters as any).dateRange === 'custom' ? 'Custom Range' : 'All Time'}</p>
                            ) : (
                              <p>All Time</p>
                            )}
                            {(filters as any).startDate && (filters as any).endDate && (
                              <p className="text-gray-500 text-xs">
                                {new Date((filters as any).startDate).toLocaleDateString()} - {new Date((filters as any).endDate).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          
                          <div className="bg-gray-50 p-3 rounded">
                            <p className="font-medium text-gray-700 mb-1">Columns Included</p>
                            <p>{columns.length || 'All'} columns</p>
                            {columns.length > 0 && (
                              <p className="text-gray-500 text-xs truncate">
                                {columns.slice(0, 3).join(', ')}{columns.length > 3 ? '...' : ''}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {/* Additional Filters */}
                        {((filters as any).status || (filters as any).minAmount || (filters as any).maxAmount) && (
                          <div className="bg-blue-50 p-3 rounded">
                            <p className="font-medium text-gray-700 mb-2">Applied Filters</p>
                            <div className="flex flex-wrap gap-2">
                              {(filters as any).status && (
                                <Badge variant="secondary">Status: {(filters as any).status}</Badge>
                              )}
                              {(filters as any).minAmount && (
                                <Badge variant="secondary">Min: ${(filters as any).minAmount}</Badge>
                              )}
                              {(filters as any).maxAmount && (
                                <Badge variant="secondary">Max: ${(filters as any).maxAmount}</Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Download className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No exports yet</p>
                  <p className="text-sm">Export reports from the Builder tab to see them here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Template Dialog */}
      {showSaveTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Save Report Template</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Monthly Invoice Report"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowSaveTemplate(false);
                  setTemplateName('');
                  setTemplateDescription('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={saveTemplate}
                disabled={!templateName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Templates Section */}
      {templates.length > 0 && (
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                Saved Templates ({templates.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {templates.map((template) => (
                  <div key={template.template_id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{template.name}</h4>
                        <div className="flex items-center text-xs text-gray-500 mt-2 space-x-4">
                          <span>{template.columns.length} columns</span>
                          <span>Created {new Date(template.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => loadTemplate(template)}
                          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          Load
                        </button>
                        
                        <div className="relative group">
                          <button className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200">
                            Export ▼
                          </button>
                          <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                            <button
                              onClick={() => exportFromTemplate(template, 'csv')}
                              className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                            >
                              Export as CSV
                            </button>
                            <button
                              onClick={() => exportFromTemplate(template, 'xlsx')}
                              className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                            >
                              Export as Excel
                            </button>
                            <button
                              onClick={() => exportFromTemplate(template, 'json')}
                              className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                            >
                              Export as JSON
                            </button>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => setTemplates(prev => prev.filter(t => t.template_id !== template.template_id))}
                          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Reports;
