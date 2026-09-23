import { createHash } from 'node:crypto';
import type { PersonaSettings } from '@/types';
import { prisma } from './db';
import { redisStrictCommand } from './redis';
import { contextPrompt, heygenRequest, publishedVoiceSettings, RESPONSE_STYLE } from './heygenContext';

export const PUBLISHED_PERSONA_KEY = 'avatar:persona:published:v1';
export interface PublishedPersona {
  openingIntro: string;
  persona: string;
  instructions: string;
  version: string;
  publishedAt: string;
  savedAt: string;
  contextId?: string;
  contentHash?: string;
/* step 1 initialization */
