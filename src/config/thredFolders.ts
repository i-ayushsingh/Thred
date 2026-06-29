export const THRED_FOLDERS = [
  // Vault Base
  'Vault/Prompts',
  'Vault/Codebook',
  'Vault/Responses',
  'Vault/Whiteboard',

  // Vault Notebooks
  'Vault/Notebook/Notes',
  'Vault/Notebook/To-do',
  'Vault/Notebook/Scratchpad',
  'Vault/Notebook/Calendar',
  'Vault/Notebook/Calculations',

  // Vault Screenshots
  'Vault/Screenshots/Content Capture',
  'Vault/Screenshots/Workspace Capture',

  // Bookmarks (Top Level)
  'Bookmark',

  // Downloads
  'Downloads/Images',
  'Downloads/Videos',
  'Downloads/Documents',
  'Downloads/Code',
  'Downloads/Audio',

  // System (Hidden)
  '.system/Cache',
  '.system/Logs',
  '.system/Config',
  '.system/UserData',
] as const;
