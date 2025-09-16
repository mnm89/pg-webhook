import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';

@Injectable()
export class WebhooksGuard implements CanActivate {
  @Inject()
  private readonly configService: ConfigService;

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const apiKeyHeader = request.headers['x-api-key'];
    const validKey = this.configService.get<string>('WEBHOOKS_API_KEY');

    if (!apiKeyHeader || apiKeyHeader !== validKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }
}
