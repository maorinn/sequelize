'use strict';

const _ = require('lodash');
const { AbstractDialect } = require('../abstract');
const ConnectionManager = require('./connection-manager');
const Query = require('./query');
const QueryGenerator = require('./query-generator');
const DataTypes = require('../../data-types').mysql;
const { MySQLQueryInterface } = require('./query-interface');

class DmDialect extends AbstractDialect {
  static supports = _.merge(
    _.cloneDeep(AbstractDialect.supports),
    {
      'VALUES ()': true,
      'LIMIT ON UPDATE': true,
      schema: true,
      lock: true,
      forShare: 'LOCK IN SHARE MODE',
      settingIsolationLevelDuringTransaction: false,
      autoIncrement: {
        defaultValue: false,
        update: false,
      },
      inserts: {
        ignoreDuplicates: ' IGNORE',
        updateOnDuplicate: ' ON DUPLICATE KEY UPDATE',
      },
      index: {
        collate: false,
        length: true,
        parser: true,
        type: true,
        using: 1,
      },
      constraints: {
        dropConstraint: false,
        check: false,
      },
      indexViaAlter: true,
      indexHints: true,
      NUMERIC: true,
      GEOMETRY: true,
      JSON: true,
      REGEXP: true,
    },
  );

  constructor(sequelize) {
    super();
    this.sequelize = sequelize;
    this.connectionManager = new ConnectionManager(this, sequelize);
    this.queryGenerator = new QueryGenerator({
      _dialect: this,
      sequelize,
    });
    this.queryInterface = new MySQLQueryInterface(
      sequelize,
      this.queryGenerator,
    );
  }
}

DmDialect.prototype.defaultVersion = '1.0.0'; // minimum supported version
DmDialect.prototype.Query = Query;
DmDialect.prototype.QueryGenerator = QueryGenerator;
DmDialect.prototype.DataTypes = DataTypes;
DmDialect.prototype.name = 'dmdb';
DmDialect.prototype.TICK_CHAR = '"';
DmDialect.prototype.TICK_CHAR_LEFT = DmDialect.prototype.TICK_CHAR;
DmDialect.prototype.TICK_CHAR_RIGHT = DmDialect.prototype.TICK_CHAR;

module.exports = DmDialect;
