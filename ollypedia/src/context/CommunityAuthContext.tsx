"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import toast from "react-hot-toast";

export interface CommunityUserSession {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatar: string;
  bio?: string;
  role: string;
  status: string;
  joinedAt: string;
  discussionCount: number;
  commentCount: number;
  voteCount: number;
  likesReceived: number;
}

interface CommunityAuthContextType {
  user: CommunityUserSession | null;
  loading: boolean;
  isAuthModalOpen: boolean;
  authModalMode: "login" | "signup";
  openAuthModal: (mode?: "login" | "signup") => void;
  closeAuthModal: () => void;
  isTourOpen: boolean;
  openTour: () => void;
  closeTour: () => void;
  login: (identifier: string, password: string) => Promise<boolean>;
  register: (
    username: string,
    displayName: string,
    email: string,
    password: string
  ) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (updatedData: Partial<CommunityUserSession>) => void;
  refreshUser: () => Promise<void>;
}

const CommunityAuthContext = createContext<CommunityAuthContextType | undefined>(
  undefined
);

export function CommunityAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<CommunityUserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "signup">("login");
  const [isTourOpen, setIsTourOpen] = useState(false);

  const openAuthModal = useCallback((mode: "login" | "signup" = "login") => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const openTour = useCallback(() => {
    setIsTourOpen(true);
  }, []);

  const closeTour = useCallback(() => {
    setIsTourOpen(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("ollypedia_community_tour_seen", "true");
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/community/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (identifier: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/community/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || "Failed to log in.");
        return false;
      }
      setUser(data.user);
      toast.success(data.message || `Welcome back, ${data.user.displayName}!`);
      closeAuthModal();
      return true;
    } catch (err: any) {
      toast.error(err.message || "Network error during login.");
      return false;
    }
  };

  const register = async (
    username: string,
    displayName: string,
    email: string,
    password: string
  ): Promise<boolean> => {
    try {
      const res = await fetch("/api/community/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, displayName, email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || "Registration failed.");
        return false;
      }
      setUser(data.user);
      toast.success(data.message || "Welcome to Ollypedia Community!");
      closeAuthModal();
      return true;
    } catch (err: any) {
      toast.error(err.message || "Network error during registration.");
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/community/auth/logout", { method: "POST" });
      setUser(null);
      toast.success("Logged out successfully.");
    } catch {
      setUser(null);
    }
  };

  const updateUser = (updatedData: Partial<CommunityUserSession>) => {
    if (user) {
      setUser({ ...user, ...updatedData });
    }
  };

  return (
    <CommunityAuthContext.Provider
      value={{
        user,
        loading,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        isTourOpen,
        openTour,
        closeTour,
        login,
        register,
        logout,
        updateUser,
        refreshUser,
      }}
    >
      {children}
    </CommunityAuthContext.Provider>
  );
}

export function useCommunityAuth() {
  const context = useContext(CommunityAuthContext);
  if (!context) {
    throw new Error(
      "useCommunityAuth must be used within a CommunityAuthProvider"
    );
  }
  return context;
}
