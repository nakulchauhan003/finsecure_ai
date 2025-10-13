import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'REDACTED_SUPABASE_URL'
const supabaseAnonKey = 'REDACTED_SUPABASE_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)