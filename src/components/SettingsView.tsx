import { useShallow } from 'zustand/react/shallow';
import React, { useState } from 'react';
import { useStore } from '../store';
import { useT } from '../i18n/context';
import { AI_LIST } from '../shared/ai-list';
import { AIIcon } from './AIIcon';

const Section = ({ id, title, children, isLast, noBox }: { id?: string, title: string, children: React.ReactNode, isLast?: boolean, noBox?: boolean }) => (
  <div id={id} className={`flex flex-col gap-3 ${!isLast ? 'mb-8' : ''}`}>
    <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] font-sans text-white/50 ml-2">{title}</h2>
    {noBox ? (
      children
    ) : (
      <div 
        className="flex flex-col rounded-[16px] p-2 gap-1 bg-surface border border-white/[0.04]"
        style={{
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02), 0 4px 16px rgba(0,0,0,0.2)'
        }}
      >
        {children}
      </div>
    )}
  </div>
);

const Row = ({ icon, title, desc, children }: { icon: string, title: string, desc: string, children: React.ReactNode }) => (
  <div className="flex items-center justify-between group py-2.5 px-3 hover:bg-[#1A1A1C] rounded-[12px] transition-colors cursor-default">
    <div className="flex items-center gap-4 max-w-[70%]">
      <div className="w-8 h-8 flex items-center justify-center rounded-[10px] bg-[#1A1A1C] text-white/50 group-hover:text-white transition-colors border border-white/[0.04] shadow-inner shrink-0">
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-[13px] font-bold text-white tracking-wide">{title}</span>
        <span className="text-[11px] text-white/40 mt-0.5 font-medium leading-snug">{desc}</span>
      </div>
    </div>
    <div className="flex items-center">
      {children}
    </div>
  </div>
);

const Toggle = ({ value, onChange }: { value: boolean, onChange: () => void }) => (
  <button
    onClick={onChange}
    className="w-[42px] h-[22px] rounded-full relative transition-all duration-300 focus:outline-none cursor-pointer shrink-0 bg-black/40 border border-white/[0.08] shadow-inner flex items-center px-1.5"
  >
    <div
      className={`h-[3px] rounded-full transition-all duration-300 ${
        value ? 'w-4 bg-[var(--accent)] ml-auto shadow-[0_0_8px_rgba(244,164,96,0.6)]' : 'w-4 bg-white/30 mr-auto'
      }`}
    />
  </button>
);





