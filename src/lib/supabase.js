import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ppoccqcxbiqoggcutjrn.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwb2NjcWN4Ymlxb2dnY3V0anJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NTYxNDcsImV4cCI6MjA4MTAzMjE0N30.yWjlNPrPsUyLnAQyNv1VlENFWnnJ40XvOCASFRwtghA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
