import { create } from "zustand";

type User = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "employee";
};

type AuthState = {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
};

const key = "hris_admin_auth";

const saved = localStorage.getItem(key);
const initial = saved ? JSON.parse(saved) : { token: null, user: null };

export const useAuthStore = create<AuthState>((set) => ({
  token: initial.token,
  user: initial.user,
  setAuth: (token, user) => {
    localStorage.setItem(key, JSON.stringify({ token, user }));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem(key);
    set({ token: null, user: null });
  },
}));
