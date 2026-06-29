export const AI_SELECTORS: Record<string, { input: string; prompt: string; response: string; code: string }> = {
  chatgpt: { 
    input: 'textarea[aria-label="Chat with ChatGPT"]', 
    prompt: 'article[data-turn="user"], [data-message-author-role="user"]',
    response: 'article[data-turn="assistant"], [data-message-author-role="assistant"]', 
    code: 'pre' 
  },
  claude: { 
    input: '[contenteditable="true"][aria-label="Write your prompt to Claude"]', 
    prompt: '[data-testid="user-message"], [data-message-role="user"]',
    response: '[data-message-role="assistant"], .font-claude-response, .font-claude-message', 
    code: 'pre' 
  },
  gemini: { 
    input: '[contenteditable="true"][aria-label="Enter a prompt for Gemini"]', 
    prompt: 'user-query-content, .user-query-content, user-query',
    response: 'model-response, .model-response-text, message-content', 
    code: 'code-block, pre' 
  },
  perplexity: { 
    input: '[contenteditable="true"]#ask-input', 
    prompt: '[class*="Question"]',
    response: '[class*="prose" i], [class*="AnswerBody" i], [class*="answerBody" i], [class*="answer" i], .answer-body', 
    code: 'pre' 
  },
  grok: { 
    input: 'textarea', 
    prompt: '[data-testid="user-message"], [data-testid="user-prompt"]',
    response: '[data-testid="assistant-message"], .response-content-markdown', 
    code: 'pre' 
  },
  deepseek: { 
    input: 'textarea[placeholder="Message DeepSeek"]', 
    prompt: 'div[data-um-id]',
    response: '.ds-markdown', 
    code: '.md-code-block, pre' 
  },
  kimi: { 
    input: '[contenteditable="true"].chat-input-editor', 
    prompt: '.segment-user',
    response: '.segment-assistant', 
    code: 'pre' 
  },
  mistral: { 
    input: '[contenteditable="true"].ProseMirror', 
    prompt: '[data-testid*="conversation-turn-user"], [data-testid*="user"], [data-message-role="user"]',
    response: '[data-testid*="conversation-turn-assistant"], [data-testid*="assistant"], [data-message-role="assistant"]', 
    code: 'pre' 
  },
  huggingchat: { 
    input: 'textarea[placeholder="Ask anything"]', 
    prompt: '[data-message-role="user"]',
    response: '[data-message-role="assistant"], .prose', 
    code: 'pre' 
  },
};

function getSelector(aiId: string): string {
  return AI_SELECTORS[aiId]?.input || 'textarea';
}

