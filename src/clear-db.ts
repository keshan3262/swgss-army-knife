import type { dataSource } from './data-source';

export const clearDb = async (ds: typeof dataSource) => {
  await ds.query(`DELETE FROM conversion_handlers`);
  await ds.query(`DELETE FROM converted_versions`);
  await ds.query(`DELETE FROM source_images`);
  await ds.query(`DELETE FROM conversions`);
  await ds.query(`DELETE FROM users`);
};
