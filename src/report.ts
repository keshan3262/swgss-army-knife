import { logger } from "./data-source";
import { Conversion } from "./entities/conversion";
import { ConversionStatus } from "./entities/enums";
import { seed } from "./seed-fn";
import { withDataSourceInitialization } from "./with-data-source-initialization";

withDataSourceInitialization(async ds => {
  logger.echo = false;
  await seed(ds);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const report = await ds
    .getRepository(Conversion)
    .createQueryBuilder('c')
    .select('c.status', 'status')
    .addSelect('COUNT(c.status)', 'count')
    .where('c.created_at >= :startOfMonth', { startOfMonth })
    .groupBy('c.status')
    .getRawMany<{ count: number; status: ConversionStatus }>();
  console.log('Statuses of conversions created this month:');
  console.log(report);
});
