import { GraphQLSchema } from 'graphql';
import { BuildSchemaOptions, buildSchemaSync } from 'type-graphql';
import { Container } from 'typedi';

/**
 * Creates and returns a GraphQL schema using TypeGraphQL.
 *
 * This function builds a schema synchronously using the provided options and default settings.
 * It automatically includes all resolver files from the resolvers directory.
 *
 * @param options - Optional. Additional options for building the schema, excluding 'resolvers'.
 *                  These options will be merged with the default options.
 *
 * @returns A GraphQLSchema instance representing the built schema.
 */
export function createSchema(options?: Omit<BuildSchemaOptions, 'resolvers'>): GraphQLSchema {
  return buildSchemaSync({
    resolvers: [`${__dirname}/../resolvers/**/*.resolver.ts`],
    emitSchemaFile: true,
    container: Container,
    validate: true,
    ...options,
  });
}
