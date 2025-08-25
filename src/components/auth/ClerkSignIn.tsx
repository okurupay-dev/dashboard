import React from 'react';
import SupabaseSignIn from './SupabaseSignIn';
import logo from '../../assets/images/logo.svg';

const CustomSignIn: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-full max-w-md p-8 space-y-8 mx-auto flex flex-col items-center justify-center">
        {/* Custom logo above sign-in component */}
        <div className="w-full flex justify-center">
          <img src={logo} alt="Okuru Logo" className="h-16 mb-8" />
        </div>
        
        {/* Supabase sign-in component */}
        <div className="w-full">
          <SupabaseSignIn />
        </div>
      </div>
    </div>
  );
};

export default CustomSignIn;
