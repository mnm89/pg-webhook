/* eslint-disable @typescript-eslint/no-unsafe-call */
import { IsIn, IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class CreateWebhookDto {
  @IsString()
  @IsNotEmpty()
  tableName: string;

  @IsString()
  @IsIn(['INSERT', 'UPDATE', 'DELETE'])
  eventName: string;

  @IsUrl()
  url: string;

  @IsString()
  @IsNotEmpty()
  secret: string;
}
