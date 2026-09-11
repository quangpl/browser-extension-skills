# Security Patterns for Extension Backend

## Auth Guard (Google OAuth Token Verification)

```typescript
// auth/guards/auth.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "../auth.service";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.replace("Bearer ", "");
    if (!token) throw new UnauthorizedException("Missing token");

    const user = await this.authService.verifyGoogleToken(token);
    if (!user) throw new UnauthorizedException("Invalid token");

    request.user = user;
    return true;
  }
}
```

## Google Token Verification

```typescript
// auth/auth.service.ts
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AuthService {
  constructor(private config: ConfigService) {}

  async verifyGoogleToken(token: string) {
    const res = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`,
    );
    if (!res.ok) return null;

    const payload = await res.json();
    const clientId = this.config.get("GOOGLE_CLIENT_ID");
    if (payload.aud !== clientId) return null;

    return { email: payload.email, sub: payload.sub };
  }
}
```

## Rate Limiting

```typescript
// Applied globally via ThrottlerModule in app.module.ts
// Per-route override:
import { Throttle, SkipThrottle } from '@nestjs/throttler';

@Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 req/min
@Post('verify-token')
async verifyToken() { /* ... */ }

@SkipThrottle() // No limit on health check
@Get('health')
health() { return { status: 'ok' }; }
```

## Webhook Signature Verification (Stripe)

```typescript
// webhook/webhook.controller.ts
import {
  Controller,
  Post,
  Req,
  Res,
  Headers,
  RawBodyRequest,
} from "@nestjs/common";
import Stripe from "stripe";

@Controller("webhook")
export class WebhookController {
  private stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  @Post("stripe")
  async handleStripe(
    @Req() req: RawBodyRequest<Request>,
    @Headers("stripe-signature") sig: string,
    @Res() res: Response,
  ) {
    try {
      const event = this.stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
      await this.processEvent(event);
      res.status(200).json({ received: true });
    } catch (err) {
      res.status(400).json({ error: "Invalid signature" });
    }
  }
}
```

> **Important**: Webhook endpoints must receive raw body. Configure NestJS with `rawBody: true` in `NestFactory.create`.

## CORS for Chrome Extensions

```typescript
// Restrict to your extension ID in production
app.enableCors({
  origin: (origin, cb) => {
    const allowed = [/^chrome-extension:\/\//];
    if (!origin || allowed.some((p) => p.test(origin))) cb(null, true);
    else cb(new Error("CORS blocked"));
  },
  methods: ["GET", "POST"],
  credentials: true,
});
```

## Input Validation (DTOs)

```typescript
// common/dto/verify-license.dto.ts
import { IsEmail, IsString, IsNotEmpty } from "class-validator";

export class VerifyLicenseDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  extensionId: string;
}
```

## Security Checklist

- [ ] `helmet()` enabled (sets security headers)
- [ ] CORS restricted to `chrome-extension://YOUR_ID`
- [ ] Rate limiting on all endpoints
- [ ] Webhook signature verified before processing
- [ ] All DTOs use class-validator
- [ ] No stack traces in production errors
- [ ] Secrets in .env, never committed
- [ ] HTTPS enforced in production