export function jsInjectAll(aiId: string): string {
  const sel = getSelector(aiId);
  const escapedSel = sel.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
  const escapedId = aiId.replace(/`/g, '\\`');
  return `
(() => {
  if (window.__THRED_INJECTED === true) {
    if (typeof window.__THRED_CLEANUP === 'function') {
      try { window.__THRED_CLEANUP(); } catch(e) {}
    }
  }

  var SELECTOR = \`${escapedSel}\`;
  var AI_ID = \`${escapedId}\`;

  function postMsg(type, data) {
    postMsg('THRED_MSG:' + JSON.stringify({ type: type, ...data }));
  }

  function isTextCode(text) {
    if (!text || typeof text !== 'string') return false;
    var trimmed = text.trim();
    if (trimmed.length < 5) return false;

    // Check for common programming indicators at the beginning of the text
    var codePatterns = [
      /^(const|let|var)\\s+\\w+\\s*=\\s*/, // JS/TS variable assignment
      /^import\\s+[\\w\\s{}*,"']+\\s+(from\\s+["']|from\\s+[\\w.-]+)/, // JS/TS import
      /^class\\s+\\w+(\\s+extends\\s+\\w+)?(\\s+implements\\s+[\\w,\\s]+)?\\s*{/, // JS/TS/Java/C++ class declaration
      /^(public|private|protected)\\s+(class|interface|enum|void|static|[\\w<>[\\]]+)\\b/, // Java/C# method/class
      /^def\\s+\\w+\\s*\\(.*?\\)\\s*:/, // Python function
      /^fn\\s+\\w+\\s*\\(.*?\\)\\s*->/, // Rust function
      /^#include\\s+<[\\w.]+>/, // C/C++ include
      /^from\\s+[\\w.]+\\s+import\\s+/, // Python import
      /^<\\?php/, // PHP open tag
      /^<!DOCTYPE html>/, // HTML doctype
      /^{\\s*"[\\w-]+"\\s*:/, // JSON object
      /^<[\\w-]+(\\s+[\\w-]+(=".*?")?)*\\s*>\\s*<.*?\\/[\\w-]+>/ // HTML tag pair
    ];
    for (var p = 0; p < codePatterns.length; p++) {
      if (codePatterns[p].test(trimmed)) return true;
    }

    // Check for coding syntax structures inside the text:
    // 1. Multiple curly braces
    var openBraces = (trimmed.match(/{/g) || []).length;
    var closeBraces = (trimmed.match(/}/g) || []).length;
    if (openBraces > 0 && openBraces === closeBraces) {
      if (/\\b(if|for|while|return|void|public|static|console|println|print|cout)\\b/.test(trimmed)) {
        return true;
      }
    }

    // 2. High density of semicolons and indentation
    var lines = trimmed.split('\n');
    if (lines.length > 2) {
      var indentedLines = 0;
      var semicolonLines = 0;
      for (var l = 0; l < lines.length; l++) {
        var line = lines[l].trim();
        if (line.length > 0) {
          if (lines[l].startsWith(' ') || lines[l].startsWith('\t')) indentedLines++;
          if (line.endsWith(';') || line.endsWith('{') || line.endsWith('}')) semicolonLines++;
        }
      }
      var nonBlankLines = lines.filter(function(line) { return line.trim().length > 0; }).length;
      if (nonBlankLines > 1) {
        var indentRatio = indentedLines / nonBlankLines;
        var semicolonRatio = semicolonLines / nonBlankLines;
        if (indentRatio > 0.4 && (semicolonRatio > 0.3 || openBraces > 0)) {
          return true;
        }
      }
    }

    return false;
  }

  var AI_SELECTORS_MAP = ${JSON.stringify(AI_SELECTORS)};

  function getSelectionNode() {
    var sel = window.getSelection();
    if (sel && sel.anchorNode) return sel.anchorNode;
    try {
      var roots = document.querySelectorAll('*');
      for (var i = 0; i < roots.length; i++) {
        if (roots[i].shadowRoot) {
          var ss = roots[i].shadowRoot.getSelection ? roots[i].shadowRoot.getSelection() : null;
          if (ss && ss.anchorNode) return ss.anchorNode;
        }
      }
    } catch (e) {}
    return null;
  }

  function isInsideCodeContainer(el) {
    if (!el) return false;
    try {
      if (typeof el.closest === 'function') {
        if (el.closest('pre') || el.closest('code')) return true;
        var codeClasses = ['code-block', 'codeBlock', 'highlight', 'hljs', 'code-block__code'];
        for (var c = 0; c < codeClasses.length; c++) {
          if (el.closest('.' + codeClasses[c])) return true;
        }
      }
    } catch (e) { /* ignore */ }
    var cur = el;
    for (var i = 0; i < 10 && cur && cur !== document.body; i++) {
      var tag = cur.tagName && cur.tagName.toLowerCase();
      if (tag === 'pre' || tag === 'code') return true;
      if (cur.classList) {
        var cls = cur.className;
        if (typeof cls === 'string' && (cls.includes('code-block') || cls.includes('codeBlock') || cls.includes('highlight') || cls.includes('hljs'))) return true;
      }
      cur = cur.parentNode;
    }
    return false;
  }

  function isCodeCopyButton(el) {
    if (!el) return false;
    try {
      if (typeof el.closest !== 'function') return false;
      var btn = el.closest('button, [role="button"], [class*="copy" i], [data-testid*="copy" i], [aria-label*="copy" i], [title*="copy" i]');
      if (!btn) return false;

      // Check if button text, label, class or testid explicitly mentions "code" or "代码" (Chinese)
      var btnText = (btn.innerText || btn.textContent || '').toLowerCase();
      var btnLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
      var btnTitle = (btn.getAttribute('title') || '').toLowerCase();
      var btnTestId = (btn.getAttribute('data-testid') || '').toLowerCase();
      var btnClass = (btn.className || '');
      if (typeof btnClass === 'string') btnClass = btnClass.toLowerCase();
      else btnClass = '';

      if (btnText.includes('code') || btnLabel.includes('code') || btnTitle.includes('code') || btnTestId.includes('code') || btnClass.includes('code') ||
          btnText.includes('代码') || btnLabel.includes('代码') || btnTitle.includes('代码') || btnTestId.includes('代码') || btnClass.includes('代码')) {
        return true;
      }

      // Check if it's inside a code-block container or a pre/code tag
      if (btn.closest('pre') || btn.closest('code')) return true;
      if (btn.closest('.code-block, .codeBlock, [class*="code-block" i], [class*="codeBlock" i], [class*="code-wrapper" i], [class*="code-container" i], [class*="code-header" i], [class*="-code-" i]')) {
        return true;
      }

      // Walk up the tree up to 3 levels to find if there is a pre/code tag,
      // but STOP walking if we hit a response/message container.
      var sels = AI_SELECTORS_MAP[AI_ID];
      var cur = btn.parentElement;
      for (var i = 0; i < 3 && cur && cur !== document.body; i++) {
        // If we hit the response container, stop. This is a response-level action.
        if (sels.response && cur.matches(sels.response)) {
          break;
        }
        // Also check standard message/response classes to be safe
        var cls = cur.className || '';
        if (typeof cls === 'string') {
          cls = cls.toLowerCase();
          if (cls.includes('message') || cls.includes('response') || cls.includes('conversation') || cls.includes('prose')) {
            break;
          }
        }

        // Check if this parent contains pre or code
        if (cur.querySelector('pre') || cur.querySelector('code')) {
          return true;
        }
        cur = cur.parentElement;
      }
    } catch (err) { /* ignore */ }
    return false;
  }

  function evaluateContext(node) {
    if (!node) return 'prompt';
    var el = node.nodeType === 3 ? node.parentNode : node;
    var sels = AI_SELECTORS_MAP[AI_ID];
    if (!sels) return 'prompt';
    try {
      if (el && typeof el.closest === 'function') {
        // 1. Check if it's a code block or code copy button first
        if (sels.code && el.closest(sels.code)) return 'code';
        if (isInsideCodeContainer(el)) return 'code';
        if (isCodeCopyButton(el)) return 'code';

        // 2. Check if it's inside the assistant's response message
        if (sels.response && el.closest(sels.response)) {
          return 'response';
        }

        // 3. Check if it's inside a user's prompt in the chat history
        if (sels.prompt && el.closest(sels.prompt)) {
          return 'prompt';
        }

        // 4. Check if it's inside the input field/textarea where user is typing
        if ((sels.input && el.closest(sels.input)) || el.closest('textarea, input, [contenteditable="true"]')) {
          return 'prompt';
        }
      }
    } catch (e) { /* ignore */ }
    return 'prompt';
  }

  var lastClickNode = null;

  function handleCopy(e) {
    var text = window.getSelection()?.toString() || (e.clipboardData && e.clipboardData.getData('text')) || '';
    if (text) {
      var node = getSelectionNode();
      var ctx = evaluateContext(node);
      if (ctx !== 'code' && isTextCode(text)) {
        ctx = 'code';
      }
      postMsg('THRED_COPY_CONTEXT', { text: text, context: ctx });
    }
  }

  function handleMousedown(e) {
    lastClickNode = e.target;
    var ctx = evaluateContext(e.target);
    postMsg('THRED_LAST_CLICK_CONTEXT', { context: ctx });
  }

  var originalWriteText = (window.__THRED_HANDLERS && window.__THRED_HANDLERS.originalWriteText) || (navigator.clipboard && navigator.clipboard.writeText);

  function handleClipboardWrite(text) {
    var ctx = evaluateContext(lastClickNode);
    if (ctx !== 'code' && isTextCode(text)) {
      ctx = 'code';
    }
    postMsg('THRED_COPY_CONTEXT', { text: text, context: ctx });
    return originalWriteText.apply(this, arguments);
  }

  window.__THRED_HANDLERS = {
    handleCopy: handleCopy,
    handleMousedown: handleMousedown,
    originalWriteText: originalWriteText
  };

  window.__THRED_CLEANUP = function() {
    try {
      document.removeEventListener('copy', window.__THRED_HANDLERS.handleCopy);
      document.removeEventListener('mousedown', window.__THRED_HANDLERS.handleMousedown, true);
      if (window.__THRED_HANDLERS.originalWriteText && navigator.clipboard) {
        navigator.clipboard.writeText = window.__THRED_HANDLERS.originalWriteText;
      }
    } catch (e) {
      // Cleanup failed
    }
  };

  document.addEventListener('copy', handleCopy);
  document.addEventListener('mousedown', handleMousedown, true);

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText = handleClipboardWrite;
  }

  window.__THRED_INJECTED = true;
})();
`;
}
