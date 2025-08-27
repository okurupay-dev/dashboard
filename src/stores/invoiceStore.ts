import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type InvoiceStatus = 
  | 'draft' 
  | 'sent' 
  | 'viewed' 
  | 'pending_payment' 
  | 'paid' 
  | 'expired' 
  | 'canceled' 
  | 'underpaid' 
  | 'overpaid' 
  | 'refunded';

export type CurrencyMode = 'fiat' | 'crypto';
export type FiatCurrency = 'USD' | 'EUR' | 'JPY' | 'THB';
export type CryptoAsset = 'USDC' | 'USDT' | 'ADA' | 'SOL' | 'ETH' | 'BTC';
export type Chain = 'BASE' | 'ETHEREUM' | 'SOLANA' | 'CARDANO' | 'APTOS' | 'AVALANCHE';
export type FeePayer = 'merchant' | 'customer' | 'split';

export interface LineItem {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  tax_rate?: number;
  discount?: {
    type: 'flat' | 'percentage';
    value: number;
  };
}

export interface BillingAddress {
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  public_id: string;
  status: InvoiceStatus;
  
  // Details
  title?: string;
  description?: string;
  is_simple_amount: boolean;
  simple_amount?: number;
  line_items: LineItem[];
  
  // Payment
  currency_mode: CurrencyMode;
  fiat_currency?: FiatCurrency;
  amount_fiat?: number;
  crypto_asset?: CryptoAsset;
  chain?: Chain;
  amount_crypto?: number;
  price_lock_secs: number;
  min_confirmations: number;
  allow_partial: boolean;
  tip_suggestions: number[];
  tax_inclusive: boolean;
  invoice_discount?: {
    type: 'flat' | 'percentage';
    value: number;
  };
  
  // Customer
  customer_email: string;
  customer_name?: string;
  billing_address?: BillingAddress;
  cc_emails?: string[];
  
  // Settlement
  settlement_wallet_id: string;
  fee_payer: FeePayer;
  split_rule?: string;
  
  // Policy
  terms_url?: string;
  refund_policy_url?: string;
  restricted_jurisdictions: boolean;
  kyc_threshold?: number;
  
  // Computed totals
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  
  // Metadata
  created_at: string;
  updated_at: string;
  expires_at?: string;
  merchant_id: string;
  created_by: string;
  
  // Timeline events
  timeline: TimelineEvent[];
}

export interface TimelineEvent {
  id: string;
  type: 'created' | 'sent' | 'viewed' | 'pending_payment' | 'paid' | 'expired' | 'canceled' | 'refunded';
  timestamp: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface MockWallet {
  id: string;
  name: string;
  asset: string;
  balance: number;
  address: string;
}

interface InvoiceStore {
  invoices: Invoice[];
  mockWallets: MockWallet[];
  
  // Actions
  createInvoice: (invoice: Omit<Invoice, 'id' | 'invoice_number' | 'public_id' | 'created_at' | 'updated_at' | 'timeline'>) => Invoice;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  getInvoice: (id: string) => Invoice | undefined;
  getInvoiceByPublicId: (publicId: string) => Invoice | undefined;
  listInvoices: (filters?: {
    status?: InvoiceStatus;
    search?: string;
    date_from?: string;
    date_to?: string;
  }) => Invoice[];
  deleteInvoice: (id: string) => void;
  
  // Utility functions
  generateInvoiceNumber: () => string;
  generatePublicId: () => string;
  computeTotals: (invoice: Partial<Invoice>) => {
    subtotal: number;
    tax_amount: number;
    discount_amount: number;
    total_amount: number;
  };
  addTimelineEvent: (invoiceId: string, event: Omit<TimelineEvent, 'id' | 'timestamp'>) => void;
  
