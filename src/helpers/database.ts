import { ConnectionOptions, createConnection, useContainer, Connection } from 'typeorm';
import { Container } from 'typeorm-typedi-extensions';

import config from '../config';

useContainer(Container);
const dbConfig: ConnectionOptions = { ...config.database };

let connection: Promise<Connection>;

/**
 * Retrieves or creates a database connection using singleton pattern.
 *
 * @returns {Promise<Connection>} A promise that resolves to a database connection instance
 */
export function getConnection(): Promise<Connection> {
  if (!connection) {
    connection = createConnection(dbConfig);
  }

  return connection;
}
