import { BookUser, LogOut, Plug, Plus, Settings, Telescope, UserRound } from 'lucide-react';
import type { CommandAction } from '@/commands/types';

interface CoreActionOptions {
  navigate: (to: string, options?: { replace?: boolean; state?: unknown }) => void;
  openAddPerson: () => void;
  openScoutDialog: () => void;
  signOut: () => Promise<void>;
}

export function createCoreActions(options: CoreActionOptions): CommandAction[] {
  const { navigate, openAddPerson, openScoutDialog, signOut } = options;

  return [
    {
      id: 'nav:rolodex',
      title: 'Go to Rolodex',
      subtitle: 'View people and relationship history',
      keywords: ['home', 'dashboard', 'people', 'contacts'],
      group: 'navigation',
      icon: BookUser,
      kind: 'action',
      priority: 0,
      perform: () => navigate('/app/rolodex'),
    },
    {
      id: 'nav:scouts',
      title: 'Go to Scouts',
      subtitle: 'View recurring research scouts',
      keywords: ['research', 'automation'],
      group: 'navigation',
      icon: Telescope,
      kind: 'action',
      priority: 1,
      perform: () => navigate('/app/scouts'),
    },
    {
      id: 'create:person',
      title: 'Add Person',
      subtitle: 'Create a new person in the rolodex',
      keywords: ['new person', 'contact', 'create'],
      group: 'create',
      icon: Plus,
      kind: 'action',
      priority: 0,
      perform: openAddPerson,
    },
    {
      id: 'create:scout',
      title: 'New Scout',
      subtitle: 'Create a recurring research scout',
      keywords: ['create scout', 'new scout', 'automation'],
      group: 'create',
      icon: Plus,
      kind: 'action',
      priority: 1,
      perform: openScoutDialog,
    },
    {
      id: 'nav:profile',
      title: 'Go to Profile',
      subtitle: 'Edit your name and avatar',
      keywords: ['account', 'me'],
      group: 'navigation',
      icon: UserRound,
      kind: 'action',
      priority: 2,
      perform: () => navigate('/app/profile'),
    },
    {
      id: 'nav:settings',
      title: 'Go to Settings',
      subtitle: 'Open app settings',
      keywords: ['preferences', 'config'],
      group: 'navigation',
      icon: Settings,
      kind: 'action',
      priority: 3,
      perform: () => navigate('/app/settings'),
    },
    {
      id: 'nav:integrations',
      title: 'Go to Integrations',
      subtitle: 'Manage connected providers',
      keywords: ['google', 'outlook', 'granola', 'imessage'],
      group: 'navigation',
      icon: Plug,
      kind: 'action',
      priority: 4,
      perform: () => navigate('/app/settings'),
    },
    {
      id: 'account:signout',
      title: 'Sign Out',
      subtitle: 'Log out of Rolodex',
      keywords: ['logout', 'sign out'],
      group: 'account',
      icon: LogOut,
      kind: 'action',
      priority: 0,
      perform: async () => {
        await signOut();
        navigate('/', { replace: true });
      },
    },
  ];
}
