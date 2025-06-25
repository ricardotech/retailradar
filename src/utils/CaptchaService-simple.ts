// Simplified CaptchaService - currently deactivated but kept for future use
export interface CaptchaConfig {
  apiKey: string;
  timeout?: number;
}

export class CaptchaService {
  private apiKey: string;
  private timeout: number;

  constructor(config: CaptchaConfig) {
    this.apiKey = config.apiKey;
    this.timeout = config.timeout ?? 60000;
  }

  public isConfigured(): boolean {
    return this.apiKey !== 'demo-key' && this.apiKey.length > 0;
  }

  // Currently deactivated - placeholder for future implementation
  public solveTurnstile(_siteKey: string, _pageUrl: string): Promise<string> {
    throw new Error('Captcha service is currently deactivated');
  }

  // Currently deactivated - placeholder for future implementation  
  public solveRecaptcha(siteKey: string, pageUrl: string): Promise<string> {
    throw new Error('Captcha service is currently deactivated');
  }
}