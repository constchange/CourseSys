import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { AppProvider, useAppStore } from './store.tsx';
import Login from './components/Login';
import PersonManager from './components/PersonManager';
import CourseManager from './components/CourseManager';
import SessionManager from './components/SessionManager';
import ScheduleStats from './components/ScheduleStats';
import { Users, GraduationCap, BookOpen, Clock, Calendar, LogOut, Loader2, ShieldAlert } from 'lucide-react';

type Tab = 'teachers' | 'assistants' | 'courses' | 'sessions' | 'schedule';

// 内部组件：主界面
const Dashboard: React.FC<{ session: any; isDebug?: boolean; onLogout: () => void }> = ({ session, isDebug, onLogout }) => {
  const [activeTab, setActiveTab] = useState<Tab>('teachers');
  const { isLoading } = useAppStore();

  const navItems = [
    { id: 'teachers', label: 'Teachers', icon: Users },
    { id: 'assistants', label: 'Teaching Assistants', icon: GraduationCap },
    { id: 'courses', label: 'Courses', icon: BookOpen },
    { id: 'sessions', label: 'Sessions', icon: Clock },
    { id: 'schedule', label: 'Schedule & Stats', icon: Calendar },
  ];

  if (isLoading) {
      return (
          <div className="h-screen flex items-center justify-center bg-slate-100 flex-col gap-4">
              <Loader2 className="animate-spin text-indigo-600" size={48} />
              <div className="text-slate-500 font-medium">正在同步云端数据...</div>
          </div>
      )
  }

  return (
      <div className="flex h-screen bg-slate-100 text-slate-800 font-sans">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900 text-white flex flex-col flex-shrink-0 transition-all">
          <div className="p-6 border-b border-slate-800">
            <h1 className="text-xl font-bold tracking-tight">EduTrack Pro</h1>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              {isDebug ? <span className="text-amber-400 flex items-center gap-1"><ShieldAlert size={10}/> Debug Mode</span> : 'Cloud Edition'}
            </p>
          </div>
          
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as Tab)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === item.id 
                      ? 'bg-indigo-600 text-white shadow-lg' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
          
          <div className="p-4 border-t border-slate-800">
             <div className="text-xs text-slate-500 mb-2 truncate" title={session.user.email}>{session.user.email}</div>
             <button onClick={onLogout} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm w-full transition-colors">
                 <LogOut size={16} /> {isDebug ? '退出调试' : '退出登录'}
             </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 overflow-hidden h-full">
          <div className="h-full max-w-7xl mx-auto">
            {activeTab === 'teachers' && <PersonManager type="Teacher" />}
            {activeTab === 'assistants' && <PersonManager type="TA" />}
            {activeTab === 'courses' && <CourseManager />}
            {activeTab === 'sessions' && <SessionManager />}
            {activeTab === 'schedule' && <ScheduleStats />}
          </div>
        </main>
      </div>
  );
};

// 根组件：处理 Auth 状态
const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [debugSession, setDebugSession] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // 1. 检查当前是否已登录
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setCheckingAuth(false);
    });

    // 2. 监听登录/登出变化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // 如果真的登录了，清除 debug session
      if (session) setDebugSession(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    if (debugSession) {
      setDebugSession(null);
    } else {
      await supabase.auth.signOut();
    }
  };

  const handleDebugLogin = () => {
    setDebugSession({
      user: {
        id: 'debug-user-id',
        email: 'debug@local.dev',
        role: 'authenticated'
      }
    });
  };

  if (checkingAuth) {
      return <div className="h-screen w-screen bg-slate-900 flex items-center justify-center text-white"><Loader2 className="animate-spin" /></div>;
  }

  const activeSession = session || debugSession;

  if (!activeSession) {
    return <Login onDebugLogin={handleDebugLogin} />;
  }

  return (
    <AppProvider>
      <Dashboard 
        session={activeSession} 
        isDebug={!!debugSession} 
        onLogout={handleLogout}
      />
    </AppProvider>
  );
};

export default App;