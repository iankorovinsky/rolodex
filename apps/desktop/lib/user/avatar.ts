import type { AvatarIdValue } from '@rolodex/types';

export interface AvatarOption {
  id: AvatarIdValue;
  label: string;
  src: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: 'CAT', label: 'Cat', src: '/avatars/cat.svg' },
  { id: 'PANDA', label: 'Panda', src: '/avatars/panda.svg' },
  { id: 'BUNNY', label: 'Bunny', src: '/avatars/bunny.svg' },
  { id: 'BEAR', label: 'Bear', src: '/avatars/bear.svg' },
  { id: 'GORILLA', label: 'Gorilla', src: '/avatars/gorilla.svg' },
  { id: 'DUCK', label: 'Duck', src: '/avatars/duck.svg' },
  { id: 'GIRAFFE', label: 'Giraffe', src: '/avatars/giraffe.svg' },
  { id: 'PENGUIN', label: 'Penguin', src: '/avatars/penguin.svg' },
  { id: 'SHARK', label: 'Shark', src: '/avatars/shark.svg' },
  { id: 'DRAGON', label: 'Dragon', src: '/avatars/dragon.svg' },
];

export const DEFAULT_AVATAR_ID: AvatarIdValue = 'CAT';

export const getAvatarOption = (avatarId: AvatarIdValue | null | undefined): AvatarOption => {
  return AVATAR_OPTIONS.find((option) => option.id === avatarId) ?? AVATAR_OPTIONS[0];
};
