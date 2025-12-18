import { createClient } from '@supabase/supabase-js';

// 为了确保在你的环境中绝对可用，我将Key作为默认值填入
// 这样即使 import.meta.env 读取失败，程序也能正常运行
const FALLBACK_URL = 'https://txhzycwvdyvbnlmujnvy.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4aHp5Y3d2ZHl2Ym5sbXVqbnZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNDE3MjgsImV4cCI6MjA4MTYxNzcyOH0.SPesQ8jVuxTEuFwv2216qzC6noClpz3gwEgknBV2fPs';

const getEnv = (key: string) => {
  try {
    // 尝试安全读取
    return (import.meta as any)?.env?.[key];
  } catch (e) {
    return undefined;
  }
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL') || FALLBACK_URL;
const supabaseKey = getEnv('VITE_SUPABASE_KEY') || FALLBACK_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);