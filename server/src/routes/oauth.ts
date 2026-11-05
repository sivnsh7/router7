import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import type { Platform } from '@router7/shared/types.js';
import {
  getSupportedOAuthProviders,
  initiateDeviceCode,
  pollDeviceToken,
  simulateDeviceApprove,
  generatePkceAuth,
  exchangeAuthCode,
  refreshOAuthToken,
  isOAuthPlatform,
} from '../services/oauth.js';

export const oauthRouter = Router();

// GET /api/oauth/providers — list all configured OAuth providers
oauthRouter.get('/providers', (_req: Request, res: Response) => {
  const providers = getSupportedOAuthProviders();
  res.json({ providers });
});

// POST /api/oauth/device/initiate — initiate RFC 8628 device flow
oauthRouter.post('/device/initiate', async (req: Request, res: Response) => {
  const schema = z.object({
    platform: z.string().refine(isOAuthPlatform, { message: 'Invalid or unsupported OAuth platform' }),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { message: parsed.error.errors.map(e => e.message).join(', ') } });
    return;
  }

  try {
    const session = await initiateDeviceCode(parsed.data.platform as Platform);
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

// POST /api/oauth/device/poll — poll for authorization grant
oauthRouter.post('/device/poll', async (req: Request, res: Response) => {
  const schema = z.object({
    platform: z.string().refine(isOAuthPlatform, { message: 'Invalid or unsupported OAuth platform' }),
    deviceCode: z.string().min(1, 'deviceCode is required'),
    label: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { message: parsed.error.errors.map(e => e.message).join(', ') } });
    return;
  }

  try {
    const result = await pollDeviceToken(parsed.data.platform as Platform, parsed.data.deviceCode, parsed.data.label);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

// POST /api/oauth/device/simulate-approve — simulate approval (testing & non-interactive flows)
oauthRouter.post('/device/simulate-approve', (req: Request, res: Response) => {
  const schema = z.object({
    deviceCode: z.string().min(1),
    accessToken: z.string().optional(),
    refreshToken: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { message: parsed.error.errors.map(e => e.message).join(', ') } });
    return;
  }

  const tokenData = parsed.data.accessToken
    ? { access_token: parsed.data.accessToken, refresh_token: parsed.data.refreshToken }
    : undefined;

  const approved = simulateDeviceApprove(parsed.data.deviceCode, tokenData);
  if (!approved) {
    res.status(404).json({ error: { message: 'Session not found or expired' } });
    return;
  }

  res.json({ success: true });
});

// POST /api/oauth/pkce/initiate — generate PKCE authorization URL
oauthRouter.post('/pkce/initiate', (req: Request, res: Response) => {
  const schema = z.object({
    platform: z.string().refine(isOAuthPlatform, { message: 'Invalid or unsupported OAuth platform' }),
    redirectUri: z.string().url('redirectUri must be a valid URL'),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { message: parsed.error.errors.map(e => e.message).join(', ') } });
    return;
  }

  try {
    const pkce = generatePkceAuth(parsed.data.platform as Platform, parsed.data.redirectUri);
    res.json(pkce);
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

// POST /api/oauth/pkce/exchange — exchange auth code with PKCE verifier
oauthRouter.post('/pkce/exchange', async (req: Request, res: Response) => {
  const schema = z.object({
    platform: z.string().refine(isOAuthPlatform, { message: 'Invalid or unsupported OAuth platform' }),
    code: z.string().min(1, 'code is required'),
    codeVerifier: z.string().min(1, 'codeVerifier is required'),
    redirectUri: z.string().optional(),
    label: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { message: parsed.error.errors.map(e => e.message).join(', ') } });
    return;
  }

  try {
    const result = await exchangeAuthCode(
      parsed.data.platform as Platform,
      parsed.data.code,
      parsed.data.codeVerifier,
      parsed.data.redirectUri,
      parsed.data.label,
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

// POST /api/oauth/token/refresh — manually or programmatically refresh token
oauthRouter.post('/token/refresh', async (req: Request, res: Response) => {
  const schema = z.object({
    keyId: z.number().int().positive('keyId is required'),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { message: parsed.error.errors.map(e => e.message).join(', ') } });
    return;
  }

  try {
    const result = await refreshOAuthToken(parsed.data.keyId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});
