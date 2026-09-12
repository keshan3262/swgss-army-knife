import { Check, Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Conversion } from "./conversion";

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'text', unique: true })
  @Check("email ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,}$' AND length(email) <= 254")
  email!: string;

  @Column({ type: 'text', unique: true })
  @Check("username ~ '^[a-zA-Z0-9_-]+$' AND length(username) <= 32 AND length(username) >= 3")
  username!: string;

  @OneToMany(() => Conversion, (conversion) => conversion.user)
  conversions!: Conversion[];
}
