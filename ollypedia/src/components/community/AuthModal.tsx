"use client";

import React, { useState } from "react";
import { useCommunityAuth } from "@/context/CommunityAuthContext";
import { X, Lock, Mail, User, Sparkles, LogIn, UserPlus } from "lucide-react";

export function AuthModal() {
  const {
    isAuthModalOpen,
    authModalMode,
    openAuthModal,
    closeAuthModal,
    login,
    register,
  } = useCommunityAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isAuthModalOpen) return null;

  const isLogin = authModalMode === "login";

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    if (!identifier.trim() || !password) {
      setErrorMessage("Please enter both username/email and password.");
      return;
    }
    setSubmitting(true);
    const success = await login(identifier, password);
    setSubmitting(false);
    if (!success) {
      setErrorMessage("Invalid credentials or account suspended.");
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    if (!username.trim() || !displayName.trim() || !email.trim() || !password) {
      setErrorMessage("All fields are required.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }
    setSubmitting(true);
    const success = await register(username, displayName, email, password);
    setSubmitting(false);
    if (!success) {
      setErrorMessage("Registration failed. Try a different username or email.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-[#121212] border border-white/15 rounded-3xl p-5 sm:p-8 shadow-2xl shadow-orange-500/10 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-5 right-5 p-2 text-gray-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/30 text-orange-400 mb-3 shadow-inner">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {isLogin ? "Join the Discussion" : "Create Community Account"}
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            {isLogin
              ? "Sign in to vote on the Ollypedia Meter & participate in discussions"
              : "Become part of the largest Odia cinema community"}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-[#1a1a1a] p-1 rounded-2xl border border-white/5 mb-6">
          <button
            type="button"
            onClick={() => {
              openAuthModal("login");
              setErrorMessage("");
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
              isLogin
                ? "bg-gradient-to-r from-orange-500 to-amber-500 text-black shadow-md shadow-orange-500/20 font-bold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              openAuthModal("signup");
              setErrorMessage("");
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
              !isLogin
                ? "bg-gradient-to-r from-orange-500 to-amber-500 text-black shadow-md shadow-orange-500/20 font-bold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Sign Up
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs sm:text-sm">
            {errorMessage}
          </div>
        )}

        {/* Login Form */}
        {isLogin ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Username or Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="alekh or user@example.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-[#181818] border border-white/10 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-[#181818] border border-white/10 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-orange-500 hover:from-orange-600 to-amber-500 text-black font-bold text-sm tracking-wide shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In to Ollypedia
                </>
              )}
            </button>
          </form>
        ) : (
          /* Sign Up Form */
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  placeholder="alekh_cinema"
                  required
                  maxLength={30}
                  className="w-full pl-10 pr-4 py-2 bg-[#181818] border border-white/10 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                />
              </div>
              <p className="text-[10px] text-zinc-500 mt-0.5">3-30 letters, numbers, and underscores only</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                Display Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Alekh Pradhan"
                  required
                  maxLength={50}
                  className="w-full pl-10 pr-4 py-2 bg-[#181818] border border-white/10 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-10 pr-4 py-2 bg-[#181818] border border-white/10 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    required
                    minLength={6}
                    className="w-full pl-9 pr-3 py-2 bg-[#181818] border border-white/10 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                  Confirm
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    required
                    className="w-full pl-9 pr-3 py-2 bg-[#181818] border border-white/10 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-orange-500 hover:from-orange-600 to-amber-500 text-black font-bold text-sm tracking-wide shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create Free Account
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
