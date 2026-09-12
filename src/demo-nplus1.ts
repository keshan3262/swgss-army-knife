import { MoreThanOrEqual, IsNull, Not } from 'typeorm';
import { logger } from './data-source';
import { Conversion } from './entities/conversion';
import { ConversionStatus } from './entities/enums';
import { SourceImage } from './entities/source-image';
import { seed } from './seed-fn';
import { withDataSourceInitialization } from './with-data-source-initialization';

withDataSourceInitialization(async ds => {
  logger.echo = false;
  await seed(ds);
  logger.echo = true;

  logger.reset();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const conversions = await ds.getRepository(Conversion).find({
    where: { status: ConversionStatus.FAILED, createdAt: MoreThanOrEqual(startOfMonth) },
    order: { createdAt: 'DESC' }
  });
  for (const conversion of conversions) {
    const conversionImagesWithErrors = await ds.getRepository(SourceImage).find({
      where: { conversion: { id: conversion.id }, conversionError: Not(IsNull()) }
    });
    void conversionImagesWithErrors;
  }
  console.log(`N+1 queries: ${logger.count}`);

  logger.reset();
  const conversionImagesWithErrors = await ds.getRepository(SourceImage).find({
    where: {
      conversionError: Not(IsNull()),
      conversion: { status: ConversionStatus.FAILED, createdAt: MoreThanOrEqual(startOfMonth) },
    },
    relations: ['conversion'],
    order: { conversion: { createdAt: 'DESC' } }
  });
  void conversionImagesWithErrors;
  console.log(`Queries with relations: ${logger.count}`);
});
