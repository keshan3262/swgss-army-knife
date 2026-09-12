import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user';
import { ConversionStatus, ImageFormat } from './enums';
import { SourceImage } from './source-image';

@Entity('conversions')
@Index('idx_conversions_user_id', ['user.id'])
@Index('idx_failed_conversions', ['createdAt'], { where: "status = 'failed'" })
export class Conversion {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @ManyToOne(() => User, user => user.conversions, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'enum', enum: ImageFormat })
  destinationFormat!: ImageFormat;

  @Column({ type: 'enum', enum: ConversionStatus, default: ConversionStatus.PENDING })
  status!: ConversionStatus;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @OneToMany(() => SourceImage, (sourceImage) => sourceImage.conversion, { cascade: true })
  sourceImages!: SourceImage[];
}
