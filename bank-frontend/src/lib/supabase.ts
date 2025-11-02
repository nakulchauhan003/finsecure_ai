import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bvsvixkgcbslhrgdkikm.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2c3ZpeGtnY2JzbGhyZ2RraWttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzMDkxNzMsImV4cCI6MjA3NTg4NTE3M30.oKgSkEBTP0hVcpZ54MPmh909NCb5d-O7Y2CCjXXtz0U'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
