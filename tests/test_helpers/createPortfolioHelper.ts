import faker from 'faker';
import { DeepPartial, getRepository } from 'typeorm';
import PortfolioEntity from '../../src/entities/PortfolioEntity';
import PortfolioVersionEntity, { VersionType } from '../../src/entities/PortfolioVersionEntity';

export async function createPortfolioEntity(properties?: DeepPartial<PortfolioEntity>) {
  const portfolioRepo = getRepository(PortfolioEntity);
  const portfolioVersionRepo = getRepository(PortfolioVersionEntity);

  const portfolio = await portfolioRepo.save(
    portfolioRepo.create({
      name: faker.name.findName(),
      url: faker.internet.url(),
      ...properties,
    })
  );

  // Create initial draft version
  await portfolioVersionRepo.save({
    type: VersionType.DRAFT,
    portfolio,
  });

  return portfolio;
}
