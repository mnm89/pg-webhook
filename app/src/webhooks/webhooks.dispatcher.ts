/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Inject, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { catchError, delay, mergeMap, of, tap } from 'rxjs';
import * as crypto from 'crypto';
import { DbService } from '../db/db.service';
import { Hook } from './webhooks.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WebhookDispatcherService {
  private readonly logger = new Logger(WebhookDispatcherService.name);
  @Inject()
  private readonly config: ConfigService;
  @Inject()
  private readonly db: DbService;
  @Inject()
  private readonly http: HttpService;

  private get maxRetries() {
    return this.config.get<number>('WEBHOOK_MAX_RETRIES')!;
  }
  private get retryDelay() {
    return this.config.get<number>('WEBHOOK_RETRY_DELAY')!;
  }

  dispatch(hook: Hook, payload: any) {
    const signature = this.signPayload(payload, hook.secret);
    this.logger.debug(`webhook signature: ${signature}`);
    return of(null).pipe(
      mergeMap(() => this.sendRequest(hook, payload, signature, 1)),
    );
  }

  private sendRequest(
    hook: Hook,
    payload: any,
    signature: string,
    attempt: number,
  ) {
    const start = Date.now();
    this.logger.log(`Sending webhook ${hook.url} [attempt ${attempt}]`);

    return this.http
      .post(hook.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
        },
        timeout: 5000,
      })
      .pipe(
        tap((response) => {
          const responseTime = Date.now() - start;
          void this.logAttempt(
            hook.id,
            payload,
            response.status,
            response.data,
            true,
            null,
            attempt,
            responseTime,
          );
          this.logger.log(
            `Webhook succeeded: ${hook.url} [attempt ${attempt}]`,
          );
        }),
        catchError((error) => {
          const responseTime = Date.now() - start;
          const statusCode = error.response?.status ?? null;
          const responseBody = error.response?.data ?? null;
          const errMsg = error.message ?? 'Unknown error';

          void this.logAttempt(
            hook.id,
            payload,
            statusCode,
            responseBody,
            false,
            errMsg,
            attempt,
            responseTime,
          );

          if (attempt < this.maxRetries) {
            const delayMs = this.retryDelay * attempt; // exponential backoff
            this.logger.warn(
              `Retrying webhook ${hook.url} in ${delayMs}ms [attempt ${attempt}]`,
            );
            return of(null).pipe(
              delay(delayMs),
              mergeMap(() =>
                this.sendRequest(hook, payload, signature, attempt + 1),
              ),
            );
          }

          this.logger.error(
            `Webhook failed after ${attempt} attempts: ${hook.url} - ${errMsg}`,
          );
          return of(null); // prevent stream from breaking
        }),
      );
  }

  private signPayload(payload: any, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  private async logAttempt(
    hookId: number,
    payload: any,
    statusCode: number | null,
    responseBody: any,
    success: boolean,
    error: string | null,
    attemptNumber: number,
    responseTimeMs: number,
  ) {
    await this.db.query(
      `
      INSERT INTO webhook.logs
        (hook_id, status_code, response_time_ms, attempt_number, request_payload, response_body, success, error)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `,
      [
        hookId,
        statusCode,
        responseTimeMs,
        attemptNumber,
        payload,
        responseBody,
        success,
        error,
      ],
    );
  }
}
