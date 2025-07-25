import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { RepositoryModule } from "src/repository/repository.module";
import { AuthUtilService } from "./util.service";
import { EmailModule } from "../email/email.module";
import { OauthController } from "./oauth/oauth.controller";
import { OAuthService } from "./oauth/oauth.service";
import { GithubOAuthService } from "./oauth/util-services/github-oauth.service";
import { DrizzleModule } from "src/drizzle/drizzle.module";
import { HttpModule } from "@nestjs/axios";
import { DiscordOAuthService } from "./oauth/util-services/discrod-oauth.service";

@Module({
  imports: [RepositoryModule, EmailModule, DrizzleModule, HttpModule],
  providers: [
    AuthService,
    AuthUtilService,
    OAuthService,
    GithubOAuthService,
    DiscordOAuthService,
  ],
  controllers: [AuthController, OauthController],
  exports: [AuthUtilService],
})
export class AuthModule {}
