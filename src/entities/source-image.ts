import { Check, Column, Entity, Index, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Conversion } from './conversion';
import { ImageFormat } from './enums';
import { ConvertedVersion } from './converted-version';

@Entity('source_images')
@Index('idx_source_images_conversion_id', ['conversion.id'])
export class SourceImage {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @ManyToOne(() => Conversion, conversion => conversion.sourceImages, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversion_id' })
  conversion!: Conversion;

  @Column({ type: 'enum', enum: ImageFormat })
  format!: ImageFormat;

  @Column({ type: 'text' })
  @Check("length(original_name) <= 255 AND length(original_name) >= 1")
  originalName!: string;

  @Column({ type: 'bigint' })
  @Check("size > 0")
  size!: string;

  @Column({ type: 'text', unique: true })
  @Check("storage_url ~ '^https?://'")
  storageUrl!: string;

  @Column({ type: 'text', nullable: true })
  conversionError!: string | null;

  @OneToOne(() => ConvertedVersion, (convertedVersion) => convertedVersion.sourceImage, { nullable: true })
  convertedVersion!: ConvertedVersion | null;
}
