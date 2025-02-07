import { Arg, ID, Mutation, Query, Resolver } from 'type-graphql';
import { Service } from 'typedi';
import { getRepository } from 'typeorm';
import PortfolioEntity from '../entities/PortfolioEntity';
import PortfolioVersionEntity, { VersionType } from '../entities/PortfolioVersionEntity';
import PageEntity from '../entities/PageEntity';

@Resolver()
@Service()
export default class PortfolioVersionResolver {
  // Get all versions for a portfolio
  @Query(() => [PortfolioVersionEntity], { description: 'Get portfolio versions' })
  async getPortfolioVersions(@Arg('portfolioId', () => ID) portfolioId: number) {
    const portfolio = await getRepository(PortfolioEntity).findOne(portfolioId, {
      relations: ['versions'],
    });

    if (!portfolio) throw new Error('Portfolio not found');

    return portfolio.versions;
  }

  // Get pages for a specific version
  @Query(() => [PageEntity], { description: 'Get pages for a version' })
  async getPortfolioVersionPages(@Arg('versionId', () => ID) versionId: number) {
    const version = await getRepository(PortfolioVersionEntity).findOne(versionId, {
      relations: ['pages'],
    });

    if (!version) throw new Error('Version not found');

    return version.pages;
  }

  // Create a snapshot from the latest draft
  @Mutation(() => PortfolioVersionEntity, { description: 'Create a snapshot' })
  async createSnapshotVersion(@Arg('portfolioId', () => ID) portfolioId: number) {
    const portfolioRepo = getRepository(PortfolioEntity);
    const versionRepo = getRepository(PortfolioVersionEntity);
    const pageRepo = getRepository(PageEntity);

    const portfolio = await portfolioRepo.findOne(portfolioId);
    if (!portfolio) throw new Error('Portfolio not found');

    // Find latest draft
    const draft = await versionRepo.findOne({
      where: { portfolio: portfolioId, type: VersionType.DRAFT },
      order: { createdAt: 'DESC' },
    });
    if (!draft) throw new Error('No draft found');

    // Create new snapshot
    const snapshot = versionRepo.create({
      type: VersionType.SNAPSHOT,
      portfolio,
    });
    await versionRepo.save(snapshot);

    // Copy pages with unique URLs
    const pages = draft.pages || [];
    const newPages = pages.map((page) =>
      pageRepo.create({
        ...page,
        url: `${page.url}-snapshot-${Date.now()}`,
        id: undefined, // Reset ID to auto-generate
        portfolioVersion: snapshot,
      })
    );
    await pageRepo.save(newPages);

    return snapshot;
  }
}
