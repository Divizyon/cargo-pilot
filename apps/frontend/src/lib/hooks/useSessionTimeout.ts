import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { API_BASE_URL } from '@/lib/config/env';

const IDLE_TIMEOUT_MS = 20 * 60 * 1000;
const WARNING_BEFORE_MS = 60 * 1000;
const WARNING_DURATION_S = 60;

interface RefreshApiResponse {
  isSuccess: boolean;
  data: { accessToken: string; accessTokenExpiresAt: string };
}

export function useSessionTimeout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const lastActivityAt = useAuthStore((s) => s.lastActivityAt);
  const updateActivity = useAuthStore((s) => s.updateActivity);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);

  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(WARNING_DURATION_S);

  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearAllTimers() {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  }

  useEffect(() => {
    if (!isAuthenticated || lastActivityAt === null) {
      clearAllTimers();
      return;
    }

    clearAllTimers();

    const elapsed = Date.now() - lastActivityAt;
    const warningDelay = Math.max(0, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS - elapsed);
    const logoutDelay = Math.max(0, IDLE_TIMEOUT_MS - elapsed);

    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setCountdown(WARNING_DURATION_S);

      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, warningDelay);

    logoutTimerRef.current = setTimeout(() => {
      clearAllTimers();
      setShowWarning(false);
      clearAuth();
      sessionStorage.setItem('logout_reason', 'idle');
      window.location.href = '/auth/login';
    }, logoutDelay);

    return clearAllTimers;
  }, [isAuthenticated, lastActivityAt, clearAuth]);

  async function extendSession() {
    try {
      const { data } = await axios.post<RefreshApiResponse>(
        '/api/v1/auth/refresh',
        {},
        { baseURL: API_BASE_URL, withCredentials: true },
      );
      setAccessToken(data.data.accessToken);
      updateActivity();
      setShowWarning(false);
    } catch {
      clearAllTimers();
      clearAuth();
      sessionStorage.setItem('logout_reason', 'token_expired');
      window.location.href = '/auth/login';
    }
  }

  return { showWarning, countdown, extendSession };
}
