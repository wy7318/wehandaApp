/*
  # Add app_owner column to profiles table

  1. Changes
    - Add app_owner boolean column to profiles table with default false
    - Only allow backend to modify this column (no RLS policy for update)
*/

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS app_owner boolean DEFAULT false;

-- No RLS policy for app_owner column to ensure it's only modifiable from backend