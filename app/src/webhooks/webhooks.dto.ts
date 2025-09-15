/* eslint-disable @typescript-eslint/no-unsafe-call */
import { IsIn, IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class CreateHookDto {
  @IsString()
  @IsNotEmpty()
  schemaName: string;

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

export class GetHookDto {
  id: number;
  schemaName: string;
  tableName: string;
  eventName: 'INSERT' | 'UPDATE' | 'DELETE';
  url: string;
  secret: string;
  active: boolean;
  createdAt: Date;
}
