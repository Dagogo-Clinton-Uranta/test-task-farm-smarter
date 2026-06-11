import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { FarmGeometry } from '../interfaces/farm.interface.js';
import { FarmReading } from './farm-reading.entity.js';

@Entity('farms')
@Check(
  'farms_geometry_type_check',
  "GeometryType(geometry) IN ('POLYGON', 'MULTIPOLYGON')"
)
@Index('farms_owner_id_idx', ['ownerId'])
@Index('farms_geometry_gix', ['geometry'], { spatial: true })
export class Farm {
  @PrimaryColumn('uuid', {
    default: () => 'gen_random_uuid()',
    primaryKeyConstraintName: 'farms_pkey',
  })
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', name: 'owner_id', length: 255 })
  ownerId!: string;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Geometry',
    srid: 4326,
  })
  geometry!: FarmGeometry;

  @Column({ type: 'varchar', name: 'crop_type', length: 100 })
  cropType!: string;

  @Column({ type: 'numeric', name: 'area_hectares', precision: 14, scale: 4 })
  areaHectares!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at', default: () => 'now()' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at', default: () => 'now()' })
  updatedAt!: Date;

  @OneToMany(() => FarmReading, (reading) => reading.farm)
  readings!: FarmReading[];
}
