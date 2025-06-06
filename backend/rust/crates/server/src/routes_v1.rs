use actix_web::{
  middleware::from_fn,
  web::{scope, ServiceConfig},
};
use routes::middleware::authorization;
use utils::rate_limit::RateLimiter;

pub fn routes_v1(cfg: &mut ServiceConfig, rate_limit: &RateLimiter) {
  cfg.service(
    scope("/api/v1")
      .service(
        scope("/auth")
          .wrap(rate_limit.register())
          .service(api::user::oauth_authorize::get_authorize_url)
          .service(api::user::refresh_token::refresh_token)
          .service(api::user::register::register)
          .service(api::user::login::login)
          .service(api_crud::user::create::authenticate_with_oauth)
          .service(api_crud::user::create::verify_email_registration)
          .service(api::user::resend_verification_email::resend_verification_code),
      )
      .service(
        scope("/user")
          .wrap(from_fn(authorization::authorization_middleware))
          .service(api_crud::user::my_user::get_my_user),
      )
      .service(
        scope("/payment")
          .wrap(rate_limit.payment())
          .wrap(from_fn(authorization::authorization_middleware))
          .service(api::ppt::list_all_plans::list_all_plans)
          .service(api::ppt::purchase_fr_token::create_checkout)
          .service(api::ppt::wallet::create::verify_payment),
      ),
  );
}
