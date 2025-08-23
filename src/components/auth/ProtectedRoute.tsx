import React from 'react';
import { useAuth } from "../../contexts/AuthContext";
import { LoginForm } from "./LoginForm";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-email-background to-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-email-primary mx-auto"></div>
          <p className="mt-2 text-email-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !user.authenticated) {
    return <LoginForm />;
  }

  return <>{children}</>;
};