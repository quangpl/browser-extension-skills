# Mongoose Patterns for Extension Backend

**Docs**: https://mongoosejs.com/docs/

## User Schema

```typescript
// auth/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true, index: true })
  email: string;

  @Prop({ required: true })
  googleId: string;

  @Prop({ default: "free", enum: ["free", "premium", "enterprise"] })
  plan: string;

  @Prop()
  stripeCustomerId?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
```

## License Schema

```typescript
// license/schemas/license.schema.ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ timestamps: true })
export class License extends Document {
  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: ["active", "expired", "cancelled"] })
  status: string;

  @Prop({ required: true })
  plan: string;

  @Prop()
  expiresAt?: Date;

  @Prop()
  providerSubscriptionId?: string;

  @Prop({
    default: "stripe",
    enum: ["stripe", "paddle", "lemonsqueezy", "polar"],
  })
  provider: string;
}

export const LicenseSchema = SchemaFactory.createForClass(License);
// Index for fast lookups
LicenseSchema.index({ userId: 1, status: 1 });
```

## Service Pattern

```typescript
// license/license.service.ts
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { License } from "./schemas/license.schema";

@Injectable()
export class LicenseService {
  constructor(
    @InjectModel(License.name) private licenseModel: Model<License>,
  ) {}

  async findActiveByUserId(userId: string): Promise<License | null> {
    return this.licenseModel
      .findOne({
        userId,
        status: "active",
        $or: [{ expiresAt: { $gt: new Date() } }, { expiresAt: null }],
      })
      .exec();
  }

  async activate(
    userId: string,
    plan: string,
    subscriptionId: string,
    provider: string,
  ) {
    return this.licenseModel
      .findOneAndUpdate(
        { userId },
        {
          status: "active",
          plan,
          providerSubscriptionId: subscriptionId,
          provider,
        },
        { upsert: true, new: true },
      )
      .exec();
  }

  async deactivate(subscriptionId: string) {
    return this.licenseModel
      .findOneAndUpdate(
        { providerSubscriptionId: subscriptionId },
        { status: "cancelled" },
      )
      .exec();
  }
}
```

## Module Registration

```typescript
// license/license.module.ts
import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { License, LicenseSchema } from "./schemas/license.schema";
import { LicenseService } from "./license.service";
import { LicenseController } from "./license.controller";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: License.name, schema: LicenseSchema }]),
  ],
  providers: [LicenseService],
  controllers: [LicenseController],
  exports: [LicenseService],
})
export class LicenseModule {}
```

## Query Patterns

```typescript
// Find with pagination
async findAll(page = 1, limit = 20) {
  return this.licenseModel
    .find()
    .skip((page - 1) * limit)
    .limit(limit)
    .sort({ createdAt: -1 })
    .exec();
}

// Aggregation (monthly stats)
async monthlyStats() {
  return this.licenseModel.aggregate([
    { $match: { status: 'active' } },
    { $group: { _id: '$plan', count: { $sum: 1 } } },
  ]);
}
```

## Best Practices

- Always add `index: true` on fields used in queries (email, userId)
- Use `timestamps: true` on all schemas (auto createdAt/updatedAt)
- Use `lean()` for read-only queries (returns plain objects, faster)
- Use `select()` to return only needed fields
- Use `enum` validators on string fields with fixed values
- Use `findOneAndUpdate` with `upsert` for idempotent operations
