import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { createAppError } from './errors';

const supabaseUrl = process.env.SUPABASE_URL;
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

const supabase =
  supabaseUrl && supabasePublishableKey
    ? createClient(supabaseUrl, supabasePublishableKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

export const extractBearerToken = (authorizationHeader: string | undefined) => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
};

export const verifySupabaseAccessToken = async (token: string) => {
  if (!supabase) {
    throw createAppError('Supabase auth is not configured.', 500);
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw createAppError('Invalid bearer token.', 401, 'UNAUTHORIZED');
  }

  return data.user;
};

export const createDeviceToken = () => randomBytes(32).toString('base64url');

export const hashDeviceToken = (token: string) =>
  createHash('sha256').update(token, 'utf8').digest('hex');

export const compareTokenHashes = (left: string, right: string) =>
  left.length === right.length && timingSafeEqual(Buffer.from(left), Buffer.from(right));
