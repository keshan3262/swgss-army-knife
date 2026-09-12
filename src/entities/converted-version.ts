import { Check, Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { SourceImage } from "./source-image";
import { ImageFormat } from "./enums";

@Entity('converted_versions')
export class ConvertedVersion {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @OneToOne(() => SourceImage, sourceImage => sourceImage.convertedVersion, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'source_image_id' })
  sourceImage!: SourceImage;

  @Column({ type: 'enum', enum: ImageFormat })
  format!: ImageFormat;

  @Column({ type: 'bigint' })
  @Check("size > 0")
  size!: string;

  @Column({ type: 'text', unique: true })
  @Check("storage_url ~ '^https?://'")
  storageUrl!: string;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}