const ActionButton = ({ icon, label, danger = false, onClick, fullWidth = false }: { icon?: string, label: string, danger?: boolean, onClick?: () => void, fullWidth?: boolean }) => (
  <button
    onClick={onClick}
    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[11px] font-bold tracking-wide transition-all cursor-pointer shadow-sm ${fullWidth ? 'w-full' : ''} ${
      danger
        ? 'text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/50 hover:bg-red-500/10'
        : 'text-white/70 hover:text-white border border-white/[0.04] hover:border-white/10 bg-[#1A1A1C] hover:bg-white/10'
    }`}
  >
    {label}
    {icon && <span className="material-symbols-outlined text-[14px] opacity-80">{icon}</span>}
  </button>
);

// --- Main View ---

export const SettingsView: React.FC = () => {
  const t = useT();
  const {  preferences,
    appVersion,
    userName,
    setUserName,
    updatePreferences,
    disabledAIs,
    toggleAIDisabled,
    settingsTab,
    setSettingsTab,
    setActiveTab  } = useStore(useShallow(state => ({ preferences: state.preferences, appVersion: state.appVersion, userName: state.userName, setUserName: state.setUserName, updatePreferences: state.updatePreferences, disabledAIs: state.disabledAIs, toggleAIDisabled: state.toggleAIDisabled, settingsTab: state.settingsTab, setSettingsTab: state.setSettingsTab, setActiveTab: state.setActiveTab })));

  const [thredFolderPath, setThredFolderPath] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(userName);

  React.useEffect(() => {
    window.electron.getThredFolderPath().then(setThredFolderPath);
  }, []);

  const handleChangeFolder = async () => {
    const newPath = await window.electron.changeThredFolderPath();
    if (newPath) {
      setThredFolderPath(newPath);
    }
  };

  React.useEffect(() => {
    if (settingsTab) {
      const el = document.getElementById(`settings-section-${settingsTab}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => setSettingsTab(''), 1000);
      }
    }
  }, [settingsTab, setSettingsTab]);

  const handleUpdatePref = (key: keyof typeof preferences, value: unknown) => {
    updatePreferences({ [key]: value });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-6 gap-6 relative select-none bg-background z-0 animate-fade-in">
      
      {/* Background depth radial gradient */}
      <div className="absolute inset-0 pointer-events-none z-[-1]" style={{ background: 'radial-gradient(circle at 70% 10%, rgba(244,164,96,0.03) 0%, rgba(10,10,10,0) 60%)' }}></div>

      {/* Preferences Container (Scrollable) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar w-full px-12 pt-10 pb-24 z-10">
        <div className="max-w-6xl mx-auto flex flex-col gap-8 w-full">
          
          {/* Header */}
          <div className="flex flex-col gap-1 mb-8 px-2">
            <h1 className="font-bold text-3xl tracking-tight text-white font-sans drop-shadow-md">{t('settings.header.title')}</h1>
            <p className="text-white/50 text-sm font-sans font-medium">{t('settings.header.subtitle')}</p>
          </div>

          <div className="flex flex-col w-full">
            {/* SYSTEM */}
            <Section id="settings-section-system" title={t('settings.system.title')}>
              <Row icon="person" title="Display Name" desc="Your name shown in greetings and personalization">
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const trimmed = nameInput.trim();
                          if (trimmed) { setUserName(trimmed); setEditingName(false); }
                        }
                        if (e.key === 'Escape') { setNameInput(userName); setEditingName(false); }
                      }}
                      maxLength={30}
                      autoFocus
                      className="w-[180px] px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-[12px] text-white focus:outline-none focus:border-[var(--accent)] transition-colors"
                    />
                    <button
                      onClick={() => { const trimmed = nameInput.trim(); if (trimmed) { setUserName(trimmed); setEditingName(false); } }}
                      className="text-[11px] font-bold text-[var(--accent)] hover:text-white transition-colors cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setNameInput(userName); setEditingName(false); }}
                      className="text-[11px] font-bold text-white/40 hover:text-white transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-[12px] text-white/50">{userName || 'Not set'}</span>
                    <ActionButton icon="edit" label="Change" onClick={() => { setNameInput(userName); setEditingName(true); }} />
                  </div>
                )}
              </Row>
              <Row icon="folder_open" title={t('settings.system.dataLocation.title')} desc={t('settings.system.dataLocation.desc')}>
                <div className="flex items-center gap-3 w-full max-w-[360px]">
                  <span className="text-[11px] text-white/50 truncate flex-1" title={thredFolderPath}>{thredFolderPath || t('common.loading')}</span>
                  <ActionButton icon="edit" label={t('settings.system.dataLocation.change')} onClick={handleChangeFolder} />
                </div>
              </Row>
            </Section>

            {/* AI MODELS */}
            <Section id="settings-section-ai-models" title="AI Models">
              <div className="flex flex-col rounded-[16px] p-2 gap-1 bg-surface border border-white/[0.04]" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02), 0 4px 16px rgba(0,0,0,0.2)' }}>
                {AI_LIST.map((ai) => {
                  const isDisabled = disabledAIs.includes(ai.id);
                  return (
                    <div
                      key={ai.id}
                      className="flex items-center justify-between group py-2.5 px-3 hover:bg-[#1A1A1C] rounded-[12px] transition-colors cursor-default"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 flex items-center justify-center rounded-[10px] border border-white/[0.04] shadow-inner shrink-0 transition-opacity ${isDisabled ? 'opacity-30 bg-[#1A1A1C]' : 'bg-[#1A1A1C]'}`}>
                          <AIIcon id={ai.id} className="w-[18px] h-[18px]" style={{ color: isDisabled ? 'rgba(255,255,255,0.3)' : 'var(--accent)' }} />
                        </div>
                        <div className="flex flex-col">
                          <span className={`text-[13px] font-bold tracking-wide transition-opacity ${isDisabled ? 'text-white/30' : 'text-white'}`}>{ai.name}</span>
                          <span className={`text-[11px] mt-0.5 font-medium font-mono transition-opacity ${isDisabled ? 'text-white/15' : 'text-white/30'}`}>
                            Alt+{ai.shortcut}
                          </span>
                        </div>
                      </div>
                      <Toggle
                        value={!isDisabled}
                        onChange={() => toggleAIDisabled(ai.id)}
                      />
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-white/30 ml-2 mt-1">Disabled AIs are greyed out and their webviews are closed to save memory.</p>
            </Section>

            {/* KEYBOARD SHORTCUTS */}
            <Section id="settings-section-keyboard-shortcuts" title={t('settings.keyboardShortcuts.title')}>
              <Row icon="keyboard" title={t('settings.keyboardShortcuts.viewAll.title')} desc={t('settings.keyboardShortcuts.viewAll.desc')}>
                <ActionButton label={t('settings.keyboardShortcuts.viewAll.button')} icon="open_in_new" onClick={() => useStore.getState().setShortcutsOpen(true)} />
              </Row>
            </Section>


            {/* ABOUT */}
            <Section id="settings-section-about" title={t('settings.about.title')}>
              <Row icon="info" title="Version" desc={appVersion || '…'}>
                <div />
              </Row>
              <Row icon="language" title="Visit Official Website" desc="For any queries and latest updates">
                <ActionButton label="Visit Website" icon="open_in_new" onClick={() => window.electron.openExternalUrl('https://thred.qzz.io/')} />
              </Row>
              <Row icon="article" title={t('settings.about.releaseNotes.title')} desc={t('settings.about.releaseNotes.desc')}>
                <ActionButton label={t('settings.about.releaseNotes.button')} icon="open_in_new" onClick={() => window.electron.openExternalUrl('https://thred.qzz.io/releases')} />
              </Row>
              <Row icon="bug_report" title={t('settings.about.reportBug.title')} desc={t('settings.about.reportBug.desc')}>
                <ActionButton label={t('settings.about.reportBug.button')} icon="open_in_new" onClick={() => setActiveTab('report')} />
              </Row>
            </Section>

            <Section title={t('settings.followUs.title')} isLast noBox>
              <div className="grid grid-cols-5 gap-4">
                {[
                  { name: t('settings.followUs.instagram'), desc: t('settings.followUs.instagram.desc'), img: './images/Social logo/instagram.png', glow: 'rgba(225, 48, 108, 0.5)', bgGlow: 'rgba(225, 48, 108, 0.15)', url: 'https://www.instagram.com/thredlauncher/' },
                  { name: t('settings.followUs.twitter'), desc: t('settings.followUs.twitter.desc'), img: './images/Social logo/X.png', glow: 'rgba(255, 255, 255, 0.4)', bgGlow: 'rgba(255, 255, 255, 0.08)', url: 'https://x.com/thred_launcher' },
                  { name: t('settings.followUs.linkedin'), desc: t('settings.followUs.linkedin.desc'), img: './images/Social logo/linkedin.png', glow: 'rgba(10, 102, 194, 0.5)', bgGlow: 'rgba(10, 102, 194, 0.15)', url: 'https://www.linkedin.com/in/iayushsingh/' },
                  { name: t('settings.followUs.productHunt'), desc: t('settings.followUs.productHunt.desc'), img: './images/Social logo/producthunt.png', glow: 'rgba(218, 85, 47, 0.5)', bgGlow: 'rgba(218, 85, 47, 0.15)', url: 'https://www.producthunt.com' },
                  { name: t('settings.followUs.github'), desc: t('settings.followUs.github.desc'), img: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' fill='white' viewBox='0 0 16 16'%3E%3Cpath d='M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8'/%3E%3C/svg%3E", glow: 'rgba(255, 255, 255, 0.4)', bgGlow: 'rgba(255, 255, 255, 0.08)', url: 'https://github.com/i-ayushsingh/thred' }
                ].map((social) => (
                  <button 
                    key={social.name}
                    onClick={() => window.electron.openExternalUrl(social.url)}
                    className="flex flex-col items-center px-2 py-6 rounded-[16px] bg-surface border border-white/[0.04] transition-all group cursor-pointer relative overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.02),_0_4px_16px_rgba(0,0,0,0.2)]"
                  >
                    <div className="absolute top-0 left-0 right-0 h-[1px] opacity-70 group-hover:opacity-100 transition-opacity" style={{ background: `linear-gradient(90deg, transparent, ${social.glow}, transparent)` }} />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ background: `radial-gradient(circle at top, ${social.bgGlow}, transparent 70%)` }} />
                    <img src={social.img} alt={social.name} className="w-11 h-11 object-contain mb-3 transform group-hover:scale-105 group-hover:-translate-y-1 transition-all duration-300 relative z-10 drop-shadow-2xl" />
                    <span className="text-[13px] font-bold text-white mb-1.5 tracking-wide relative z-10">{social.name}</span>
                    <span className="text-[10px] text-white/40 font-medium text-center leading-relaxed h-8 mb-5 max-w-[120px] whitespace-pre-wrap relative z-10">{social.desc}</span>
                    <div className="w-[30px] h-[30px] rounded-[10px] bg-[#1A1A1C] border border-white/[0.04] shadow-inner flex items-center justify-center text-white/50 group-hover:text-white group-hover:bg-white/[0.1] transition-all mt-auto shrink-0 group-hover:scale-110 relative z-10">
                      <span className="material-symbols-outlined text-[14px]">north_east</span>
                    </div>
                  </button>
                ))}
              </div>
            </Section>
          </div>
        </div>
      </div>
      
      {/* Required for custom scrollbar */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 0px;
          height: 0px;
          display: none;
        }
        .custom-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};
export default SettingsView;
