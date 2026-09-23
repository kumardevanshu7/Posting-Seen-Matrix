import { createClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  bucketName: string;
}

export const supabaseConfig: SupabaseConfig = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || "",
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
  bucketName: import.meta.env.VITE_SUPABASE_BUCKET_NAME || "reel-thumbnails",
};

export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseConfig.supabaseUrl &&
    supabaseConfig.supabaseAnonKey &&
    supabaseConfig.supabaseUrl.startsWith("https://") &&
    !supabaseConfig.supabaseUrl.includes("your-project")
  );
}

export const supabase = isSupabaseConfigured()
  ? createClient(supabaseConfig.supabaseUrl, supabaseConfig.supabaseAnonKey)
  : null;
