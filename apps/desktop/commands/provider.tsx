'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AddPersonSheet } from '@/components/rolodex/add-person-sheet';
import { useAuth } from '@/lib/auth/auth-context';
import { CommandPalette } from '@/commands/command-palette';
import { createCoreActions } from '@/commands/core-actions';
import { searchPeopleCommands } from '@/commands/search/people-search';
import {
  COMMAND_GROUP_ORDER,
  type CommandAction,
  type CommandEntityResult,
  type CommandGroupKey,
  type CommandItem,
  type CommandPaletteContextValue,
  type RegisterCommandsInput,
} from '@/commands/types';

const PEOPLE_SEARCH_DEBOUNCE_MS = 120;
const DEFAULT_PEOPLE_LIMIT = 8;

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

function sortActions(commands: CommandAction[]) {
  return [...commands].sort((a, b) => {
    const priorityDelta = a.priority - b.priority;
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return a.title.localeCompare(b.title);
  });
}

function scoreAction(command: CommandAction, normalizedQuery: string) {
  if (!normalizedQuery) {
    return command.priority;
  }

  const title = command.title.toLowerCase();
  const subtitle = command.subtitle?.toLowerCase() || '';
  const keywords = command.keywords?.map((keyword) => keyword.toLowerCase()) || [];

  if (title === normalizedQuery) return -400 + command.priority;
  if (title.startsWith(normalizedQuery)) return -300 + command.priority;
  if (keywords.some((keyword) => keyword.startsWith(normalizedQuery)))
    return -220 + command.priority;
  if (title.includes(normalizedQuery)) return -180 + command.priority;
  if (subtitle.includes(normalizedQuery)) return -120 + command.priority;
  if (keywords.some((keyword) => keyword.includes(normalizedQuery))) return -80 + command.priority;

  return Number.POSITIVE_INFINITY;
}

function getBestPeopleCache(cache: Map<string, CommandEntityResult[]>, query: string) {
  if (!query) {
    return cache.get('') || [];
  }

  if (cache.has(query)) {
    return cache.get(query) || [];
  }

  for (let index = query.length - 1; index > 0; index -= 1) {
    const prefix = query.slice(0, index);
    if (cache.has(prefix)) {
      return cache.get(prefix) || [];
    }
  }

  return cache.get('') || [];
}

