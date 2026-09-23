import { liveAvatarConfig } from './liveavatarConfig';

const API = 'https://api.liveavatar.com/v1';
export async function heygenRequest(path: string, init: RequestInit = {}) {
  const { apiKey } = liveAvatarConfig();
  if (!apiKey) throw new Error('Configure the LiveAvatar API key before publishing.');
  const response = await fetch(`${API}${path}`, {
/* step 1 initialization */
