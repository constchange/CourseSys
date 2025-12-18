import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { LogIn, Loader2, Bug } from 'lucide-react';

interface Props {
  onDebugLogin?: () => void;
}

const Login: React.FC<Props> = ({ onDebugLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage({ text: '注册成功！请检查您的邮箱进行验证。如果无法打开链接，请使用下方的调试模式。', type: 'success' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        // Login successful, session state in App.tsx will update automatically
      }
    } catch (error: any) {
      setMessage({ text: error.message || '发生错误', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative z-10">
        <div className="bg-indigo-600 p-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">EduTrack Pro</h1>
          <p className="text-indigo-100">教务管理系统</p>
        </div>
        
        <div className="p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">
            {mode === 'signin' ? '账号登录' : '注册新账号'}
          </h2>

          {message && (
            <div className={`mb-4 p-3 rounded text-sm ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">邮箱地址</label>
              <input 
                type="email" 
                required
                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">密码</label>
              <input 
                type="password" 
                required
                minLength={6}
                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <LogIn size={20} />}
              {mode === 'signin' ? '登录' : '注册'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500 border-b border-slate-100 pb-4 mb-4">
            {mode === 'signin' ? (
              <p>还没有账号？ <button onClick={() => setMode('signup')} className="text-indigo-600 font-bold hover:underline">去注册</button></p>
            ) : (
              <p>已有账号？ <button onClick={() => setMode('signin')} className="text-indigo-600 font-bold hover:underline">去登录</button></p>
            )}
          </div>

          {onDebugLogin && (
            <div className="text-center">
              <button 
                type="button"
                onClick={onDebugLogin}
                className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 text-sm font-medium transition-colors"
              >
                <Bug size={16} />
                进入调试模式 (Skip Auth)
              </button>
              <p className="text-xs text-slate-400 mt-1">绕过邮箱验证直接进入系统 (Data saving may vary)</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;