import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import type { ReadingMetric } from '../interfaces/farm.interface.js';
import { Farm } from './farm.entity.js';

@Entity('farm_readings')
@Check('farm_readings_metric_check', "metric IN ('soil_moisture', 'temperature', 'ndvi')")
@Check(
  'farm_readings_unit_check',
  "(metric = 'soil_moisture' AND unit = 'm3/m3') OR (metric = 'temperature' AND unit = 'celsius') OR (metric = 'ndvi' AND unit = 'index')"
)
@Check('farm_readings_temperature_check', "metric <> 'temperature' OR value < 50")
@Index('farm_readings_farm_id_idx', ['farmId'])
@Index('farm_readings_sensor_id_idx', ['sensorId'])
@Index('farm_readings_recorded_at_idx', ['recordedAt'])
export class FarmReading {
  @PrimaryColumn('uuid', {
    default: () => 'gen_random_uuid()',
    primaryKeyConstraintName: 'farm_readings_pkey',
  })
  id!: string;

  @Column({ type: 'uuid', name: 'farm_id' })
  farmId!: string;

  @Column({ type: 'varchar', name: 'sensor_id', length: 255 })
  sensorId!: string;

  @Column({ type: 'timestamptz', name: 'recorded_at' })
  recordedAt!: Date;

  @Column({ type: 'varchar', length: 50 })
  metric!: ReadingMetric;

  @Column({ type: 'numeric', precision: 10, scale: 4 })
  value!: string;

  @Column({ type: 'varchar', length: 30 })
  unit!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at', default: () => 'now()' })
  createdAt!: Date;

  @ManyToOne(() => Farm, (farm) => farm.readings, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'farm_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'farm_readings_farm_id_fkey',
  })
  farm!: Farm;
}
