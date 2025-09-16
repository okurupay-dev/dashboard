import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { supabase } from '../../lib/supabase';
import { TrendingUp, TrendingDown, Users, DollarSign, CreditCard, Target } from 'lucide-react';

// Interface for business metrics
interface BusinessMetrics {
  totalRevenue: number;
  totalTransactions: number;
  newCustomers: number;
  averageOrderValue: number;
  successRate: number;
  monthlyGrowth: number;
}

interface MonthlyData {
  month: string;
  revenue: number;
  transactions: number;
  customers: number;
}

// Default data structure - will be replaced with real data
const defaultData = {
  businessMetrics: {
    totalRevenue: 0,
    totalTransactions: 0,
    newCustomers: 0,
    averageOrderValue: 0,
    successRate: 0,
    monthlyGrowth: 0
  },
  monthlyTrends: [] as MonthlyData[],
  performanceMetrics: {
    orderCompletion: 0,
    deliveryReturn: 0,
    deliveryCancel: 0,
    customerSatisfaction: 0
  }
};

const Analytics: React.FC = () => {
  const { userData } = useAuth();
  const [data, setData] = useState(defaultData);
  const [loading, setLoading] = useState(true);
  const [merchantInfo, setMerchantInfo] = useState<{ name: string; id: string } | null>(null);

  // Generate monthly trends from real invoice data
  const generateMonthlyTrends = (invoiceData: any[]): MonthlyData[] => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentDate = new Date();
    const trends: MonthlyData[] = [];
    
    // Get last 7 months of data
    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const month = monthNames[targetDate.getMonth()];
      const year = targetDate.getFullYear();
      
      const monthData = invoiceData.filter(inv => {
        const invDate = new Date(inv.created_at);
        return invDate.getMonth() === targetDate.getMonth() && invDate.getFullYear() === year;
      });
      
      const revenue = monthData.reduce((sum, inv) => 
        sum + (parseFloat(inv.total_amount?.toString() || '0') || 0), 0
      );
      
      const transactions = monthData.length;
      
      const customers = new Set(
        monthData
          .map(inv => inv.customer_email)
          .filter(email => email && email.trim() !== '')
      ).size;
      
      trends.push({ month, revenue, transactions, customers });
    }
    
    return trends;
  };

  // Calculate business performance metrics from real data
  const calculatePerformanceMetrics = (invoiceData: any[]) => {
    if (!invoiceData || invoiceData.length === 0) {
      return {
        orderCompletion: 0,
        deliveryReturn: 0,
        deliveryCancel: 0,
        customerSatisfaction: 0
      };
    }
    
    const completedInvoices = invoiceData.filter(inv => 
      ['paid', 'partially_paid', 'overpaid'].includes(inv.status)
    );
    const cancelledInvoices = invoiceData.filter(inv => inv.status === 'cancelled');
    const expiredInvoices = invoiceData.filter(inv => inv.status === 'expired');
    
    const orderCompletion = Math.round((completedInvoices.length / invoiceData.length) * 100);
    const cancelRate = Math.round((cancelledInvoices.length / invoiceData.length) * 100);
    const returnRate = Math.round((expiredInvoices.length / invoiceData.length) * 100);
    
    // Customer satisfaction based on completion rate and low cancel rate
    const customerSatisfaction = Math.min(95, Math.max(50, orderCompletion - (cancelRate * 2)));
    
    return {
      orderCompletion,
      deliveryReturn: returnRate,
      deliveryCancel: cancelRate,
      customerSatisfaction
    };
  };

  // Load merchant business analytics from database
  const loadMerchantAnalytics = async () => {
    if (!userData?.auth_user_id) return;

    try {
      // Get user and merchant info
      const { data: userDataQuery, error: userError } = await supabase
        .from('users')
        .select(`
          user_id,
          merchant_id,
          merchants (
            merchant_id,
            name,
            industry
          )
        `)
        .eq('auth_user_id', userData.auth_user_id)
        .single();

      if (userError || !userData) {
        console.error('Error loading user data for analytics:', userError);
        setLoading(false);
        return;
      }

      // Set merchant info for display
      if (userDataQuery.merchants) {
        const merchant = Array.isArray(userDataQuery.merchants) ? userDataQuery.merchants[0] : userDataQuery.merchants;
        setMerchantInfo({
          name: merchant?.name || 'Unknown Merchant',
          id: merchant?.merchant_id || ''
        });
      }

      // Get real invoice data from standalone_invoices table
      try {
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('standalone_invoices')
          .select('total_amount, status, created_at, customer_email, paid_at, customer_name')
          .eq('merchant_id', userData.merchant_id)
          .order('created_at', { ascending: false });

        if (!invoiceError && invoiceData && invoiceData.length > 0) {
          console.log(`📊 Found ${invoiceData.length} invoices for business analytics`);
          
          // Calculate business metrics from real invoice data
          const totalTransactions = invoiceData.length;
          const totalRevenue = invoiceData.reduce((sum, invoice) => {
            const amount = parseFloat(invoice.total_amount?.toString() || '0') || 0;
            return sum + amount;
          }, 0);
          const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
          
          // Count successful transactions (paid, partially_paid, overpaid)
          const successfulTx = invoiceData.filter(invoice => 
            ['paid', 'partially_paid', 'overpaid'].includes(invoice.status)
          ).length;
          const successRate = totalTransactions > 0 ? (successfulTx / totalTransactions) * 100 : 0;
          
          // Count unique customers by email
          const uniqueCustomers = new Set(
            invoiceData
              .map(inv => inv.customer_email)
              .filter(email => email && email.trim() !== '')
          ).size;
          
          // Generate monthly trends from real data
          const monthlyTrends = generateMonthlyTrends(invoiceData);
          
          // Calculate monthly growth
          const currentMonth = new Date().getMonth();
          const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
          const currentYear = new Date().getFullYear();
          const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
          
          const currentMonthRevenue = invoiceData
            .filter(inv => {
              const invDate = new Date(inv.created_at);
              return invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear;
            })
            .reduce((sum, inv) => sum + (parseFloat(inv.total_amount?.toString() || '0') || 0), 0);
            
          const lastMonthRevenue = invoiceData
            .filter(inv => {
              const invDate = new Date(inv.created_at);
              return invDate.getMonth() === lastMonth && invDate.getFullYear() === lastMonthYear;
            })
            .reduce((sum, inv) => sum + (parseFloat(inv.total_amount?.toString() || '0') || 0), 0);
            
          const monthlyGrowth = lastMonthRevenue > 0 ? 
            ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

          // Update with real business data
          setData({
            businessMetrics: {
              totalRevenue,
              totalTransactions,
              newCustomers: uniqueCustomers,
              averageOrderValue,
              successRate,
              monthlyGrowth
            },
            monthlyTrends,
            performanceMetrics: calculatePerformanceMetrics(invoiceData)
          });
          
          console.log(`✅ Real business analytics loaded: ${totalTransactions} transactions, $${totalRevenue.toFixed(2)} revenue, ${uniqueCustomers} customers`);
        } else {
          console.log('No invoice data found for this merchant');
          setData(defaultData);
        }
      } catch (error) {
        console.error('Error loading invoice data:', error);
        setData(defaultData);
      }


    } catch (error) {
      console.error('Error loading merchant analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    if (userData?.auth_user_id) {
      loadMerchantAnalytics();
    }
  }, [userData?.auth_user_id]);


  // Function to generate revenue trend chart
  const renderRevenueChart = () => {
    if (!data.monthlyTrends || data.monthlyTrends.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-500">
          No revenue data available
        </div>
      );
    }
    
    const maxRevenue = Math.max(...data.monthlyTrends.map((item: MonthlyData) => item.revenue));
    
    if (maxRevenue === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-500">
          No revenue recorded yet
        </div>
      );
    }
    
    return (
      <div className="flex items-end h-64 gap-4 mt-4">
        {data.monthlyTrends.map((item: MonthlyData, index: number) => {
          const height = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
          return (
            <div key={index} className="flex flex-col items-center flex-1">
              <div 
                className="w-full bg-blue-500 rounded-t-md" 
                style={{ height: `${Math.max(height, 1)}%`, minHeight: '4px' }}
              ></div>
              <div className="mt-2 text-xs font-medium">{item.month}</div>
              <div className="text-xs text-gray-500">
                {item.revenue >= 1000 ? `$${(item.revenue / 1000).toFixed(1)}k` : `$${item.revenue.toFixed(0)}`}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Function to render performance metrics with circular progress
  const renderPerformanceMetrics = () => {
    const metrics = [
      { label: 'Order Completion', value: data.performanceMetrics.orderCompletion, color: 'text-green-600', bgColor: 'bg-green-500' },
      { label: 'Customer Satisfaction', value: data.performanceMetrics.customerSatisfaction, color: 'text-blue-600', bgColor: 'bg-blue-500' },
      { label: 'Return Rate', value: data.performanceMetrics.deliveryReturn, color: 'text-orange-600', bgColor: 'bg-orange-500', isNegative: true },
      { label: 'Cancel Rate', value: data.performanceMetrics.deliveryCancel, color: 'text-red-600', bgColor: 'bg-red-500', isNegative: true }
    ];

    return (
      <div className="grid grid-cols-2 gap-6 mt-4">
        {metrics.map((metric, index: number) => (
          <div key={index} className="text-center">
            <div className="relative w-20 h-20 mx-auto mb-2">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-gray-200"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={metric.color}
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${metric.value}, 100`}
                  strokeLinecap="round"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-lg font-bold ${metric.color}`}>{metric.value}%</span>
              </div>
            </div>
            <div className="text-sm font-medium text-gray-700">{metric.label}</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Analytics</h1>
          {merchantInfo && (
            <p className="text-gray-600">
              {merchantInfo.name} • Real-time business performance data
            </p>
          )}
        </div>
      </div>

      {/* Key Business Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold">${data.businessMetrics.totalRevenue.toLocaleString()}</p>
                <div className="flex items-center mt-1">
                  {data.businessMetrics.monthlyGrowth >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm ${
                    data.businessMetrics.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {data.businessMetrics.monthlyGrowth >= 0 ? '+' : ''}{data.businessMetrics.monthlyGrowth.toFixed(1)}%
                  </span>
                  <span className="text-sm text-gray-500 ml-1">vs last month</span>
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Transactions</p>
                <p className="text-2xl font-bold">{data.businessMetrics.totalTransactions}</p>
                <p className="text-sm text-gray-500 mt-1">This month</p>
              </div>
              <CreditCard className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">New Customers</p>
                <p className="text-2xl font-bold">{data.businessMetrics.newCustomers}</p>
                <p className="text-sm text-gray-500 mt-1">This month</p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg. Order Value</p>
                <p className="text-2xl font-bold">${data.businessMetrics.averageOrderValue.toFixed(2)}</p>
                <p className="text-sm text-gray-500 mt-1">{data.businessMetrics.successRate.toFixed(1)}% success rate</p>
              </div>
              <Target className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Monthly revenue performance over time</p>
          </CardHeader>
          <CardContent>
            {renderRevenueChart()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Business Performance</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Key performance indicators for your business</p>
          </CardHeader>
          <CardContent>
            {renderPerformanceMetrics()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
