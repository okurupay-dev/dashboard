import React from 'react';
import { ClerkProvider as BaseClerkProvider, RedirectToSignIn } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';

// Replace with your actual Clerk publishable key
const CLERK_PUBLISHABLE_KEY = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY || 'pk_test_YOUR_CLERK_PUBLISHABLE_KEY';

interface ClerkProviderProps {
  children: React.ReactNode;
}

export const ClerkProvider: React.FC<ClerkProviderProps> = ({ children }) => {
  const navigate = useNavigate();

  return (
    <BaseClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      appearance={{
        variables: {
          colorPrimary: '#6366f1', // Indigo color to match your button
        },
        layout: {
          logoPlacement: undefined, // We'll use our own logo instead
          showOptionalFields: false,
          socialButtonsPlacement: undefined, // Disable social buttons
          socialButtonsVariant: 'iconButton',
          logoImageUrl: '', // No Clerk logo
          helpPageUrl: '',
        },
        elements: {
          formButtonPrimary: 'bg-indigo-600 hover:bg-indigo-700',
          card: 'bg-white',
          rootBox: 'w-full',
        },
      }}
    >
      {children}
    </BaseClerkProvider>
  );
};

// Custom hook to check if user is approved
export const useIsUserApproved = () => {
  // This would be implemented with Clerk's useUser hook
  // For now, we'll return a mock implementation
  return { isApproved: true, isLoading: false };
};

// Higher-order component to protect routes based on approval status
export const withRequireApproval = (Component: React.ComponentType) => {
  return (props: any) => {
    const { isApproved, isLoading } = useIsUserApproved();
    
    if (isLoading) {
      return <div>Loading...</div>;
    }
    
    if (!isApproved) {
      return <RedirectToSignIn />;
    }
    
    return <Component {...props} />;
  };
};