  // Mock actions
  sendInvoice: (id: string) => void;
  cancelInvoice: (id: string) => void;
  markAsPaid: (id: string) => void;
  copyPayLink: (id: string) => string;
}

// Generate mock wallets
const generateMockWallets = (): MockWallet[] => [
  {
    id: 'wallet_1',
    name: 'Main USDC Wallet',
    asset: 'USDC',
    balance: 15420.50,
    address: '0x742d35Cc6634C0532925a3b8D4C0532925a3b8D4'
  },
  {
    id: 'wallet_2',
    name: 'ETH Settlement',
    asset: 'ETH',
    balance: 8.75,
    address: '0x8ba1f109551bD432803012645Hac189451b934'
  },
  {
    id: 'wallet_3',
    name: 'SOL Payments',
    asset: 'SOL',
    balance: 245.30,
    address: 'DjVE6JNiYqPL2QXyCUUh8rNjHrbz6h9xwGSsADNiYqPL'
  }
];

// Generate seed invoices
const generateSeedInvoices = (): Invoice[] => {
  const now = new Date();
  const baseInvoice = {
    merchant_id: 'merchant_1',
    created_by: 'user_1',
    is_simple_amount: true,
    currency_mode: 'fiat' as CurrencyMode,
    fiat_currency: 'USD' as FiatCurrency,
    price_lock_secs: 900,
    min_confirmations: 1,
    allow_partial: false,
    tip_suggestions: [0, 10, 15],
    tax_inclusive: false,
    fee_payer: 'merchant' as FeePayer,
    restricted_jurisdictions: false,
    line_items: [],
    settlement_wallet_id: 'wallet_1'
  };

  return [
    {
      ...baseInvoice,
      id: 'inv_1',
      invoice_number: 'OKU-2025-000001',
      public_id: 'okuru_7FQ2K',
      status: 'paid' as InvoiceStatus,
      title: 'Website Development Services',
      description: 'Custom website development and design services',
      simple_amount: 2500.00,
      amount_fiat: 2500.00,
      customer_email: 'john.doe@example.com',
      customer_name: 'John Doe',
      subtotal: 2500.00,
      tax_amount: 0,
      discount_amount: 0,
      total_amount: 2500.00,
      created_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      timeline: [
        {
          id: 'evt_1',
          type: 'created',
          timestamp: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          description: 'Invoice created'
        },
        {
          id: 'evt_2',
          type: 'sent',
          timestamp: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 300000).toISOString(),
          description: 'Invoice sent to customer'
        },
        {
          id: 'evt_3',
          type: 'viewed',
          timestamp: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
          description: 'Customer viewed invoice'
        },
        {
          id: 'evt_4',
          type: 'paid',
          timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          description: 'Payment received and confirmed'
        }
      ]
    },
    {
      ...baseInvoice,
      id: 'inv_2',
      invoice_number: 'OKU-2025-000002',
      public_id: 'okuru_8GH3L',
      status: 'sent' as InvoiceStatus,
      title: 'Monthly Consulting',
      simple_amount: 1200.00,
      amount_fiat: 1200.00,
      customer_email: 'sarah.smith@company.com',
      customer_name: 'Sarah Smith',
      subtotal: 1200.00,
      tax_amount: 0,
      discount_amount: 0,
      total_amount: 1200.00,
      created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      timeline: [
        {
          id: 'evt_5',
          type: 'created',
          timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          description: 'Invoice created'
        },
        {
          id: 'evt_6',
          type: 'sent',
          timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 600000).toISOString(),
          description: 'Invoice sent to customer'
        }
      ]
    },
    {
      ...baseInvoice,
      id: 'inv_3',
      invoice_number: 'OKU-2025-000003',
      public_id: 'okuru_9JK4M',
      status: 'draft' as InvoiceStatus,
      title: 'Product Design Package',
      simple_amount: 3500.00,
      amount_fiat: 3500.00,
      customer_email: 'mike.johnson@startup.io',
      customer_name: 'Mike Johnson',
      subtotal: 3500.00,
      tax_amount: 0,
      discount_amount: 0,
      total_amount: 3500.00,
      created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      timeline: [
        {
          id: 'evt_7',
          type: 'created',
          timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          description: 'Invoice created'
        }
      ]
    }
  ];
};

