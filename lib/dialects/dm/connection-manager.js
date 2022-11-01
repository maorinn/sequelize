'use strict';

const AbstractConnectionManager = require('../abstract/connection-manager');
const SequelizeErrors = require('../../errors');
const { logger } = require('../../utils/logger');
const DataTypes = require('../../data-types').dmdb;
const momentTz = require('moment-timezone');

const debug = logger.debugContext('connection:dmdb');
const parserStore = require('../parserStore')('dmdb');
const { promisify } = require('util');

/**
 * MySQL Connection Manager
 *
 * Get connections, validate and disconnect them.
 * AbstractConnectionManager pooling use it to handle MySQL specific connections
 * Use https://github.com/sidorares/node-mysql2 to connect with MySQL server
 *
 * @private
 */
class ConnectionManager extends AbstractConnectionManager {
  constructor(dialect, sequelize) {
    sequelize.config.port = sequelize.config.port || 5236;
    super(dialect, sequelize);
    this.lib = this._loadDialectModule('dmdb');
    this.refreshTypeParser(DataTypes);
  }

  _refreshTypeParser(dataType) {
    parserStore.refresh(dataType);
  }

  _clearTypeParser() {
    parserStore.clear();
  }

  static _typecast(field, next) {
    if (parserStore.get(field.type)) {
      return parserStore.get(field.type)(field, this.sequelize.options, next);
    }

    return next();
  }

  /**
   * Connect with MySQL database based on config, Handle any errors in connection
   * Set the pool handlers on connection.error
   * Also set proper timezone once connection is connected.
   *
   * @param {object} config
   * @returns {Promise<Connection>}
   * @private
   */
  async connect(config) {
    const connectionConfig = {
      host: config.host,
      port: config.port,
      connectString: `${config.host}:${config.port}`,
      user: config.username,
      flags: '-FOUND_ROWS',
      password: config.password,
      database: config.database,
      timezone: this.sequelize.options.timezone,
      typeCast: ConnectionManager._typecast.bind(this),
      bigNumberStrings: false,
      supportBigNumbers: true,
      ...config.dialectOptions,
    };

    try {
      const connection = await new Promise(((resolve, reject) => {
        this.lib.getConnection(connectionConfig, (err, connection) => {
          if (err) {
            reject(err);
          }
          resolve(connection);
        });
      }));

      return connection;
    } catch (error) {
      throw new SequelizeErrors.ConnectionError(error);
    }
  }

  async disconnect(connection) {
    // Don't disconnect connections with CLOSED state
    if (connection.closed) {
      debug('connection tried to disconnect but was already at CLOSED state');

      return;
    }

    return await promisify(callback => connection.close(callback))();
  }

  validate(connection) {
    return true;
  }
}

module.exports = ConnectionManager;
module.exports.ConnectionManager = ConnectionManager;
module.exports.default = ConnectionManager;
