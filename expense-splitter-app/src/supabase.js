import { createClient } from '@supabase/supabase-js'

// TODO: Replace with your Supabase project URL and Anon Key
const supabaseUrl = 'https://zgykugrvbfteuzxyxoot.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpneWt1Z3J2YmZ0ZXV6eHl4b290Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNjYzODksImV4cCI6MjA3OTc0MjM4OX0.REO1YHmLdW_hQMZcZ97q6vdfij_kfumSniqvaPtxJhs'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
