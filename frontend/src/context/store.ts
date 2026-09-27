import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Role, ScanResult, Notice, Locale } from '../mock/data';

interface AppState {
  role: Role;
  setRole: (role: Role) => void;
  token: string | null;
  setToken: (token: string | null) => void;
  isAuthenticated: boolean;
  login: (role: Role, token: string) => void;
  logout: () => void;
  isInitialized: boolean;
  setInitialized: (val: boolean) => void;
  scans: ScanResult[];
  addScan: (scan: ScanResult) => void;
  setScans: (scans: ScanResult[]) => void;
  notices: Notice[];
  setNotices: (notices: Notice[]) => void;
  addNotice: (notice: Notice) => void;
  updateNoticeStatus: (noticeId: string, status: Notice['status']) => void;
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      role: 'USER',
      setRole: (role) => set({ role }),
      
      token: null,
      setToken: (token) => set({ token }),
      
      isAuthenticated: false,
      login: (role, token) => set({ isAuthenticated: true, role, token }),
      logout: () => set({ isAuthenticated: false, role: 'USER', token: null }),
      
      locale: 'en',
      setLocale: (locale) => set({ locale }),

      isInitialized: false,
      setInitialized: (val) => set({ isInitialized: val }),

      scans: [],
      addScan: (scan) => set((state) => ({ scans: [scan, ...state.scans] })),
      setScans: (scans) => set({ scans }),

      notices: [],
      setNotices: (notices) => set({ notices }),
      addNotice: (notice) => set((state) => ({ notices: [notice, ...state.notices] })),
      updateNoticeStatus: (id, status) => set((state) => ({
        notices: state.notices.map(n => n.id === id ? { ...n, status } : n)
      })),
    }),
    {
      name: 'labelcheck-store',
    }
  )
);
