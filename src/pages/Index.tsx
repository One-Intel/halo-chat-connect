import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import WispaChatLogo from '@/assets/wispachat logo.jpg';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary/80 dark:from-primary dark:to-primary/90 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary opacity-95 dark:from-primary/95 dark:to-primary/80"></div>
      <div className="absolute bottom-0 left-0 right-0 h-2 bg-background rounded-t-full"></div>
      
      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center max-w-sm w-full">
        {/* Logo */}
        <div className="mb-12">
          <div className="w-24 h-24 flex items-center justify-center mb-6">
            <img 
              src={WispaChatLogo} 
              alt="WispaChat Logo" 
              className="w-24 h-24 rounded-3xl object-contain" 
            />
          </div>
        </div>

        {/* App Name */}
        <h1 className="text-4xl font-bold text-primary-foreground mb-16 tracking-tight">
          WispaChat
        </h1>

        {/* Get Started Button */}
        <div className="w-full px-6">
          <Link to="/auth" className="block">
            <Button 
              size="lg"
              className="w-full bg-background text-primary hover:bg-background/90 font-semibold py-4 text-lg rounded-2xl shadow-lg transition-all duration-200"
            >
              Get Started
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 left-0 right-0 text-center px-4">
        <p className="text-primary-foreground/80 text-sm">
          From <span className="font-semibold">One Intelligence LLC</span>
        </p>
      </div>
    </div>
  );
};

export default Index;
