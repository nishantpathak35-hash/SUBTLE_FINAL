import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  role: string;
}

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  isLoading: true,
  setIsLoading: (loading) => set({ isLoading: loading }),
}));
