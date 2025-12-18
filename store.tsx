import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { AppState, Course, Person, Session, ScheduleParams } from './types';

interface AppContextType extends AppState {
  addPerson: (p: Person) => void;
  updatePerson: (p: Person) => void;
  deletePerson: (id: string) => void;
  addCourse: (c: Course) => void;
  updateCourse: (c: Course) => void;
  deleteCourse: (id: string) => void;
  addSession: (s: Session) => void;
  updateSession: (s: Session) => void;
  deleteSession: (id: string) => void;
  importData: (type: 'teachers' | 'assistants' | 'courses' | 'sessions', data: any[], mode: 'append' | 'replace') => void;
  updateScheduleParams: (params: Partial<ScheduleParams>) => void;
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialState: AppState = {
  teachers: [],
  assistants: [],
  courses: [],
  sessions: [],
  scheduleParams: {
    startMonth: new Date().toISOString().slice(0, 7),
    endMonth: '',
    selectedPersonId: ''
  }
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(initialState);
  const [isLoading, setIsLoading] = useState(true);

  // --- 初始化加载数据 (READ) ---
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // 并行请求三个表的数据
        const [peopleRes, coursesRes, sessionsRes] = await Promise.all([
          supabase.from('people').select('*'),
          supabase.from('courses').select('*'),
          supabase.from('sessions').select('*')
        ]);

        // 注意：如果允许匿名读取，这些应该能成功。如果 RLS 禁止读取，这里会报错。
        // 但为了 Debug 模式体验，如果读取失败，我们仅 log 错误，不阻断 UI 渲染（使用空数据或 Mock 数据）
        
        const people = (peopleRes.data as Person[]) || [];
        const coursesRaw = (coursesRes.data as Course[]) || [];
        const sessions = (sessionsRes.data as Session[]) || [];

        // 重新计算课程统计数据
        const courses = coursesRaw.map(c => {
             const cSessions = sessions.filter(s => s.courseId === c.id);
             const totalHours = cSessions.reduce((sum, s) => sum + (Number(s.durationHours) || 0), 0);
             return {
                 ...c,
                 sessionCount: cSessions.length,
                 totalHours: parseFloat(totalHours.toFixed(2))
             };
        });

        setState(prev => ({
          ...prev,
          teachers: people.filter(p => p.type === 'Teacher'),
          assistants: people.filter(p => p.type === 'TA'),
          courses: courses,
          sessions: sessions
        }));
        
        if (peopleRes.error) console.warn("Fetch People Error (Cloud):", peopleRes.error);
        if (coursesRes.error) console.warn("Fetch Courses Error (Cloud):", coursesRes.error);
        if (sessionsRes.error) console.warn("Fetch Sessions Error (Cloud):", sessionsRes.error);

      } catch (error: any) {
        console.error("数据加载失败:", error);
        // 不 alert，以免在未配置好 DB 时打扰用户
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- 辅助函数：更新本地 Course 统计 ---
  const recalculateCourseStats = (courses: Course[], sessions: Session[], courseId: string): Course[] => {
    return courses.map(c => {
      if (c.id !== courseId) return c;
      const courseSessions = sessions.filter(s => s.courseId === courseId);
      const totalHours = courseSessions.reduce((sum, s) => sum + (Number(s.durationHours) || 0), 0);
      return {
        ...c,
        sessionCount: courseSessions.length,
        totalHours: parseFloat(totalHours.toFixed(2))
      };
    });
  };

  // --- 人员管理 (Person) ---
  const addPerson = async (p: Person) => {
    // 1. 乐观更新
    if (p.type === 'Teacher') {
      setState(prev => ({ ...prev, teachers: [...prev.teachers, p] }));
    } else {
      setState(prev => ({ ...prev, assistants: [...prev.assistants, p] }));
    }
    // 2. 发送给 Supabase
    const { error } = await supabase.from('people').insert([p]);
    if (error) console.error("Add Person Error (Cloud):", error);
  };

  const updatePerson = async (p: Person) => {
    if (p.type === 'Teacher') {
      setState(prev => ({ ...prev, teachers: prev.teachers.map(t => t.id === p.id ? p : t) }));
    } else {
      setState(prev => ({ ...prev, assistants: prev.assistants.map(a => a.id === p.id ? p : a) }));
    }
    const { id, ...updates } = p;
    const { error } = await supabase.from('people').update(updates).eq('id', id);
    if (error) console.error("Update Person Error (Cloud):", error);
  };

  const deletePerson = async (id: string) => {
    setState(prev => ({
      ...prev,
      teachers: prev.teachers.filter(t => t.id !== id),
      assistants: prev.assistants.filter(a => a.id !== id)
    }));
    const { error } = await supabase.from('people').delete().eq('id', id);
    if (error) console.error("Delete Person Error (Cloud):", error);
  };

  // --- 课程管理 (Course) ---
  const addCourse = async (c: Course) => {
    setState(prev => ({ ...prev, courses: [...prev.courses, c] }));
    const { error } = await supabase.from('courses').insert([c]);
    if (error) console.error("Add Course Error (Cloud):", error);
  };

  const updateCourse = async (c: Course) => {
    setState(prev => ({ ...prev, courses: prev.courses.map(x => x.id === c.id ? c : x) }));
    const { id, ...updates } = c;
    const { error } = await supabase.from('courses').update(updates).eq('id', id);
    if (error) console.error("Update Course Error (Cloud):", error);
  };
  
  const deleteCourse = async (id: string) => {
    setState(prev => ({ 
      ...prev, 
      courses: prev.courses.filter(x => x.id !== id),
      sessions: prev.sessions.filter(s => s.courseId !== id) 
    }));
    await supabase.from('sessions').delete().eq('courseId', id);
    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (error) console.error("Delete Course Error (Cloud):", error);
  };

  // --- 课节管理 (Session) ---
  const addSession = async (s: Session) => {
    setState(prev => {
      const newSessions = [...prev.sessions, s];
      const updatedCourses = recalculateCourseStats(prev.courses, newSessions, s.courseId);
      return { ...prev, sessions: newSessions, courses: updatedCourses };
    });
    const { error } = await supabase.from('sessions').insert([s]);
    if (error) console.error("Add Session Error (Cloud):", error);
  };

  const updateSession = async (s: Session) => {
    setState(prev => {
      const oldSession = prev.sessions.find(x => x.id === s.id);
      const newSessions = prev.sessions.map(x => x.id === s.id ? s : x);
      let updatedCourses = recalculateCourseStats(prev.courses, newSessions, s.courseId);
      if (oldSession && oldSession.courseId !== s.courseId) {
          updatedCourses = recalculateCourseStats(updatedCourses, newSessions, oldSession.courseId);
      }
      return { ...prev, sessions: newSessions, courses: updatedCourses };
    });
    const { id, ...updates } = s;
    const { error } = await supabase.from('sessions').update(updates).eq('id', id);
    if (error) console.error("Update Session Error (Cloud):", error);
  };

  const deleteSession = async (id: string) => {
    setState(prev => {
      const sessionToDelete = prev.sessions.find(s => s.id === id);
      const newSessions = prev.sessions.filter(x => x.id !== id);
      let updatedCourses = prev.courses;
      if (sessionToDelete) {
         updatedCourses = recalculateCourseStats(prev.courses, newSessions, sessionToDelete.courseId);
      }
      return { ...prev, sessions: newSessions, courses: updatedCourses };
    });
    const { error } = await supabase.from('sessions').delete().eq('id', id);
    if (error) console.error("Delete Session Error (Cloud):", error);
  };

  const updateScheduleParams = (params: Partial<ScheduleParams>) => {
      setState(prev => ({
          ...prev,
          scheduleParams: { ...prev.scheduleParams, ...params }
      }));
  }

  // --- 数据导入 (Batch) ---
  const importData = async (type: 'teachers' | 'assistants' | 'courses' | 'sessions', data: any[], mode: 'append' | 'replace') => {
    // 1. 预处理数据
    const processedData = data.map(item => {
        const newItem: any = {
            ...item,
            id: item.id || crypto.randomUUID(),
        };

        // Course/Session 特有字段：只在导入这类数据时添加
        if (type === 'courses' || type === 'sessions') {
            newItem.teacherIds = Array.isArray(item.teacherIds) ? item.teacherIds : (item.teacherIds ? [item.teacherIds] : []);
            newItem.assistantIds = Array.isArray(item.assistantIds) ? item.assistantIds : (item.assistantIds ? [item.assistantIds] : []);
        } else {
            // People (Teachers/TA): 确保移除这些字段，防止 Schema 错误
            delete newItem.teacherIds;
            delete newItem.assistantIds;
            // 移除可能意外混入的统计字段
            delete newItem.sessionCount;
            delete newItem.totalHours;
            delete newItem.sequence;
            delete newItem.durationHours;
        }

        // Session 特有字段
        if (type === 'sessions') {
            newItem.sequence = item.sequence ? Number(item.sequence) : 0;
            newItem.durationHours = item.durationHours ? Number(item.durationHours) : 0;
        } else {
             if (type !== 'courses') { // courses might have totalHours, but usually computed. safe to remove for people
                delete newItem.sequence;
                delete newItem.durationHours;
             }
        }

        // Course 特有初始化
        if (type === 'courses') {
            newItem.sessionCount = 0;
            newItem.totalHours = 0;
        }

        return newItem;
    });

    let tableName = '';
    if (type === 'teachers' || type === 'assistants') tableName = 'people';
    else if (type === 'courses') tableName = 'courses';
    else if (type === 'sessions') tableName = 'sessions';

    // 2. 更新本地 State (Optimistic)
    setState(prev => {
        let newState = { ...prev };
        
        if (type === 'teachers') {
             const newItems = processedData as Person[];
             if (mode === 'replace') newState.teachers = newItems;
             else newState.teachers = [...prev.teachers, ...newItems];
        } else if (type === 'assistants') {
             const newItems = processedData as Person[];
             if (mode === 'replace') newState.assistants = newItems;
             else newState.assistants = [...prev.assistants, ...newItems];
        } else if (type === 'courses') {
             const newItems = processedData as Course[];
             if (mode === 'replace') newState.courses = newItems;
             else newState.courses = [...prev.courses, ...newItems];
        } else if (type === 'sessions') {
             const newItems = processedData as Session[];
             if (mode === 'replace') newState.sessions = newItems;
             else newState.sessions = [...prev.sessions, ...newItems];
        }
        
        if (type === 'sessions') {
             newState.courses = newState.courses.map(c => {
                 const cSessions = newState.sessions.filter(s => s.courseId === c.id);
                 const totalHours = cSessions.reduce((sum, s) => sum + (Number(s.durationHours) || 0), 0);
                 return { ...c, sessionCount: cSessions.length, totalHours: parseFloat(totalHours.toFixed(2)) };
             });
        }

        return newState;
    });

    // 3. 尝试同步到云端
    try {
        if (mode === 'replace') {
            if (tableName === 'people') {
                const pType = type === 'teachers' ? 'Teacher' : 'TA';
                await supabase.from('people').delete().eq('type', pType);
            } else {
                await supabase.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000');
            }
        }

        const { error } = await supabase.from(tableName).insert(processedData);
        if (error) throw error;
        
    } catch (error: any) {
        console.error("Cloud Sync Error (Import):", error);
        
        let msg = 'Unknown Error';
        if (typeof error === 'string') msg = error;
        else if (error instanceof Error) msg = error.message;
        else if (typeof error === 'object' && error !== null) {
            msg = error.message || error.details || error.hint || (JSON.stringify(error) !== '{}' ? JSON.stringify(error) : 'Unknown Error Object');
        }

        setTimeout(() => {
            alert(`已导入到本地视图，但云端同步失败 (可能是权限或网络问题): ${msg}`);
        }, 100);
    }
  };

  return (
    <AppContext.Provider value={{
      ...state,
      addPerson, updatePerson, deletePerson,
      addCourse, updateCourse, deleteCourse,
      addSession, updateSession, deleteSession,
      importData, updateScheduleParams,
      isLoading
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppStore must be used within AppProvider");
  return context;
};