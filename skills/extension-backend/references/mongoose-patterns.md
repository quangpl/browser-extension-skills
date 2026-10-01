# Mongoose Patterns (@nestjs/mongoose 12, Mongoose 9)

## Contents
- Schemas: User, License, ProcessedEvent
- License service (idempotent writes)
- Webhook idempotency helper
- Module registration
- Mongoose 9 gotchas

Docs: https://docs.nestjs.com/techniques/mongodb, https://mongoosejs.com/docs/

## Schemas

Schema classes are plain classes; the document type is `HydratedDocument<T>` (extending `Document` is the legacy pattern).

```typescript
// users/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true }) googleSub: string;   // stable id from the token
  @Prop() email?: string;                                      // may change; not a key
  @Prop() stripeCustomerId?: string;
}
export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);
```

```typescript
// license/license.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

export type LicenseStatus = 'active' | 'trialing' | 'past_due' | 'canceled'; // map other provider states onto these
export type Entitlement = { plan: 'free' | 'pro'; status: LicenseStatus | 'none'; features: string[]; currentPeriodEnd: string | null };
@Schema({ timestamps: true })
export class License {
  @Prop({ required: true, unique: true }) userSub: string;      // one license row per user
  @Prop({ required: true, type: String, enum: ['active', 'trialing', 'past_due', 'canceled'] })
  status: LicenseStatus;
  @Prop({ required: true, type: String, enum: ['pro'] }) plan: 'pro';
  @Prop() currentPeriodEnd?: Date;
  @Prop() provider?: string;                                    // 'stripe' | 'paddle' | ...
  @Prop({ index: true }) providerSubscriptionId?: string;
}
export type LicenseDocument = HydratedDocument<License>;
export const LicenseSchema = SchemaFactory.createForClass(License);
```

```typescript
// webhook/processed-event.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class ProcessedEvent {
  @Prop({ required: true, unique: true }) eventId: string;
  @Prop() type?: string;
}
export const ProcessedEventSchema = SchemaFactory.createForClass(ProcessedEvent);
ProcessedEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 }); // keep 30 days
```

Union-typed props need an explicit `type: String`; reflection only sees `Object`.

## License service

```typescript
// license/license.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { License, type Entitlement, type LicenseStatus } from './license.schema.js';
const ENTITLED: LicenseStatus[] = ['active', 'trialing'];
const PRO_FEATURES = ['sync', 'ai']; // feature keys the extension gates on

@Injectable()
export class LicenseService {
  constructor(@InjectModel(License.name) private readonly licenses: Model<License>) {}

  async entitlement(userSub: string): Promise<Entitlement> { // GET /api/v1/entitlement body
    const l = await this.licenses.findOne({ userSub }).lean().exec();
    const paid = !!l && ENTITLED.includes(l.status) && (!l.currentPeriodEnd || l.currentPeriodEnd > new Date());
    const currentPeriodEnd = l?.currentPeriodEnd?.toISOString() ?? null;
    return { plan: paid ? l!.plan : 'free', status: l?.status ?? 'none', features: paid ? PRO_FEATURES : [], currentPeriodEnd };
  }

  upsertFromProvider(userSub: string, data: Omit<License, 'userSub'>) { // unique key => replays are harmless
    return this.licenses
      .findOneAndUpdate({ userSub }, { $set: data }, { upsert: true, returnDocument: 'after' })
      .exec();
  }
}
```

## Webhook idempotency helper

```typescript
// webhook/webhook.service.ts (excerpt)
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { ProcessedEvent } from './processed-event.schema.js';

@Injectable()
export class WebhookService {
  constructor(@InjectModel(ProcessedEvent.name) private readonly events: Model<ProcessedEvent>) {}

  async handleOnce(eventId: string, type: string, apply: () => Promise<void>) {
    try {
      await this.events.create({ eventId, type });
    } catch (e) {
      if ((e as { code?: number }).code === 11000) return; // already processed
      throw e;
    }
    try {
      await apply();
    } catch (e) {
      await this.events.deleteOne({ eventId }); // let the provider's retry run it again
      throw e;
    }
  }
}
```

## Module registration

```typescript
// license/license.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module.js';
import { License, LicenseSchema } from './license.schema.js';
import { LicenseService } from './license.service.js';
import { EntitlementController } from './entitlement.controller.js';
@Module({
  imports: [AuthModule, MongooseModule.forFeature([{ name: License.name, schema: LicenseSchema }])], // AuthModule exports AuthService for AuthGuard
  providers: [LicenseService],
  controllers: [EntitlementController],
  exports: [LicenseService], // WebhookModule writes licenses
})
export class LicenseModule {}
```

## Mongoose 9 gotchas

- `findOneAndUpdate(..., { new: true })` prints a deprecation warning; use `returnDocument: 'after'`.
- Pre middleware no longer receives `next()`; write `schema.pre('save', async function () { ... })`.
- Node 20.19+ is required; the index `background` option is removed. `autoIndex` builds indexes on boot; for large production collections create them in a migration and set `autoIndex: false`.
