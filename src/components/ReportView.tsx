import { useShallow } from 'zustand/react/shallow';
import React, { useState } from 'react';
import { useStore } from '../store';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { useT } from '../i18n/context';

export const ReportView: React.FC = () => {
  const { setActiveTab, appVersion } = useStore(useShallow(state => ({ setActiveTab: state.setActiveTab, appVersion: state.appVersion })));
  const [formRef] = useAutoAnimate();
  const t = useT();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [aiModel, setAiModel] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<{ category?: string; description?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const newErrors: { category?: string; description?: string } = {};
    if (!category) newErrors.category = 'Please select a category.';
    if (!description.trim()) newErrors.description = 'Please describe the issue.';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);
    setSubmitError(false);

    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_key: '9ce40481-2034-4052-8c70-40112764de0c',
          subject: 'Bug Report - Thred',
          from_name: 'Thred App',
          ai_model: aiModel || 'Not specified',
          issue_category: category,
          description: description,
          thred_version: appVersion || 'unknown',
          os: typeof process !== 'undefined' ? process.platform : 'unknown',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
        setTimeout(() => {
          setSubmitted(false);
          setAiModel('');
          setCategory('');
          setDescription('');
          setErrors({});
        }, 3000);
      } else {
        setSubmitError(true);
      }
    } catch {
      setSubmitError(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col text-white bg-background relative font-sans overflow-hidden animate-fade-in">
      <div className="flex-1 overflow-y-auto px-12 py-10 custom-scrollbar">
        <div className="max-w-[800px] mx-auto">
          <header className="mb-10">
            <h1 className="text-[32px] font-extrabold tracking-tight mb-2">{t('report.header.title')}</h1>
            <p className="text-[14px] text-white/50 font-medium">
              {t('report.header.subtitle')}
            </p>
          </header>

          <div ref={formRef}>
            {submitted ? (
              <div className="bg-surface border border-emerald-500/20 shadow-[0_4px_24px_rgba(16,185,129,0.1)] rounded-[16px] p-8 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 border border-emerald-500/20">
                  <span className="material-symbols-outlined text-emerald-400 text-[32px]">check_circle</span>
                </div>
                <h3 className="text-xl font-bold mb-2">{t('report.success.title')}</h3>
                <p className="text-white/50 max-w-[400px]">
                  {t('report.success.message')}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-surface border border-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.02),_0_4px_16px_rgba(0,0,0,0.2)] rounded-[16px] p-8 flex flex-col gap-6">
                
                <div className="flex flex-col gap-2">
                  <label className="text-[12px] font-bold text-white/70 tracking-wide uppercase">{t('report.form.aiModel')}</label>
                  <input type="text" value={aiModel} onChange={(e) => setAiModel(e.target.value)} placeholder={t('report.form.aiModel.placeholder')} className="bg-[#1A1A1C] border border-white/[0.04] rounded-[10px] px-4 py-3 text-[14px] text-white outline-none focus:border-[#F4A460]/50 focus:ring-1 focus:ring-[#F4A460]/50 transition-all placeholder-white/20" />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[12px] font-bold text-white/70 tracking-wide uppercase">{t('report.form.issueCategory')}</label>
                  <select value={category} onChange={(e) => { setCategory(e.target.value); setErrors(prev => ({ ...prev, category: undefined })); }} className="bg-[#1A1A1C] border border-white/[0.04] rounded-[10px] px-4 py-3 text-[14px] text-white outline-none focus:border-[#F4A460]/50 focus:ring-1 focus:ring-[#F4A460]/50 transition-all appearance-none cursor-pointer">
                    <option value="" disabled>{t('report.form.issueCategory.select')}</option>
                    <option value="login">Login / Authentication</option>
                    <option value="ai-not-loading">AI not loading</option>
                    <option value="response-not-working">Response not working</option>
                    <option value="session-logging-out">Session logging out</option>
                    <option value="slow-performance">Slow performance</option>
                    <option value="ui-display">UI / Display issue</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.category && <span className="text-[11px] text-red-400 mt-0.5">{errors.category}</span>}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[12px] font-bold text-white/70 tracking-wide uppercase">{t('report.form.description')}</label>
                  <textarea value={description} onChange={(e) => { setDescription(e.target.value); setErrors(prev => ({ ...prev, description: undefined })); }} rows={4} placeholder={t('report.form.description.placeholder')} className="bg-[#1A1A1C] border border-white/[0.04] rounded-[10px] px-4 py-3 text-[14px] text-white outline-none focus:border-[#F4A460]/50 focus:ring-1 focus:ring-[#F4A460]/50 transition-all resize-none placeholder-white/20"></textarea>
                  {errors.description && <span className="text-[11px] text-red-400 mt-0.5">{errors.description}</span>}
                </div>

                {submitError && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-[10px] px-4 py-3 text-[13px] text-red-400">
                    Failed to send report. Please try again.
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 mt-4 pt-6 border-t border-white/[0.04]">
                  <button type="button" onClick={() => setActiveTab('home')} className="px-5 py-2.5 rounded-[10px] text-[13px] font-bold text-white/50 hover:text-white hover:bg-white/5 transition-colors">
                    {t('report.form.cancel')}
                  </button>
                  <button type="submit" disabled={submitting} className="px-5 py-2.5 rounded-[10px] text-[13px] font-bold text-[#121212] bg-[#F4A460] hover:bg-[#E39550] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_4px_12px_rgba(244,164,96,0.3)] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
                    {submitting ? 'Sending...' : t('report.form.submit')} <span className="material-symbols-outlined text-[16px]">send</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default ReportView;
