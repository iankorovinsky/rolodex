import { useEffect } from 'react';
import type { CommandAction } from '@/commands/types';
import { useCommandPalette } from '@/commands/provider';

export function useRegisterCommandActions(commands: CommandAction[]) {
  const { registerCommands } = useCommandPalette();

  useEffect(() => registerCommands({ commands }), [commands, registerCommands]);
}
