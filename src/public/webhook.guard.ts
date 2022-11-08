import { CanActivate, ExecutionContext, mixin, Type } from '@nestjs/common'

const WebHookGuard = (): Type<CanActivate> => {
  class WebHookGuard implements CanActivate {
    canActivate(context: ExecutionContext) {
      const request = context.switchToHttp().getRequest<any>();
      const apiKey = request.query.apiKey
      return process.env.WEBHOOK_KEY == apiKey
    }
  }

  return mixin(WebHookGuard);
}

export default WebHookGuard;