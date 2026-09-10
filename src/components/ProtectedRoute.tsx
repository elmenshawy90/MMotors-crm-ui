import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { useAuth } from '../contexts/auth-context';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // نمنع تكرار الـ redirect إذا نُفِّذ مرة
  const redirected = useRef(false);

  useEffect(() => {
    if (!loading && !isAuthenticated && !redirected.current) {
      redirected.current = true;
      navigate({
        to: '/login',
        search: {
          redirect: location.href,
        },
      });
    }
    // نُعيد الـ flag إذا رجع المستخدم authenticated
    if (isAuthenticated) {
      redirected.current = false;
    }
  }, [isAuthenticated, loading, navigate, location.href]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
