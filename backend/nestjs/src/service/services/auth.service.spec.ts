import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { Postgres } from "src/drizzle/types";
import { PermissionService } from "./permission.service";
import { TokenService } from "./token.service";
import { DrizzleModule } from "src/drizzle/drizzle.module";
import { ConfigModule } from "src/config/config.module";
import { DATABASE_CONNECTION } from "src/drizzle";
import { sql } from "drizzle-orm";
import { seedDefaultPermissions } from "src/drizzle/seed/permissions.seed";
import { migration } from "src/drizzle/migration";
import { ConfigService } from "src/config/config.service";
import { OAuthUser } from "src/config/auth/oauth-clients";

describe("AuthService", () => {
  let app: TestingModule;
  let authService: AuthService;
  let connection: Postgres;
  let permissionService: PermissionService;
  let tokenService: TokenService;
  let config: ConfigService;

  const testOAuthUser: OAuthUser = {
    id: "84938493",
    email: "auth.test.integration@example.com",
    name: "Test Integration User",
    avatarUrl: "https://example.com/test-avatar.jpg",
  };

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [ConfigModule, DrizzleModule.forTest()],
      providers: [AuthService, TokenService, PermissionService],
    }).compile();

    authService = app.get<AuthService>(AuthService);
    connection = app.get<Postgres>(DATABASE_CONNECTION);
    permissionService = app.get<PermissionService>(PermissionService);
    tokenService = app.get<TokenService>(TokenService);
    config = app.get<ConfigService>(ConfigService);
  });

  beforeEach(async () => {
    await migration();

    await Promise.all([
      connection.execute(sql`TRUNCATE TABLE users CASCADE`),
      connection.execute(sql`TRUNCATE TABLE permissions CASCADE`),
      config.systemOpitons.cacheSterategy.clear(),
    ]);

    await seedDefaultPermissions();
  });

  describe("FindOrCreateUser", () => {
    it("should create a new user when not found", async () => {
      const user =
        await authService["findUserByOAuthAccountOrCreate"](testOAuthUser);

      expect(user).toBeDefined();
      expect(user.email).toBe(testOAuthUser.email);
      expect(user.name).toBe(testOAuthUser.name);
      expect(user.avatarUrl).toBe(testOAuthUser.avatarUrl);

      const savedUser = await connection.query.UserSchema.findFirst({
        where: (table, funcs) => funcs.eq(table.id, user.id),
      });

      expect(savedUser).toBeDefined();
      expect(savedUser!.id).toBe(user.id);

      const permissions = await permissionService.getUserPermissions(user.id);
      expect(permissions).toBeDefined();
      expect(permissions.length).toBeGreaterThan(0);

      const oauthAccount = await connection.query.OAuthAccountSchema.findFirst({
        where: (table, funcs) => funcs.eq(table.userId, user.id),
      });

      expect(oauthAccount).toBeDefined();
      expect(oauthAccount?.oauthUserId).toBe(testOAuthUser.id);
    });

    it("should return existing user when found", async () => {
      const createdUser =
        await authService["findUserByOAuthAccountOrCreate"](testOAuthUser);
      const existingUser =
        await authService["findUserByOAuthAccountOrCreate"](testOAuthUser);

      expect(existingUser).toBeDefined();
      expect(existingUser.id).toBe(createdUser.id);
      expect(existingUser.email).toBe(testOAuthUser.email);
    });
  });

  describe("oauthRegister", () => {
    it("sould register user with tokens", async () => {
      const user = await authService.oauthRegister(testOAuthUser);

      expect(user).toBeDefined();
      expect(user.user).toBeDefined();
      expect(user.user.email).toBeDefined();
      expect(user.accessToken).toBeDefined();
      expect(user.refreshToken).toBeDefined();

      const claims = tokenService.decodeRefreshToken(user.refreshToken);
      expect(claims).toBeDefined();
      expect(claims.sub).toBe(user.user.id);

      const savedUser = await connection.query.UserSchema.findFirst({
        where: (table, funcs) => funcs.eq(table.id, user.user.id),
      });
      expect(savedUser).toBeDefined();
      expect(savedUser!.id).toBe(user.user.id);
    });

    it("sould return exstingUser with new tokens on register", async () => {
      const firstRegistration = await authService.oauthRegister(testOAuthUser);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const secondRegistration = await authService.oauthRegister(testOAuthUser);

      expect(secondRegistration.user.id).toBe(firstRegistration.user.id);
      expect(secondRegistration.accessToken).not.toBe(
        firstRegistration.accessToken,
      );
      expect(secondRegistration.refreshToken).not.toBe(
        firstRegistration.refreshToken,
      );
    });

    it("should handle concurrent registration", async () => {
      const result = await Promise.all([
        await authService.oauthRegister(testOAuthUser),
        await authService.oauthRegister(testOAuthUser),
        await authService.oauthRegister(testOAuthUser),
      ]);

      const userIds = result.map((user) => user.user.id);
      expect(new Set(userIds).size).toBe(1);
    });
  });

  describe("refreshToken", () => {
    it("should update user and return new tokens", async () => {
      const user = await authService.oauthRegister(testOAuthUser);
      const currentUser = await connection.query.UserSchema.findFirst({
        where: (table, funcs) => funcs.eq(table.id, user.user.id),
        with: {
          loginToken: true,
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));
      const tokens = await authService.refreshToken(user.refreshToken);

      expect(tokens).toBeDefined();
      expect(tokens.accessToken).not.toBe(user.accessToken);
      expect(tokens.refreshToken).not.toBe(user.refreshToken);

      const updatedUser = await connection.query.UserSchema.findFirst({
        where: (table, funcs) => funcs.eq(table.id, user.user.id),
        with: {
          loginToken: true,
        },
      });

      expect(updatedUser?.loginToken?.published.getTime()).toBeGreaterThan(
        currentUser!.loginToken!.published.getTime(),
      );

      expect(updatedUser?.loginToken?.tokenHash).not.toBe(
        currentUser?.loginToken?.tokenHash,
      );
    });

    it("should refresh tokens and add old tokens in blacklist", async () => {
      const user = await authService.oauthRegister(testOAuthUser);

      await new Promise((resolve) => setTimeout(resolve, 1000));
      await authService.refreshToken(user.refreshToken);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      await expect(authService.refreshToken(user.refreshToken)).rejects.toThrow(
        "Forbidden",
      );
    });
  });

  afterAll(async () => {
    await config.systemOpitons.cacheSterategy.close();
    await app.close();
  });
});
