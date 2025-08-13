import React from 'react';
import { useClerk } from '@clerk/clerk-react';
import logo from '../../assets/images/logo.svg';
import { Button } from '../ui/button';

const PendingReview: React.FC = () => {
  const { signOut } = useClerk();

  const handleSignOut = () => {
    signOut();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-full max-w-md p-8 space-y-8 text-center">
        <div className="w-full flex justify-center">
          <img src={logo} alt="Okuru Logo" className="h-16 mb-8" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900">Account Pending Review</h1>
        
        <p className="text-gray-600 mt-2">
          Your account is currently pending approval by an administrator. 
          You'll receive an email notification once your account has been approved.
        </p>
        
        <div className="mt-6">
          <Button 
            onClick={handleSignOut}
            className="w-full"
          >
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PendingReview;
