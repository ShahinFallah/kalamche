import { InferInsertModel, InferSelectModel, relations } from "drizzle-orm";
import { index, pgTable } from "drizzle-orm/pg-core";
import { UserPermissionSchema } from "./user-permission.schema";
import { OAuthAccountSchema } from "./oauth-account.schema";
import { LoginTokenSchema } from "./login-token.schema";
import { PaymentHistorySchema } from "./payment-history";
import { WalletSchema } from "./wallet.schema";

export const UserSchema = pgTable(
  "users",
  (table) => ({
    id: table.bigserial({ mode: "number" }).primaryKey(),
    name: table.varchar({ length: 255 }).notNull(),
    email: table.varchar({ length: 255 }).notNull().unique(),
    avatarUrl: table.varchar({ length: 300 }).notNull().default("#"),
    passwordHash: table.varchar({ length: 300 }),
    createdAt: table.timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: table
      .timestamp({ withTimezone: true })
      .defaultNow()
      .$onUpdateFn(() => new Date())
      .notNull(),
  }),
  (table) => [index("idx_user_email").on(table.email)],
);

export const UserTableRelations = relations(UserSchema, ({ many, one }) => ({
  permissions: many(UserPermissionSchema, {
    relationName: "fk_user_permission_permission",
  }),
  oauthAccount: one(OAuthAccountSchema),
  loginToken: one(LoginTokenSchema),
  paymentHistory: many(PaymentHistorySchema, {
    relationName: "user_payment_history",
  }),
  wallet: one(WalletSchema),
}));

export type User = InferSelectModel<typeof UserSchema>;
export type UserRecord = Omit<User, "updatedAt" | "passwordHash"> & {
  permissions: string[];
};
export type InsertUser = InferInsertModel<typeof UserSchema>;
