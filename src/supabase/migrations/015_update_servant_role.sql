-- Update existing 'manager' roles to 'servant'
-- Note: 'manager' remains in the enum to prevent breaking existing type definitions
-- in case they are cached or used in history, but active rows are updated.
UPDATE public.staff 
SET role = 'servant' 
WHERE role = 'manager';
