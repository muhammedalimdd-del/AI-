import { UserAccount } from '../types/client.ts';

export const auth: { currentUser: any } = { currentUser: null };

export const initAuthListener = (
  onUserChanged: (user: any | null, profile: UserAccount | null) => void
) => {
  onUserChanged(null, null);
  return () => {};
};

export const getCachedAccessToken = (): string | null => {
  return null;
};
