-- Migration: Add merchant_documents table for legal document storage
-- Created: 2025-08-19
-- Purpose: Store metadata for merchant legal documents (agreements, disclosures, etc.)

-- Create merchant_documents table
CREATE TABLE public.merchant_documents (
    document_id uuid NOT NULL DEFAULT uuid_generate_v4(),
    merchant_id uuid NOT NULL,
    document_type character varying(100) NOT NULL,
    document_title character varying(255) NOT NULL,
    document_description text,
    file_url text NOT NULL,
    file_size integer,
    mime_type character varying(100) DEFAULT 'application/pdf',
    version character varying(20) NOT NULL,
    signed_date timestamp with time zone,
    effective_date timestamp with time zone,
    signed_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    
    -- Primary key
    CONSTRAINT merchant_documents_pkey PRIMARY KEY (document_id),
    
    -- Foreign key constraints
    CONSTRAINT merchant_documents_merchant_id_fkey 
        FOREIGN KEY (merchant_id) REFERENCES public.merchants(merchant_id) ON DELETE CASCADE,
    CONSTRAINT merchant_documents_signed_by_user_id_fkey 
        FOREIGN KEY (signed_by_user_id) REFERENCES public.users(user_id) ON DELETE SET NULL,
    
    -- Check constraints
    CONSTRAINT merchant_documents_document_type_check 
        CHECK (document_type::text = ANY (ARRAY[
            'merchant_agreement'::character varying,
            'crypto_disclosure'::character varying,
            'privacy_policy'::character varying,
            'terms_of_service'::character varying,
            'kyc_document'::character varying,
            'compliance_certificate'::character varying,
            'other'::character varying
        ]::text[])),
    CONSTRAINT merchant_documents_mime_type_check 
        CHECK (mime_type::text = ANY (ARRAY[
            'application/pdf'::character varying,
            'application/msword'::character varying,
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'::character varying,
            'text/plain'::character varying
        ]::text[]))
);

-- Create indexes for better query performance
CREATE INDEX idx_merchant_documents_merchant_id ON public.merchant_documents(merchant_id);
CREATE INDEX idx_merchant_documents_type ON public.merchant_documents(document_type);
CREATE INDEX idx_merchant_documents_active ON public.merchant_documents(is_active) WHERE is_active = true;
CREATE INDEX idx_merchant_documents_signed_date ON public.merchant_documents(signed_date);

-- Create unique constraint to prevent duplicate active documents of same type per merchant
CREATE UNIQUE INDEX idx_merchant_documents_unique_active_type 
    ON public.merchant_documents(merchant_id, document_type) 
    WHERE is_active = true;

-- Add RLS (Row Level Security) policies
ALTER TABLE public.merchant_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see documents for their own merchant
CREATE POLICY "Users can view their merchant's documents" ON public.merchant_documents
    FOR SELECT USING (
        merchant_id IN (
            SELECT merchant_id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

-- Policy: Only admins can insert documents (typically done by Okuru admin)
CREATE POLICY "Admins can insert documents" ON public.merchant_documents
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub' 
            AND role IN ('okuru_admin', 'admin')
        )
    );

-- Policy: Only admins can update documents
CREATE POLICY "Admins can update documents" ON public.merchant_documents
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub' 
            AND role IN ('okuru_admin', 'admin')
        )
    );

-- Policy: Only Okuru admins can delete documents
CREATE POLICY "Okuru admins can delete documents" ON public.merchant_documents
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub' 
            AND role = 'okuru_admin'
        )
    );

-- Insert sample documents for existing merchants (optional - for testing)
-- Note: Replace with actual document URLs when implementing file storage
INSERT INTO public.merchant_documents (
    merchant_id, 
    document_type, 
    document_title, 
    document_description, 
    file_url, 
    version, 
    signed_date, 
    effective_date
) 
SELECT 
    m.merchant_id,
    'merchant_agreement',
    'Okurupay Merchant Agreement',
    'Terms and conditions for merchant services, payment processing, and platform usage.',
    '/documents/merchant-agreement-v2.1.pdf',
    '2.1',
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '30 days'
FROM public.merchants m
WHERE m.status = 'active'
ON CONFLICT DO NOTHING;

INSERT INTO public.merchant_documents (
    merchant_id, 
    document_type, 
    document_title, 
    document_description, 
    file_url, 
    version, 
    signed_date, 
    effective_date
) 
SELECT 
    m.merchant_id,
    'crypto_disclosure',
    'Okurupay Crypto Disclosure Document',
    'Important disclosures regarding cryptocurrency transactions, risks, and regulatory compliance.',
    '/documents/crypto-disclosure-v1.3.pdf',
    '1.3',
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '30 days'
FROM public.merchants m
WHERE m.status = 'active'
ON CONFLICT DO NOTHING;

INSERT INTO public.merchant_documents (
    merchant_id, 
    document_type, 
    document_title, 
    document_description, 
    file_url, 
    version, 
    signed_date, 
    effective_date
) 
SELECT 
    m.merchant_id,
    'privacy_policy',
    'Privacy Policy',
    'How we collect, use, and protect your personal and business information.',
    '/documents/privacy-policy-v3.0.pdf',
    '3.0',
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '30 days'
FROM public.merchants m
WHERE m.status = 'active'
ON CONFLICT DO NOTHING;

INSERT INTO public.merchant_documents (
    merchant_id, 
    document_type, 
    document_title, 
    document_description, 
    file_url, 
    version, 
    signed_date, 
    effective_date
) 
SELECT 
    m.merchant_id,
    'terms_of_service',
    'Terms of Service',
    'General terms governing your use of the Okurupay platform and services.',
    '/documents/terms-of-service-v2.5.pdf',
    '2.5',
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '30 days'
FROM public.merchants m
WHERE m.status = 'active'
ON CONFLICT DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE public.merchant_documents IS 'Stores metadata for merchant legal documents and agreements';
COMMENT ON COLUMN public.merchant_documents.document_type IS 'Type of document: merchant_agreement, crypto_disclosure, privacy_policy, terms_of_service, etc.';
COMMENT ON COLUMN public.merchant_documents.file_url IS 'URL to the actual document file (stored in cloud storage)';
COMMENT ON COLUMN public.merchant_documents.signed_by_user_id IS 'User who signed the document on behalf of the merchant';
COMMENT ON COLUMN public.merchant_documents.is_active IS 'Whether this document version is currently active';
