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

    // Verify response structure
    expect(response.errors).toBeUndefined();

    // Extract versions from response
    const versions = response.data?.portfolioVersions;

    // Should return 4 versions
    expect(versions).toHaveLength(4);

    // Verify order: newest first
    const versionDates = versions.map((v: any) => new Date(v.createdAt).toISOString());
    expect(versionDates).toIncludeAnyMembers([
      originalDraftVersion.createdAt.toISOString(),
      '2025-01-02T00:00:00.000Z',
      '2025-01-03T00:00:00.000Z',
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

    // Create test pages with known values
    const testPages = [
      { name: 'Page A', url: 'page-a' },
      { name: 'Page B', url: 'page-b' },
    ];

    // Save pages with proper relations
    await pageRepo.save(
      testPages.map((page) => ({
        ...page,
        portfolioVersion: newVersion,
      }))
    );

    const response = await server.executeOperation({
      query: VERSION_PAGES_QUERY,
      variables: { versionId: newVersion.id },
    });

    // Verify response structure
    expect(response.errors).toBeUndefined();
    expect(response.data).toBeDefined();

    // Extract pages from response
    const pages = response.data?.portfolioVersionPages;

    // Verify page count
    expect(pages).toHaveLength(testPages.length);

    // Verify page contents
    testPages.forEach((expectedPage) => {
      expect(pages).toContainEqual(expect.objectContaining(expectedPage));
    });
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
