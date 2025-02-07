import { getRepository } from 'typeorm';
import PortfolioEntity from '../../src/entities/PortfolioEntity';
import PortfolioVersionEntity, { VersionType } from '../../src/entities/PortfolioVersionEntity';
import createApolloServer from '../test_helpers/createApolloServer';
import { createPortfolioEntity } from '../test_helpers/createPortfolioHelper';

describe('PortfolioResolver', () => {
  const FETCH_PORTFOLIO_QUERY = `
    query ListPortfolios {
      listPortfolios {
        id
        name
        url
      }
    }
  `;

  const CREATE_PORTFOLIO_MUTATION = `
    mutation CreatePortfolio($name: String!, $url: String!) {
      createPortfolio(name: $name, url: $url) {
        id
        name
        url
      }
    }
  `;

  let portfolio1: PortfolioEntity;
  let portfolio2: PortfolioEntity;
  let portfolio3: PortfolioEntity;

  beforeAll(async () => {
    portfolio1 = await createPortfolioEntity();
    portfolio2 = await createPortfolioEntity();
    portfolio3 = await createPortfolioEntity();
  });

  test('return 3 items', async () => {
    const server = createApolloServer();

    const response = await server.executeOperation({
      query: FETCH_PORTFOLIO_QUERY,
      variables: {},
    });

    expect(response).toGraphQLResponseData({
      listPortfolios: [
        {
          id: portfolio1.id,
          name: portfolio1.name,
          url: portfolio1.url,
        },
        {
          id: portfolio2.id,
          name: portfolio2.name,
          url: portfolio2.url,
        },
        {
          id: portfolio3.id,
          name: portfolio3.name,
          url: portfolio3.url,
        },
      ],
    });
  });

  test('creates portfolio with initial draft version', async () => {
    const versionRepo = getRepository(PortfolioVersionEntity);
    const server = createApolloServer();

    const testPortfolio = {
      name: 'Test Portfolio',
      url: 'test-portfolio',
    };

    const response = await server.executeOperation({
      query: CREATE_PORTFOLIO_MUTATION,
      variables: testPortfolio,
    });

    const createdPortfolio = response.data?.createPortfolio;
    const versions = await versionRepo.find({
      where: { portfolio: { id: createdPortfolio.id } },
      relations: ['portfolio'],
    });

    expect(response).toGraphQLResponseData({
      createPortfolio: {
        id: createdPortfolio.id,
        name: testPortfolio.name,
        url: testPortfolio.url,
      },
    });

    expect(versions).toHaveLength(1);
    expect(versions[0].type).toBe(VersionType.DRAFT);
    expect(versions[0].portfolio.id).toBe(createdPortfolio.id);
  });
});
