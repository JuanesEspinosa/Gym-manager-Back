import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Client } from '../../clients/entities/client.entity';
import { Location } from '../../locations/entities/location.entity';

export enum AccessMethod {
  RFID = 'rfid',
  FINGERPRINT = 'fingerprint',
}

@Entity('access_logs')
export class AccessLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Client)
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @Column({ type: 'uuid' })
  client_id: string;

  @Column({ type: 'uuid' })
  company_id: string;

  @ManyToOne(() => Location)
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @Column({ type: 'uuid' })
  location_id: string;

  @Column({ type: 'enum', enum: AccessMethod })
  access_method: AccessMethod;

  @Column({ default: false })
  granted: boolean;

  @CreateDateColumn()
  timestamp: Date;
}
