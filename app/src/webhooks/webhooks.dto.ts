/* eslint-disable @typescript-eslint/no-unsafe-call */
import { IsIn, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateHookDto {
  @IsString()
  @IsOptional()
  schemaName: string = 'public';

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
export class UpdateHookDto {
  @IsString()
  @IsOptional()
  secret?: string;

  @IsUrl()
  @IsOptional()
  url?: string;

  @IsString()
  @IsOptional()
  schemaName?: string;

  @IsString()
  @IsOptional()
  tableName?: string;

  @IsString()
  @IsIn(['INSERT', 'UPDATE', 'DELETE'])
  @IsOptional()
  eventName?: string;
}

export type Hook = {
  id: number;
  schema_name: string;
  table_name: string;
  event_name: 'INSERT' | 'UPDATE' | 'DELETE';
  url: string;
  secret: string;
  active: boolean;
  created_at: string;
};
