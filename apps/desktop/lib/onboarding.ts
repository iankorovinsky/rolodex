const GETTING_STARTED_VERSION = 'v1';
const GETTING_STARTED_PREFIX = `rolodex:onboarding:getting-started:${GETTING_STARTED_VERSION}:`;

function getGettingStartedKey(userId: string) {
  return `${GETTING_STARTED_PREFIX}${userId}`;
}

export function hasCompletedGettingStarted(userId: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(getGettingStartedKey(userId)) === 'true';
}

export function markGettingStartedComplete(userId: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(getGettingStartedKey(userId), 'true');
}

export function resetGettingStartedForDev(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const keysToRemove: string[] = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);

    if (key?.startsWith(GETTING_STARTED_PREFIX)) {
      keysToRemove.push(key);
    }
  }

  for (const key of keysToRemove) {
    window.localStorage.removeItem(key);
  }
}
