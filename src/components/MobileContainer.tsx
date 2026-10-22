import React from 'react';

interface Props {
  children: React.ReactNode;
  title?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
}

export const MobileContainer: React.FC<Props> = ({ children, title, onBack, actions }) => {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 max-w-md mx-auto relative border-x border-slate-200">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
          )}
          {title && <h1 className="text-xl font-bold tracking-tight">{title}</h1>}
        </div>
        <div>{actions}</div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        {children}
      </main>

      {/* Bottom Padding for safety */}
      <div className="h-4" />
    </div>
  );
};