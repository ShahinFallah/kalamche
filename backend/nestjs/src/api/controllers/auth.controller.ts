import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import { Request, Response } from "express";
import { ConfigService } from "src/config/config.service";
import { AuthService } from "src/service/services/auth.service";
import {
  AuthenticateWIthOAuthDto,
  GetAuthorizeUrlResponse,
  LoginResponse,
  RefreshTokenResponse,
} from "../common/auth-generated-types";
import { REFRESH_TOKEN_COOKIE_NAME } from "../common/shared-constants";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Get("/oauth")
  public getAuthorizeUrl(
    @Query("provider") query: string,
  ): GetAuthorizeUrlResponse {
    const url = this.config.authOptions.oauthManager?.getAuthorizeUrl(query);
    return { success: true, url: url! };
  }

  @Get("/oauth/callback")
  public async authenticateWithOAuth(
    @Query() query: AuthenticateWIthOAuthDto,
    @Res() response: Response,
  ) {
    const oauthUser = await this.config.authOptions.oauthManager?.authenticate(
      query.provider,
      query.code,
    );
    const result = await this.authService.oauthRegister(oauthUser!);

    response
      .status(201)
      .cookie(
        REFRESH_TOKEN_COOKIE_NAME,
        result.refreshToken,
        this.config.authOptions.cookieOptions,
      )
      .json(<LoginResponse>{
        success: true,
        accessToken: result.accessToken,
        user: result.user,
      });
  }

  @Get("/token/refresh")
  public async refreshToken(@Req() req: Request, @Res() res: Response) {
    const refreshToken = req.cookies["refresh_token"] as string | undefined;
    if (!refreshToken) {
      throw new UnauthorizedException();
    }
    const tokens = await this.authService.refreshToken(refreshToken);

    res
      .status(200)
      .cookie(
        REFRESH_TOKEN_COOKIE_NAME,
        tokens.refreshToken,
        this.config.authOptions.cookieOptions,
      )
      .json(<RefreshTokenResponse>{
        success: true,
        accessToken: tokens.accessToken,
      });
  }
}
