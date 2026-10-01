# NestJS Setup (NestJS 12, Express 5 adapter)

## Contents
- Scaffold and dependencies
- main.ts
- app.module.ts (config validation, Mongo, global throttler)
- Environment
- Express 5 and ESM gotchas
- Run loop

Docs: https://docs.nestjs.com/ (append `.md` to any page URL for plain markdown).

## Scaffold and dependencies

`nest new` / `nest generate` need Node 22.22.3+, 24.15+ or 26+; running the app needs Node 20.19+ / 22.12+. Without a TTY the CLI defaults to an ESM project (Vitest + oxlint); pass `--no-observe` to skip the `@nestjs/observe` prompt.

```bash
npx @nestjs/cli@latest new extension-api --package-manager pnpm --no-observe
cd extension-api
pnpm add @nestjs/config @nestjs/mongoose mongoose @nestjs/throttler \
  class-validator class-transformer helmet google-auth-library zod
pnpm add stripe   # only if Stripe webhooks are in scope
```

`--strict` is the default. In ESM projects relative imports end in `.js` (`./app.module.js`) even though sources are `.ts`.

## main.ts

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { AppModule } from './app.module.js';

mongoose.set('sanitizeFilter', true); // wraps `$`-keyed filter objects in $eq (opt-in, off by default)

const app = await NestFactory.create<NestExpressApplication>(AppModule, {
  rawBody: true, // req.rawBody for webhook signature checks
});

app.set('trust proxy', 1); // behind a PaaS proxy; otherwise every user shares one IP for throttling
app.use(helmet());

const allowed = (process.env.ALLOWED_ORIGINS ?? '').split(',').filter(Boolean);
app.enableCors({
  origin: (origin, cb) => cb(null, !origin || allowed.includes(origin)),
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

app.useGlobalPipes(
  new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
);
app.setGlobalPrefix('api/v1', { exclude: ['health'] });
app.enableShutdownHooks();
await app.listen(process.env.PORT ?? 3000);
```

`!origin` lets server-to-server calls (webhooks, curl) through; they are authenticated by signature/token, not by CORS. Use bearer tokens, not cookies, so `credentials: true` is unnecessary.

## app.module.ts

```typescript
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { z } from 'zod';
import { AuthModule } from './auth/auth.module.js';
import { LicenseModule } from './license/license.module.js';
import { WebhookModule } from './webhook/webhook.module.js';
import { HealthController } from './health.controller.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: z.object({          // any Standard Schema lib; fails fast on boot
        PORT: z.coerce.number().default(3000),
        MONGODB_URI: z.string().startsWith('mongodb'),
        GOOGLE_CLIENT_ID: z.string().endsWith('.apps.googleusercontent.com'),
        ALLOWED_ORIGINS: z.string().min(1),
        STRIPE_SECRET_KEY: z.string().optional(),
        STRIPE_WEBHOOK_SECRET: z.string().optional(),
      }),
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ uri: config.getOrThrow<string>('MONGODB_URI') }),
    }),
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 60 }] }), // ttl in ms
    AuthModule,
    LicenseModule,
    WebhookModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }], // without this, no route is throttled
})
export class AppModule {}
```

```typescript
// health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

@SkipThrottle()
@Controller('health')
export class HealthController {
  @Get()
  check() { return { status: 'ok' }; }
}
```

## Environment

```bash
# .env (gitignored; commit a .env.example without values)
PORT=3000
MONGODB_URI=mongodb://localhost:27017/extension-api
GOOGLE_CLIENT_ID=1234-abc.apps.googleusercontent.com
# Comma-separated: unpacked dev ID and CWS ID differ unless the manifest pins `key`
ALLOWED_ORIGINS=chrome-extension://devidxxxxxxxxxxxxxxxxxxxxxxxxxxx,chrome-extension://cwsidxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Local MongoDB: `docker run -d -p 27017:27017 --name mongo mongo:8`, or a free Atlas cluster URI.

## Express 5 and ESM gotchas

- Wildcards must be named: `forRoutes('{*splat}')` / `@Get('files/*path')`, not `'*'`.
- Query strings use the `simple` parser: `?a[b]=1` is no longer an object. Restore with `app.set('query parser', 'extended')` only if a client depends on it.
- Register literal routes (`@Get('me')`) before param routes (`@Get(':id')`), or opt in to `routeConflictPolicy` / `routeResolutionStrategy: 'specificity'` in `NestFactory.create` options.
- Throw with a stable code clients can branch on: `new ForbiddenException('No license', { errorCode: 'LICENSE_REQUIRED' })`.
- No `__dirname` in ESM; use `import.meta.dirname`.

## Run loop

```bash
pnpm start:dev                                   # nest start --watch
curl -s localhost:3000/health                    # {"status":"ok"}
curl -si localhost:3000/api/v1/entitlement       # expect 401 without a token
pnpm build && node dist/main.js                  # production smoke
```
