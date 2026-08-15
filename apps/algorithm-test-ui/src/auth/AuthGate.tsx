import { useAuthStore } from '@/lib/store/useAuthStore';
import { LoginForm } from './LoginForm';
import { AlgorithmTestPage } from '../App';

export function AuthGate() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <AlgorithmTestPage /> : <LoginForm />;
}
