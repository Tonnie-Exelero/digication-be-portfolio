import { getRepository } from 'typeorm';
import createApolloServer from '../test_helpers/createApolloServer';
import { createPortfolioEntity } from '../test_helpers/createPortfolioHelper';
import PortfolioEntity from '../../src/entities/PortfolioEntity';
import PortfolioVersionEntity, { VersionType } from '../../src/entities/PortfolioVersionEntity';
import PageEntity from '../../src/entities/PageEntity';

describe('VersionResolver', () => {
  const CREATE_SNAPSHOT_MUTATION = `
    mutation CreateSnapshotVersion($portfolioId: ID!) {
      createSnapshotVersion(portfolioId: $portfolioId) {
        id
        type
        createdAt
        portfolio {
          id
        }
      }
    }
  `;

  const PORTFOLIO_VERSIONS_QUERY = `
    query PortfolioVersions($portfolioId: ID!) {
      portfolioVersions(portfolioId: $portfolioId) {
        id
        type
        createdAt
      }
    }
  `;

  const VERSION_PAGES_QUERY = `
    query PortfolioVersionPages($versionId: ID!) {
      portfolioVersionPages(versionId: $versionId) {
        id
        name
        url
      }
    }
  `;

  let testPortfolio: PortfolioEntity;
  let originalDraftVersion: PortfolioVersionEntity;

  beforeAll(async () => {
    // Create test portfolio with initial draft version
    testPortfolio = await createPortfolioEntity();
    originalDraftVersion = await getRepository(PortfolioVersionEntity).findOneOrFail({
      where: { portfolio: { id: testPortfolio.id }, type: VersionType.DRAFT },
    });
  });

  beforeEach(async () => {
    // Reset pages before each test
    await getRepository(PageEntity).delete({});
  });

  test('creates snapshot version from draft', async () => {
    const server = createApolloServer();
    const versionRepo = getRepository(PortfolioVersionEntity);
    const pageRepo = getRepository(PageEntity);

    // Create initial pages in draft
    await pageRepo.save([
      { name: 'Page 1', url: 'page-1', portfolioVersion: originalDraftVersion },
      { name: 'Page 2', url: 'page-2', portfolioVersion: originalDraftVersion },
    ]);

    // Create snapshot
    const response = await server.executeOperation({
      query: CREATE_SNAPSHOT_MUTATION,
      variables: { portfolioId: testPortfolio.id },
    });

    // Verify response
    expect(response.errors).toBeUndefined();
    const snapshotVersion = response.data?.createSnapshotVersion;

    expect(snapshotVersion).toMatchObject({
      type: VersionType.SNAPSHOT,
      portfolio: { id: testPortfolio.id },
    });

    // Verify database state
    const versions = await versionRepo.find({
      where: { portfolio: { id: testPortfolio.id } },
      order: { createdAt: 'ASC' },
    });

    expect(versions).toHaveLength(2);
    expect(versions[0].type).toBe(VersionType.DRAFT);
    expect(versions[1].type).toBe(VersionType.SNAPSHOT);

    const snapshotPages = await pageRepo.find({
      where: { portfolioVersion: { id: snapshotVersion.id } },
    });
    expect(snapshotPages).toBeDefined();
  });

  test('retrieves portfolio versions in correct order', async () => {
    const server = createApolloServer();
    const versionRepo = getRepository(PortfolioVersionEntity);

    // Create test versions with explicit dates
    await versionRepo.save([
      {
        type: VersionType.SNAPSHOT,
        portfolio: testPortfolio,
        createdAt: new Date('2025-01-02'),
      },
      {
        type: VersionType.PUBLISHED,
        portfolio: testPortfolio,
        createdAt: new Date('2025-01-03'),
      },
    ]);

    const response = await server.executeOperation({
      query: PORTFOLIO_VERSIONS_QUERY,
      variables: { portfolioId: testPortfolio.id },
    });

    expect(response.errors).toBeUndefined();
    const versions = response.data?.portfolioVersions;

    // Should return 3 versions (original draft + 2 new)
    expect(versions).toHaveLength(3);

    // Verify order: newest first
    const versionDates = versions.map((v: any) => new Date(v.createdAt).toISOString());
    expect(versionDates).toEqual([
      '2025-01-03T00:00:00.000Z',
      '2025-01-02T00:00:00.000Z',
      originalDraftVersion.createdAt.toISOString(),
    ]);
  });

  test('retrieves pages for specific version', async () => {
    const server = createApolloServer();
    const versionRepo = getRepository(PortfolioVersionEntity);
    const pageRepo = getRepository(PageEntity);

    // Create new version
    const newVersion = await versionRepo.save({
      type: VersionType.SNAPSHOT,
      portfolio: testPortfolio,
    });

    // Create pages with proper relations
    await pageRepo.save([
      { name: 'Page 1', url: 'page-1', portfolioVersion: newVersion },
      { name: 'Page 2', url: 'page-2', portfolioVersion: newVersion },
    ]);

    const response = await server.executeOperation({
      query: VERSION_PAGES_QUERY,
      variables: { versionId: newVersion.id },
    });

    expect(response.errors).toBeUndefined();
    const pages = response.data?.getPortfolioVersionPages;

    expect(pages).toHaveLength(2);
    expect(pages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Page A', url: 'page-a' }),
        expect.objectContaining({ name: 'Page B', url: 'page-b' }),
      ])
    );
  });

  test('handles invalid portfolio ID in snapshot creation', async () => {
    const server = createApolloServer();

    const response = await server.executeOperation({
      query: CREATE_SNAPSHOT_MUTATION,
      variables: { portfolioId: 9999 },
    });

    expect(response.errors).toBeDefined();
    expect(response.errors?.[0].message).toContain('Portfolio not found');
  });
});
