import { registerEnumType, Field, ObjectType } from 'type-graphql';
import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import PortfolioEntity from './PortfolioEntity';
import PageEntity from './PageEntity';

export enum VersionType {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  SNAPSHOT = 'SNAPSHOT',
}

// Register the enum with TypeGraphQL
registerEnumType(VersionType, {
  name: 'VersionType',
  description: 'The different types of portfolio versions',
});

@ObjectType('PortfolioVersion')
@Entity()
export default class PortfolioVersionEntity {
  @Field()
  @PrimaryGeneratedColumn()
  id: number;

  @Field(() => VersionType)
  @Column({ type: 'varchar', default: VersionType.DRAFT })
  type: VersionType;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => PortfolioEntity)
  @ManyToOne(() => PortfolioEntity, (portfolio) => portfolio.versions)
  portfolio: PortfolioEntity;

  @Field(() => [PageEntity])
  @OneToMany(() => PageEntity, (page) => page.portfolioVersion)
  pages: PageEntity[];
}