function toGroupedItems(items: CommandItem[]) {
  return COMMAND_GROUP_ORDER.reduce<Record<CommandGroupKey, CommandItem[]>>(
    (groups, group) => {
      groups[group] = items.filter((item) => item.group === group);
      return groups;
    },
    {
      navigation: [],
      create: [],
      page: [],
      people: [],
      account: [],
    }
  );
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName;
  return (
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT' ||
    Boolean(target.closest('[contenteditable="true"]'))
  );
}

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);
  const [peopleCache, setPeopleCache] = useState<Map<string, CommandEntityResult[]>>(
    () => new Map()
  );
  const [recentEntityIds, setRecentEntityIds] = useState<string[]>([]);
  const [isPeopleLoading, setIsPeopleLoading] = useState(false);
  const [registrations, setRegistrations] = useState<Map<number, CommandAction[]>>(() => new Map());

  const registrationIdRef = useRef(0);
  const preloadStartedRef = useRef(false);
  const latestSearchIdRef = useRef(0);

  const openCommandPalette = useCallback(() => setIsOpen(true), []);
  const closeCommandPalette = useCallback(() => {
    setIsOpen(false);
    setQuery('');
  }, []);
  const toggleCommandPalette = useCallback(() => {
    setIsOpen((current) => {
      if (current) {
        setQuery('');
      }

      return !current;
    });
  }, []);

  const registerCommands = useCallback((input: RegisterCommandsInput) => {
    const registrationId = registrationIdRef.current++;

    setRegistrations((current) => {
      const next = new Map(current);
      next.set(registrationId, input.commands);
      return next;
    });

    return () => {
      setRegistrations((current) => {
        const next = new Map(current);
        next.delete(registrationId);
        return next;
      });
    };
  }, []);

  const rememberEntity = useCallback((entityId: string) => {
    setRecentEntityIds((current) =>
      [entityId, ...current.filter((id) => id !== entityId)].slice(0, 8)
    );
  }, []);

  const loadPeople = useCallback(
    async (nextQuery?: string) => {
      const normalizedQuery = nextQuery?.trim().toLowerCase() || '';
      const searchId = latestSearchIdRef.current + 1;
      latestSearchIdRef.current = searchId;
      setIsPeopleLoading(true);

      try {
        const results = await searchPeopleCommands({
          query: nextQuery,
          limit: DEFAULT_PEOPLE_LIMIT,
          onSelect: async (personId: string) => {
            rememberEntity(`person:${personId}`);
            navigate(`/app/${personId}`);
          },
        });

        if (latestSearchIdRef.current !== searchId) {
          return;
        }

        setPeopleCache((current) => {
          const next = new Map(current);
          next.set(normalizedQuery, results);
          return next;
        });
      } catch (error) {
        if (latestSearchIdRef.current === searchId) {
          console.error('Failed to search people for command palette:', error);
        }
      } finally {
        if (latestSearchIdRef.current === searchId) {
          setIsPeopleLoading(false);
        }
      }
    },
    [navigate, rememberEntity]
  );

  useEffect(() => {
    if (preloadStartedRef.current) {
      return;
    }

    preloadStartedRef.current = true;
    void loadPeople();
  }, [loadPeople]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'k' || (!event.metaKey && !event.ctrlKey)) {
        return;
      }

      if (!isOpen && isTypingTarget(event.target)) {
        return;
      }

      event.preventDefault();
      toggleCommandPalette();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, toggleCommandPalette]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery || peopleCache.has(normalizedQuery)) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadPeople(query);
    }, PEOPLE_SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [isOpen, loadPeople, peopleCache, query]);

  useEffect(() => {
    closeCommandPalette();
  }, [closeCommandPalette, location.key]);

  const coreActions = useMemo(
    () =>
      createCoreActions({
        navigate: (to, options) => navigate(to, options),
        openAddPerson: () => setIsAddPersonOpen(true),
        openScoutDialog: () => {
          navigate('/app/scouts', {
            state: { openCreateScoutDialog: true },
          });
        },
        signOut,
      }),
    [navigate, signOut]
  );

  const contextualActions = useMemo(() => {
    const merged = new Map<string, CommandAction>();

    for (const registration of registrations.values()) {
      for (const command of registration) {
        merged.set(command.id, command);
      }
    }

    return sortActions(Array.from(merged.values()));
  }, [registrations]);

  const visibleActions = useMemo(() => {
    const merged = new Map<string, CommandAction>();

    for (const command of sortActions(coreActions)) {
      merged.set(command.id, command);
    }

    for (const command of contextualActions) {
      merged.set(command.id, command);
    }

    const normalizedQuery = query.trim().toLowerCase();

    return Array.from(merged.values())
      .filter((command) => command.isAvailable?.() ?? true)
      .map((command) => ({ command, score: scoreAction(command, normalizedQuery) }))
      .filter(({ score }) => Number.isFinite(score))
      .sort((a, b) => {
        if (a.score !== b.score) {
          return a.score - b.score;
        }

        return a.command.title.localeCompare(b.command.title);
      })
      .map(({ command }) => command);
  }, [contextualActions, coreActions, query]);

  const peopleResults = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const cached = getBestPeopleCache(peopleCache, normalizedQuery);

    if (normalizedQuery) {
      return cached;
    }

    const recent = cached.filter((item) => recentEntityIds.includes(item.id));
    const notRecent = cached.filter((item) => !recentEntityIds.includes(item.id));
    const orderedRecent = [...recent].sort(
      (a, b) => recentEntityIds.indexOf(a.id) - recentEntityIds.indexOf(b.id)
    );

    return [...orderedRecent, ...notRecent];
  }, [peopleCache, query, recentEntityIds]);

  const groupedItems = useMemo(
    () => toGroupedItems([...visibleActions, ...peopleResults]),
    [peopleResults, visibleActions]
  );

  const handleSelectItem = useCallback(
    async (item: CommandItem) => {
      try {
        await item.perform();
      } catch (error) {
        console.error('Failed to run command palette item:', error);
      }

      if (item.closeOnSelect ?? true) {
        closeCommandPalette();
      }
    },
    [closeCommandPalette]
  );

  const contextValue = useMemo<CommandPaletteContextValue>(
    () => ({
      isOpen,
      openCommandPalette,
      closeCommandPalette,
      toggleCommandPalette,
      registerCommands,
    }),
    [closeCommandPalette, isOpen, openCommandPalette, registerCommands, toggleCommandPalette]
  );

  return (
    <CommandPaletteContext.Provider value={contextValue}>
      {children}
      <CommandPalette
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (open) {
            openCommandPalette();
            return;
          }

          closeCommandPalette();
        }}
        query={query}
        onQueryChange={setQuery}
        groupedItems={groupedItems}
        isPeopleLoading={isPeopleLoading}
        onSelectItem={handleSelectItem}
      />
      <AddPersonSheet
        open={isAddPersonOpen}
        onOpenChange={setIsAddPersonOpen}
        showTrigger={false}
        onPersonCreated={(person) => {
          rememberEntity(`person:${person.id}`);
          navigate(`/app/${person.id}`);
        }}
      />
    </CommandPaletteContext.Provider>
  );
}

export function useCommandPalette() {
  const context = useContext(CommandPaletteContext);

  if (!context) {
    throw new Error('useCommandPalette must be used within a CommandPaletteProvider.');
  }

  return context;
}
