import { create } from 'zustand';
import { Role, ScanResult, Notice, Locale } from '../mock/data';

interface AppState {
  role: Role;
  setRole: (role: Role) => void;
  isAuthenticated: boolean;
  login: (role: Role) => void;
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

export const useAppStore = create<AppState>((set) => ({
  role: 'USER',
  setRole: (role) => set({ role }),
  
  isAuthenticated: false,
  login: (role) => set({ isAuthenticated: true, role }),
  logout: () => set({ isAuthenticated: false, role: 'USER' }),
  
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
}));
