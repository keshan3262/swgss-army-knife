import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ImageFormat } from './enums';

@Entity('conversion_handlers')
export class ConversionHandler {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ array: true, type: 'enum', enum: ImageFormat })
  sourceFormats!: ImageFormat[];

  @Column({ array: true, type: 'enum', enum: ImageFormat })
  destinationFormats!: ImageFormat[];

  @Column({ type: 'integer', default: 10 })
  ptsLeft!: number;
}