export const useInvoiceStore = create<InvoiceStore>()(
  persist(
    (set, get) => ({
      invoices: generateSeedInvoices(),
      mockWallets: generateMockWallets(),

      generateInvoiceNumber: () => {
        const year = new Date().getFullYear();
        const existingNumbers = get().invoices
          .map(inv => inv.invoice_number)
          .filter(num => num.startsWith(`OKU-${year}-`))
          .map(num => parseInt(num.split('-')[2]))
          .filter(num => !isNaN(num));
        
        const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
        return `OKU-${year}-${nextNumber.toString().padStart(6, '0')}`;
      },

      generatePublicId: () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = 'okuru_';
        for (let i = 0; i < 5; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      },

      computeTotals: (invoice) => {
        let subtotal = 0;
        let tax_amount = 0;
        let discount_amount = 0;

        if (invoice.is_simple_amount && invoice.simple_amount) {
          subtotal = invoice.simple_amount;
        } else if (invoice.line_items) {
          invoice.line_items.forEach(item => {
            const lineTotal = item.quantity * item.unit_price;
            subtotal += lineTotal;
            
            if (item.tax_rate) {
              tax_amount += lineTotal * (item.tax_rate / 100);
            }
            
            if (item.discount) {
              if (item.discount.type === 'flat') {
                discount_amount += item.discount.value;
              } else {
                discount_amount += lineTotal * (item.discount.value / 100);
              }
            }
          });
        }

        // Apply invoice-level discount
        if (invoice.invoice_discount) {
          if (invoice.invoice_discount.type === 'flat') {
            discount_amount += invoice.invoice_discount.value;
          } else {
            discount_amount += subtotal * (invoice.invoice_discount.value / 100);
          }
        }

        const total_amount = subtotal + tax_amount - discount_amount;

        return {
          subtotal,
          tax_amount,
          discount_amount,
          total_amount: Math.max(0, total_amount)
        };
      },

      createInvoice: (invoiceData) => {
        const now = new Date().toISOString();
        const totals = get().computeTotals(invoiceData);
        
        const invoice: Invoice = {
          ...invoiceData,
          id: `inv_${Date.now()}`,
          invoice_number: get().generateInvoiceNumber(),
          public_id: get().generatePublicId(),
          created_at: now,
          updated_at: now,
          ...totals,
          timeline: [
            {
              id: `evt_${Date.now()}`,
              type: 'created',
              timestamp: now,
              description: 'Invoice created'
            }
          ]
        };

        set(state => ({
          invoices: [...state.invoices, invoice]
        }));

        return invoice;
      },

      updateInvoice: (id, updates) => {
        set(state => ({
          invoices: state.invoices.map(invoice => {
            if (invoice.id === id) {
              const updatedInvoice = { ...invoice, ...updates, updated_at: new Date().toISOString() };
              const totals = get().computeTotals(updatedInvoice);
              return { ...updatedInvoice, ...totals };
            }
            return invoice;
          })
        }));
      },

      getInvoice: (id) => {
        return get().invoices.find(invoice => invoice.id === id);
      },

      listInvoices: (filters) => {
        let invoices = get().invoices;

        if (filters?.status) {
          invoices = invoices.filter(inv => inv.status === filters.status);
        }

        if (filters?.search) {
          const search = filters.search.toLowerCase();
          invoices = invoices.filter(inv => 
            inv.invoice_number.toLowerCase().includes(search) ||
            inv.customer_email.toLowerCase().includes(search) ||
            inv.customer_name?.toLowerCase().includes(search) ||
            inv.title?.toLowerCase().includes(search)
          );
        }

        if (filters?.date_from) {
          invoices = invoices.filter(inv => inv.created_at >= filters.date_from!);
        }

        if (filters?.date_to) {
          invoices = invoices.filter(inv => inv.created_at <= filters.date_to!);
        }

        return invoices.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      },

      deleteInvoice: (id) => {
        set(state => ({
          invoices: state.invoices.filter(invoice => invoice.id !== id)
        }));
      },

      addTimelineEvent: (invoiceId, event) => {
        const timelineEvent: TimelineEvent = {
          ...event,
          id: `evt_${Date.now()}`,
          timestamp: new Date().toISOString()
        };

        set(state => ({
          invoices: state.invoices.map(invoice => {
            if (invoice.id === invoiceId) {
              return {
                ...invoice,
                timeline: [...invoice.timeline, timelineEvent],
                updated_at: new Date().toISOString()
              };
            }
            return invoice;
          })
        }));
      },

      sendInvoice: (id) => {
        get().updateInvoice(id, { status: 'sent' });
        get().addTimelineEvent(id, {
          type: 'sent',
          description: 'Invoice sent to customer'
        });
      },

      cancelInvoice: (id) => {
        get().updateInvoice(id, { status: 'canceled' });
        get().addTimelineEvent(id, {
          type: 'canceled',
          description: 'Invoice canceled'
        });
      },

      markAsPaid: (id) => {
        get().updateInvoice(id, { status: 'paid' });
        get().addTimelineEvent(id, {
          type: 'paid',
          description: 'Payment received and confirmed'
        });
      },

      copyPayLink: (id: string) => {
        const invoice = get().invoices.find(inv => inv.id === id);
        if (invoice) {
          const link = `https://pay.okuru.com/invoice/${invoice.public_id}`;
          return link;
        }
        return '';
      },

      getInvoiceByPublicId: (publicId: string) => {
        return get().invoices.find(inv => inv.public_id === publicId);
      },
    }),
    {
      name: 'invoice-store',
      partialize: (state) => ({ 
        invoices: state.invoices,
        mockWallets: state.mockWallets 
      })
    }
  )
);
