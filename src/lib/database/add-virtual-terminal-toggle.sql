-- Add virtual terminal enabled/disabled toggle to merchants table
-- This allows merchants to completely disable virtual terminal access

ALTER TABLE public.merchants 
ADD COLUMN virtual_terminal_enabled BOOLEAN DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN public.merchants.virtual_terminal_enabled IS 'Controls whether virtual terminals are enabled for this merchant. When false, all virtual terminal login attempts are blocked.';

-- Update existing merchants to have virtual terminals enabled by default
UPDATE public.merchants 
SET virtual_terminal_enabled = true 
WHERE virtual_terminal_enabled IS NULL;

-- Add index for performance when checking virtual terminal status
CREATE INDEX idx_merchants_virtual_terminal_enabled 
ON public.merchants(virtual_terminal_enabled) 
WHERE virtual_terminal_enabled = true;
