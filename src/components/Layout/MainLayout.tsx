
import React from 'react';
import Sidebar from './Sidebar';
import { motion } from 'framer-motion';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <div className="flex min-h-screen bg-navy-50">
      <Sidebar />
      <motion.main 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex-1 ml-[280px] p-6"
      >
        <div className="container max-w-6xl mx-auto">
          {children}
        </div>
      </motion.main>
    </div>
  );
};

export default MainLayout;
