export class Webhook {
  id: number;

  tableName: string;

  eventName: 'INSERT' | 'UPDATE' | 'DELETE';

  url: string;

  secret: string;

  active: boolean;

  createdAt: Date;
}
