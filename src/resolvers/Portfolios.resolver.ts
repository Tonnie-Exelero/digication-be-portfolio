import { Arg, Mutation, Query, Resolver } from 'type-graphql';
import { Service } from 'typedi';
import { getRepository } from 'typeorm';

import PortfolioEntity from '../entities/PortfolioEntity';
import PortfolioVersionEntity, { VersionType } from '../entities/PortfolioVersionEntity';

@Resolver()
@Service()
export default class PortfolioResolver {
  /**
   * Retrieves all portfolios from the database.
   *
   * @decorator Query(() => [PortfolioEntity])
   * @returns {Promise<PortfolioEntity[]>} Array of portfolio entities
   * @throws {TypeORMError} If the database query fails
   */
  @Query(() => [PortfolioEntity], { description: 'List all portfolios' })
  async listPortfolios(): Promise<PortfolioEntity[]> {
    const portfolioRepo = getRepository(PortfolioEntity);

    return portfolioRepo.createQueryBuilder('p').getMany();
  }

  /**
   * Creates a new portfolio with an associated draft version.
   *
   * @decorator Mutation(() => PortfolioEntity)
   * @param {string} name - The name of the portfolio to create
   * @param {string} url - The URL associated with the portfolio
   * @returns {Promise<PortfolioEntity>} The newly created portfolio entity
   * @throws {TypeORMError} If database operations fail
   * @throws {ValidationError} If input validation fails
   */
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
