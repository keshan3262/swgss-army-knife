import { dataSource } from './data-source';

export const withDataSourceInitialization = async (fn: (ds: typeof dataSource) => Promise<void>) => {
  try {
    await dataSource.initialize();
    try {
      await fn(dataSource);
    } finally {
      await dataSource.destroy();
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};
