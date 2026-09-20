import { Controller, Get, Query, Res, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { timingSafeEqual } from 'crypto';
import { GmailOAuth2Service } from './gmail-oauth2.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('auth')
export class GmailAuthController {
  private readonly logger = new Logger(GmailAuthController.name);

  constructor(
    private readonly gmailOAuth2Service: GmailOAuth2Service,
    private readonly configService: ConfigService,
  ) {}

  private isValidState(state?: string) {
    const expected = this.configService.get<string>('GMAIL_OAUTH_STATE');
    if (!expected) return true;
    if (!state) return false;

    const expectedBuffer = Buffer.from(expected);
    const stateBuffer = Buffer.from(state);
    return (
      expectedBuffer.length === stateBuffer.length &&
      timingSafeEqual(expectedBuffer, stateBuffer)
    );
  }

  @Public()
  @Get('google')
  async googleAuth(@Res() res: Response) {
    try {
      const authUrl = this.gmailOAuth2Service.getAuthUrl(
        this.configService.get<string>('GMAIL_OAUTH_STATE'),
      );
      res.redirect(authUrl);
    } catch (error) {
      this.logger.error('Error generating auth URL:', error);
      res.status(500).json({ error: 'Failed to generate authorization URL' });
    }
  }

  @Public()
  @Get('google/callback')
  async googleAuthCallback(
    @Query('code') code: string,
    @Query('error') error: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    if (error) {
      this.logger.error('OAuth error:', error);
      return res.status(400).json({ error });
    }

    if (!code) {
      return res.status(400).json({ error: 'No authorization code provided' });
    }

    if (!this.isValidState(state)) {
      this.logger.warn('Rejected Gmail OAuth callback with invalid state');
      return res.status(400).json({ error: 'Invalid OAuth state' });
    }

    try {
      const tokens = await this.gmailOAuth2Service.getTokensFromCode(code);
      
      this.logger.log('OAuth tokens obtained successfully');

      res.json({
        success: true,
        message: 'Gmail authorization completed and stored securely.',
      });
    } catch (error) {
      this.logger.error('Error exchanging code for tokens:', error);
      res.status(500).json({ error: 'Failed to exchange authorization code' });
    }
  }
}
