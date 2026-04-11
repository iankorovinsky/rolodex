import type { ComponentType } from 'react';

export const COMMAND_GROUP_ORDER = [
  'navigation',
  'create',
  'page',
  'people',
  'account',
] as const;

export type CommandGroupKey = (typeof COMMAND_GROUP_ORDER)[number];

export type CommandIcon = ComponentType<{ className?: string }>;

export interface CommandAction {
  id: string;
  title: string;
  subtitle?: string;
  keywords?: string[];
  group: Exclude<CommandGroupKey, 'people'>;
  icon?: CommandIcon;
  kind: 'action';
  priority: number;
  perform: () => void | Promise<void>;
  isAvailable?: () => boolean;
  closeOnSelect?: boolean;
}

export interface CommandEntityResult {
  id: string;
  title: string;
  subtitle?: string;
  keywords?: string[];
  group: 'people';
  icon?: CommandIcon;
  kind: 'entity';
  priority: number;
  perform: () => void | Promise<void>;
  closeOnSelect?: boolean;
}

export type CommandItem = CommandAction | CommandEntityResult;

export interface RegisterCommandsInput {
  commands: CommandAction[];
}

export interface CommandPaletteContextValue {
  isOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
  registerCommands: (input: RegisterCommandsInput) => () => void;
}
