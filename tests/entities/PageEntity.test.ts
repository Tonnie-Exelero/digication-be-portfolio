import { getRepository } from 'typeorm';
import PortfolioEntity from '../../src/entities/PortfolioEntity';
import PortfolioVersionEntity, { VersionType } from '../../src/entities/PortfolioVersionEntity';
import PageEntity from '../../src/entities/PageEntity';

describe('PageEntity', () => {
  test('creates a page with a portfolio version', async () => {
    const versionRepo = getRepository(PortfolioVersionEntity);
    const pageRepo = getRepository(PageEntity);

    const portfolio = await getRepository(PortfolioEntity).save({
      name: 'Test Portfolio',
      url: 'https://test.com',
    });

    const version = await versionRepo.save({
      type: VersionType.DRAFT,
      portfolio,
    });

    const page = await pageRepo.save({
      name: 'Test Page',
      url: 'https://test.com/page',
      portfolioVersion: version,
    });

    expect(page).toMatchObject({
      id: expect.any(Number),
      name: 'Test Page',
      url: 'https://test.com/page',
      portfolioVersion: {
        id: version.id,
        type: VersionType.DRAFT,
      },
    });
  });
});
