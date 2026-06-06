import React from 'react';
import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';
import { Toast } from '../common/Toast';

export const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg-base">
      <Topbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-bg-base relative">
          {children}
        </main>
      </div>
      <Toast />
    </div>
  );
};
