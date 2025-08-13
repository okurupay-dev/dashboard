import React from 'react';
import { SignIn as ClerkSignIn } from '@clerk/clerk-react';
import logo from '../../assets/images/logo.svg';

const CustomSignIn: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-full max-w-md p-8 space-y-8">
        {/* Custom logo above Clerk's sign-in component */}
        <div className="w-full flex justify-center">
          <img src={logo} alt="Okuru Logo" className="h-16 mb-8" />
        </div>
        
        {/* Clerk's sign-in component */}
        <ClerkSignIn 
          routing="path" 
          path="/signin" 
          signUpUrl="" // Disable sign-up
          afterSignInUrl="/"
        />
      </div>
    </div>
  );
};

export default CustomSignIn;
