import { getRepository } from 'typeorm';
import PortfolioEntity from '../../src/entities/PortfolioEntity';
import PortfolioVersionEntity, { VersionType } from '../../src/entities/PortfolioVersionEntity';

describe('PortfolioVersionEntity', () => {
  test('creates a draft version for a portfolio', async () => {
    const versionRepo = getRepository(PortfolioVersionEntity);
    const portfolioRepo = getRepository(PortfolioEntity);

    const portfolio = await portfolioRepo.save({
      name: 'Test Portfolio',
      url: 'https://test.com',
    });

    const version = await versionRepo.save({
      type: VersionType.DRAFT,
      portfolio,
    });

    expect(version).toMatchObject({
      id: expect.any(Number),
      type: VersionType.DRAFT,
      portfolio: {
        id: portfolio.id,
        name: 'Test Portfolio',
        url: 'https://test.com',
      },
    });
  });
});
