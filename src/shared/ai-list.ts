export interface AIConfig {
  id: string;
  name: string;
  url: string;
  loginUrl?: string;
  domainAliases?: string[];
  color: string;
  icon: string;
  shortcut: string;
}

export const AI_LIST: AIConfig[] = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    url: "https://chatgpt.com/",
    loginUrl: "https://chatgpt.com/auth/login",
    color: "#10A37F",
    icon: "chat_bubble",
    shortcut: "1"
  },
  {
    id: "gemini",
    name: "Gemini",
    url: "https://gemini.google.com/",
    color: "#4285F4",
    icon: "auto_awesome",
    shortcut: "2"
  },
  {
    id: "claude",
    name: "Claude",
    url: "https://claude.ai/",
    loginUrl: "https://claude.ai/login",
    color: "#FF6B35",
    icon: "psychology",
    shortcut: "3"
  },
  {
    id: "perplexity",
    name: "Perplexity",
    url: "https://www.perplexity.ai/",
    color: "#20808D",
    icon: "search",
    shortcut: "4"
  },
  {
    id: "grok",
    name: "Grok",
    url: "https://grok.com/",
    domainAliases: ["x.com/grok"],
    color: "#E5E5E5",
    icon: "close",
    shortcut: "5"
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    url: "https://chat.deepseek.com/",
    loginUrl: "https://chat.deepseek.com/sign_in",
    color: "#1C5FE8",
    icon: "waves",
    shortcut: "6"
  },
  {
    id: "kimi",
    name: "Kimi",
    url: "https://kimi.ai/",
    domainAliases: ["kimi.moonshot.cn"],
    color: "#7C3AED",
    icon: "chat",
    shortcut: "7"
  },

  {
    id: "mistral",
    name: "Le Mistral",
    url: "https://chat.mistral.ai/",
    color: "#FD7C0A",
    icon: "terminal",
    shortcut: "8"
  },
  {
    id: "huggingchat",
    name: "HuggingChat",
    url: "https://huggingface.co/chat",
    color: "#FFBF00",
    icon: "chat",
    shortcut: "9"
  }
];

const AI_ALIASES: Record<string, string> = {
};

export function normalizeAiId(id: string): string {
  return AI_ALIASES[id] ?? id;
}
