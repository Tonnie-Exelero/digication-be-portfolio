import { ApolloServer, Config as ApolloServerConfig } from 'apollo-server-koa';

import { createSchema } from './createSchema';

/**
 * Creates and configures an Apollo Server instance.
 *
 * This function sets up an Apollo Server with default configuration and allows
 * for additional custom configuration to be passed in.
 *
 * @param apolloServerConfig - Optional configuration object for Apollo Server.
 *                             This can include any valid Apollo Server options
 *                             which will override the default settings.
 *
 * @returns An instance of ApolloServer configured with the provided options.
 */
export default function createApolloServer(apolloServerConfig?: ApolloServerConfig) {
  const apolloServer = new ApolloServer({
    debug: true,
    schema: createSchema(),
    ...apolloServerConfig,
  });

  return apolloServer;
}
