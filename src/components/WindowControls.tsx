import React, { useState, useEffect } from 'react';
import { useT } from '../i18n/context';

export const WindowControls: React.FC = () => {
  const t = useT();
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (window.electron && window.electron.getWindowIsMaximized) {
      window.electron.getWindowIsMaximized().then((maximized: boolean) => {
        setIsMaximized(maximized);
      });
    }

    const handleResize = () => {
      if (window.electron && window.electron.getWindowIsMaximized) {
        window.electron.getWindowIsMaximized().then((maximized: boolean) => {
          setIsMaximized(maximized);
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMinimize = () => {
    window.electron?.windowMinimize();
  };

  const handleMaximize = () => {
    window.electron?.windowMaximize();
    setTimeout(() => {
      if (window.electron && window.electron.getWindowIsMaximized) {
        window.electron.getWindowIsMaximized().then((maximized: boolean) => {
          setIsMaximized(maximized);
        });
      }
    }, 100);
  };

  const handleClose = () => {
    window.electron?.windowClose();
  };

  return (
    <div className="flex items-center gap-2 no-drag titlebar-no-drag pointer-events-auto pl-1 pr-1.5 self-center">
      <div className="relative group">
        <button
          onClick={handleMinimize}
          className="block w-3.5 h-3.5 rounded-full bg-[#febc2e] hover:brightness-110 transition-all focus:outline-none cursor-pointer pointer-events-auto no-drag titlebar-no-drag"
        />
        <div className="absolute top-full mt-2 px-2 py-1 bg-black/60 backdrop-blur-xl border border-white/10 rounded-md text-[9px] font-bold text-on-surface opacity-0 -translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 ease-out whitespace-nowrap z-[100] shadow-2xl">
          {t('common.minimize')}
        </div>
      </div>
      <div className="relative group">
        <button
          onClick={handleMaximize}
          className="block w-3.5 h-3.5 rounded-full bg-[#28c840] hover:brightness-110 transition-all focus:outline-none cursor-pointer pointer-events-auto no-drag titlebar-no-drag"
        />
        <div className="absolute top-full mt-2 px-2 py-1 bg-black/60 backdrop-blur-xl border border-white/10 rounded-md text-[9px] font-bold text-on-surface opacity-0 -translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 ease-out whitespace-nowrap z-[100] shadow-2xl">
          {isMaximized ? t('common.restore') : t('common.maximize')}
        </div>
      </div>
      <div className="relative group">
        <button
          onClick={handleClose}
          className="block w-3.5 h-3.5 rounded-full bg-[#ff5f57] hover:brightness-110 transition-all focus:outline-none cursor-pointer pointer-events-auto no-drag titlebar-no-drag"
        />
        <div className="absolute top-full mt-2 px-2 py-1 bg-black/60 backdrop-blur-xl border border-white/10 rounded-md text-[9px] font-bold text-on-surface opacity-0 -translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 ease-out whitespace-nowrap z-[100] shadow-2xl">
          {t('common.close')}
        </div>
      </div>
      {!window.electron && (
        <div className="absolute top-10 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">No Electron API</div>
      )}
    </div>
  );
};

export default WindowControls;
