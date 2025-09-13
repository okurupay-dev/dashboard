import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  FileText, 
  Download, 
  Calendar, 
  Filter, 
  BarChart3, 
  Settings, 
  Play,
  Save,
  Share,
  Clock,
  Mail,
  Webhook,
  ChevronDown,
  Eye,
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
    filters: {
      status: 'all',
      currency: 'all',
      terminal: 'all',
      staff: 'all'
    },
    columns: ['amount_fiat', 'crypto_currency', 'status', 'created_at'],
    groupBy: 'none',
    aggregations: ['count'],
    sorting: { field: 'created_at', direction: 'desc' }
  });
  
  const [previewData, setPreviewData] = useState<Transaction[]>([]);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);

  // Available columns for report builder
  const availableColumns = [
    { key: 'transaction_id', label: 'Transaction ID' },
    { key: 'amount_fiat', label: 'Amount (Fiat)' },
    { key: 'fiat_currency', label: 'Fiat Currency' },
    { key: 'amount_crypto', label: 'Amount (Crypto)' },
    { key: 'crypto_currency', label: 'Crypto Currency' },
    { key: 'blockchain', label: 'Blockchain' },
    { key: 'tx_hash', label: 'Transaction Hash' },
    { key: 'status', label: 'Status' },
    { key: 'fee', label: 'Fee' },
    { key: 'tip', label: 'Tip' },
    { key: 'terminal_id', label: 'Terminal' },
    { key: 'staff_user_id', label: 'Staff' },
    { key: 'created_at', label: 'Date Created' },
    { key: 'updated_at', label: 'Date Updated' }
  ];

  // Fetch overview data
  useEffect(() => {
    const fetchOverviewData = async () => {
      if (!merchantData?.merchant_id) return;
      
      setLoading(true);
      try {
        // Fetch transaction summary
        const { data: transactions, error } = await supabase
          .from('transactions')
          .select('amount_fiat, status, fee, tip, created_at')
          .eq('merchant_id', merchantData.merchant_id);

        if (transactions && !error) {
          const completed = transactions.filter(t => t.status === 'completed');
          const refunded = transactions.filter(t => t.status === 'refunded');
          
          setOverviewData({
            totalSales: completed.reduce((sum, t) => sum + (t.amount_fiat || 0), 0),
            totalTransactions: completed.length,
            totalTax: completed.reduce((sum, t) => sum + (t.amount_fiat || 0) * 0.085, 0), // Assuming 8.5% tax
            totalRefunds: refunded.reduce((sum, t) => sum + (t.amount_fiat || 0), 0),
            topProducts: [] as any[], // Would need products table join
            recentActivity: transactions.slice(0, 5) as any[]
          });
        }
      } catch (error) {
        console.error('Error fetching overview data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOverviewData();
  }, [merchantData?.merchant_id]);

  // Generate preview data based on builder config
  const generatePreview = async () => {
    if (!merchantData?.merchant_id) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('transactions')
        .select('*')
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
      query = query.order(builderConfig.sorting.field, { 
        ascending: builderConfig.sorting.direction === 'asc' 
      });

      // Limit for preview
      query = query.limit(10);

      const { data, error } = await query;
      
      if (data && !error) {
        setPreviewData(data);
      }
    } catch (error) {
      console.error('Error generating preview:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (format: 'csv' | 'xlsx' | 'json') => {
    // This would typically queue a background job
    const exportJob: ExportJob = {
      export_id: `export-${Date.now()}`,
      name: `Report Export ${new Date().toLocaleDateString()}`,
      format,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    
    setExportJobs(prev => [exportJob, ...prev]);
    
    // Simulate processing
    setTimeout(() => {
      setExportJobs(prev => prev.map(job => 
        job.export_id === exportJob.export_id 
          ? { ...job, status: 'completed', download_url: '#', file_size: 1024 }
          : job
      ));
    }, 3000);
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="builder">Builder</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
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
                <Button variant="outline" className="justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Today's Sales
                </Button>
                <Button variant="outline" className="justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  Weekly Summary
                </Button>
                <Button variant="outline" className="justify-start">
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
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
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
                  <Button variant="outline" className="w-full">
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
                          {builderConfig.columns.map(column => (
                            <th key={column} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {availableColumns.find(c => c.key === column)?.label || column}
                            </th>
                          ))}
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

        {/* Scheduled Tab */}
        <TabsContent value="scheduled" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Scheduled Reports</h3>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Schedule
            </Button>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No scheduled reports yet</p>
                <p className="text-sm">Create automated reports that run on your schedule</p>
              </div>
            </CardContent>
          </Card>
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
                  {exportJobs.map(job => (
                    <div key={job.export_id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <FileText className="h-8 w-8 text-gray-400" />
                        <div>
                          <p className="font-medium">{job.name}</p>
                          <p className="text-sm text-gray-500">
                            {job.format.toUpperCase()} • {new Date(job.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Badge variant={
                          job.status === 'completed' ? 'default' :
                          job.status === 'failed' ? 'destructive' :
                          'secondary'
                        }>
                          {job.status}
                        </Badge>
                        {job.status === 'completed' && job.download_url && (
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
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
    </div>
  );
};

export default Reports;
