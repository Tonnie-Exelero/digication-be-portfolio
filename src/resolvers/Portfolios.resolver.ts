import { Arg, Mutation, Query, Resolver } from 'type-graphql';
import { Service } from 'typedi';
import { getRepository } from 'typeorm';

import PortfolioEntity from '../entities/PortfolioEntity';
import PortfolioVersionEntity, { VersionType } from '../entities/PortfolioVersionEntity';

@Resolver()
@Service()
export default class PortfolioResolver {
  @Query(() => [PortfolioEntity], { description: 'List all portfolios' })
  async listPortfolios(): Promise<PortfolioEntity[]> {
    const portfolioRepo = getRepository(PortfolioEntity);

    return portfolioRepo.createQueryBuilder('p').getMany();
  }

  @Mutation(() => PortfolioEntity, { description: 'Create a portfolio' })
  async createPortfolio(@Arg('name') name: string, @Arg('url') url: string): Promise<PortfolioEntity> {
    const portfolioRepo = getRepository(PortfolioEntity);
    const versionRepo = getRepository(PortfolioVersionEntity);

    const portfolio = portfolioRepo.create({ name, url });
    await portfolioRepo.save(portfolio);

    const draftVersion = versionRepo.create({
      type: VersionType.DRAFT,
      portfolio,
    });
    await versionRepo.save(draftVersion);

    return portfolio;
  }
}
