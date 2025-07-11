import { Inject, Injectable } from "@nestjs/common";
import { IUserLoginTokenRepository } from "../interfaces/repository";
import { DATABASE } from "src/drizzle/constants";
import {
  Database,
  IUserLoginToken,
  IUserLoginTokenInsertForm,
} from "src/drizzle/types";
import { UserLoginTokenTable } from "src/drizzle/schemas";
import { eq } from "drizzle-orm";
import { KalamcheError, KalamcheErrorType } from "src/filters/exception";

@Injectable()
export class UserLoginTokenRepository implements IUserLoginTokenRepository {
  constructor(@Inject(DATABASE) private db: Database) {}

  async findByUserId(userId: string): Promise<IUserLoginToken> {
    const [token] = await this.db
      .select()
      .from(UserLoginTokenTable)
      .where(eq(UserLoginTokenTable.userId, userId));

    if (!token) {
      throw new KalamcheError(KalamcheErrorType.NotFound);
    }

    return token;
  }

  // when login token for user already exists, for now we update the existing data,
  // TODO: check for others ways like adding another row of data for new user login token
  // this can be helpful for tracking user stolen tokens
  async insertOrUpdate(
    form: IUserLoginTokenInsertForm,
  ): Promise<IUserLoginToken> {
    const [token] = await this.db
      .insert(UserLoginTokenTable)
      .values(form)
      .onConflictDoUpdate({
        target: UserLoginTokenTable.userId,
        set: {
          createdAt: new Date(),
          userAgent: form.userAgent,
          ip: form.ip,
          token: form.token,
        },
      })
      .returning();

    return token;
  }
}
