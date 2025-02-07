import { getRepository } from 'typeorm';
import PortfolioEntity from '../../src/entities/PortfolioEntity';
import PortfolioVersionEntity, { VersionType } from '../../src/entities/PortfolioVersionEntity';
import { createPortfolioEntity } from '../test_helpers/createPortfolioHelper';

describe('Version Constraints', () => {
  let testPortfolio: PortfolioEntity;

  beforeAll(async () => {
    testPortfolio = await createPortfolioEntity();
  });

  test('allows multiple snapshot versions', async () => {
    const versionRepo = getRepository(PortfolioVersionEntity);

    await versionRepo.save([
      { type: VersionType.SNAPSHOT, portfolio: testPortfolio },
      { type: VersionType.SNAPSHOT, portfolio: testPortfolio },
    ]);

    const snapshots = await versionRepo.find({
      where: {
        portfolio: { id: testPortfolio.id },
        type: VersionType.SNAPSHOT,
      },
    });

    expect(snapshots).toHaveLength(2);
  });
});
