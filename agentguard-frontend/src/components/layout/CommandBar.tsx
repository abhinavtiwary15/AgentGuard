import React from 'react';

interface CommandBarProps {
  title: string;
  tag?: string;
  children?: React.ReactNode;
}

export const CommandBar: React.FC<CommandBarProps> = ({ title, tag, children }) => {
  return (
    <div className="h-[44px] flex items-center justify-between px-6 border-b border-border-subtle bg-bg-surface/50 backdrop-blur-sm sticky top-0 z-10 el-1">
      <div className="flex items-center gap-4">
        <h2 className="section-title">{title}</h2>
        {tag && (
          <>
            <div className="w-px h-3 bg-border-strong"></div>
            <span className="panel-label bg-bg-raised px-2 py-0.5 rounded-xs">{tag}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-3">
        {children}
      </div>
    </div>
  );
};
