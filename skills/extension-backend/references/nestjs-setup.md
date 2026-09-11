# NestJS Setup for Extension Backend

**Docs**: https://docs.nestjs.com/

## Bootstrap

```typescript
// main.ts
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security
  app.use(helmet());
  app.enableCors({
    origin: [
      /^chrome-extension:\/\//, // All Chrome extensions (dev)
      "chrome-extension://YOUR_EXT_ID", // Production: restrict to your ID
    ],
    methods: ["GET", "POST"],
    credentials: true,
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip unknown properties
      forbidNonWhitelisted: true, // Throw on unknown properties
      transform: true, // Auto-transform types
    }),
  );

  app.setGlobalPrefix("api/v1");
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

## Root Module

```typescript
// app.module.ts
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./auth/auth.module";
import { LicenseModule } from "./license/license.module";
import { WebhookModule } from "./webhook/webhook.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>("MONGODB_URI"),
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }]),
    AuthModule,
    LicenseModule,
    WebhookModule,
  ],
})
export class AppModule {}
```

## Environment Config

```bash
# .env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/extension-backend
JWT_SECRET=your-secret-key
STRIPE_WEBHOOK_SECRET=whsec_xxx
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
ALLOWED_EXTENSION_ID=chrome-extension://abcdefgh
```

```typescript
// config/configuration.ts
export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  database: { uri: process.env.MONGODB_URI },
  jwt: { secret: process.env.JWT_SECRET },
  stripe: { webhookSecret: process.env.STRIPE_WEBHOOK_SECRET },
  google: { clientId: process.env.GOOGLE_CLIENT_ID },
  extension: { id: process.env.ALLOWED_EXTENSION_ID },
});
```

## Health Check

```typescript
// health.controller.ts
import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  check() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }
}
```

## Scripts (package.json)

```json
{
  "start:dev": "nest start --watch",
  "start:prod": "node dist/main",
  "build": "nest build",
  "test": "jest",
  "lint": "eslint \"{src,test}/**/*.ts\" --fix"
}
```
