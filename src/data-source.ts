import 'reflect-metadata';
import { DataSource, AbstractLogger, LogMessage, LogLevel } from 'typeorm';
import { readFile } from 'node:fs/promises';
import { Conversion } from './entities/conversion';
import { User } from './entities/user';
import { SourceImage } from './entities/source-image';
import { ConvertedVersion } from './entities/converted-version';
import path from 'node:path';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

export class QueryCountLogger extends AbstractLogger {
  count = 0;
  echo = false;

  reset() {
    this.count = 0;
  }

  protected writeLog(level: LogLevel, messages: LogMessage | LogMessage[]) {
    for (const m of Array.isArray(messages) ? messages : [messages]) {
      if (m.type === 'query') {
        this.count += 1;
        if (this.echo) {
          console.log(`  SQL#${this.count}: ${String(m.message).slice(0, 110)}`);
        }
        continue;
      }

      // TypeORM CLI (migration:show / migrate) reports status via schema-build logs.
      if (m.message != null) {
        console.log(String(m.message));
      }
    }
  }
}

export const logger = new QueryCountLogger(['query', 'schema']);

export const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DB_URL!,
  entities: [User, Conversion, SourceImage, ConvertedVersion],
  migrations: [path.join(__dirname, '../dist/migrations/*.js')],
  logger: logger,
  synchronize: false,
  namingStrategy: new SnakeNamingStrategy()
});
