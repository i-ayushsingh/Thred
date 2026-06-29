import { useShallow } from 'zustand/react/shallow';
import WebviewWrapper from './WebviewWrapper';
import React, { useEffect, useRef, useState } from 'react';
import { AIConfig } from '../shared/ai-list';
import { useStore } from '../store';
import { useT } from '../i18n/context';
import { AIIcon } from './AIIcon';

// Register webview in JSX namespace for TypeScript compiler
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- JSX intrinsic-element augmentation requires a namespace
  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        src?: string;
        partition?: string;
        allowpopups?: string;
        webpreferences?: string;
        useragent?: string;
        class?: string;
      }, HTMLElement>;
    }
  }
}

export const WebviewContainer: React.FC = () => {
  const {  activeAI, loadedAIs, aiList, splitAI  } = useStore(useShallow(state => ({ activeAI: state.activeAI, loadedAIs: state.loadedAIs, aiList: state.aiList, splitAI: state.splitAI })));

  const isSplitMode = activeAI !== null && splitAI !== null;

  return (
    <div className={`flex-1 w-full h-full overflow-hidden bg-background relative flex flex-row transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isSplitMode ? 'p-2 gap-2' : ''}`}>
      {aiList.map((ai) => {
        const isLoaded = loadedAIs.includes(ai.id);
        const isActive = activeAI === ai.id || splitAI === ai.id;

        // Render nothing if it hasn't been lazy-loaded yet
        if (!isLoaded) return null;

        return (
          <WebviewWrapper
            key={ai.id}
            ai={ai}
            isActive={isActive}
            className="flex-1 min-w-0"
            isSplitMode={isSplitMode}
          />
        );
      })}
      {/* Premium Split View Handle */}
      {isSplitMode && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-12 flex items-center justify-center z-50 pointer-events-none">
          <div className="w-1.5 h-full bg-white/20 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.5)] border border-white/10 backdrop-blur-md" />
        </div>
      )}
    </div>
  );
};
export default WebviewContainer;

