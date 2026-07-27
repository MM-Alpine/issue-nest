import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ApiError } from './api/client';
import { ToastProvider } from './components/ToastProvider';
import { AuthProvider } from './features/auth/AuthProvider';
import { AppRoutes } from './routes/router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A 401/403/404 will not fix itself, so only retry once and never on those.
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
        return failureCount < 1;
      },
      staleTime: 15_000,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}
