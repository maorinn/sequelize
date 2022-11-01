'use strict';

const wkx = require('wkx');
const _ = require('lodash');
const momentTz = require('moment-timezone');
const moment = require('moment');

module.exports = BaseTypes => {
  BaseTypes.DATE.types.dmdb = ['DATETIME'];
  BaseTypes.STRING.types.dmdb = ['VARCHAR'];
  BaseTypes.CHAR.types.dmdb = ['CHAR'];
  BaseTypes.TEXT.types.dmdb = ['BLOB'];
  BaseTypes.TINYINT.types.dmdb = ['TINY'];
  BaseTypes.SMALLINT.types.dmdb = ['SHORT'];
  BaseTypes.MEDIUMINT.types.dmdb = ['INT24'];
  BaseTypes.INTEGER.types.dmdb = ['LONG'];
  BaseTypes.BIGINT.types.dmdb = ['BIGINT'];
  BaseTypes.FLOAT.types.dmdb = ['FLOAT'];
  BaseTypes.TIME.types.dmdb = ['TIME'];
  BaseTypes.DATEONLY.types.dmdb = ['DATE'];
  BaseTypes.BOOLEAN.types.dmdb = ['TINY'];
  BaseTypes.BLOB.types.dmdb = ['TINYBLOB', 'BLOB', 'LONGBLOB'];
  BaseTypes.DECIMAL.types.dmdb = ['DECIMAL'];
  BaseTypes.UUID.types.dmdb = false;
  BaseTypes.ENUM.types.dmdb = false;
  BaseTypes.REAL.types.dmdb = ['DOUBLE'];
  BaseTypes.DOUBLE.types.dmdb = ['DOUBLE'];
  BaseTypes.GEOMETRY.types.dmdb = ['GEOMETRY'];
  BaseTypes.JSON.types.dmdb = ['JSON'];

  class DECIMAL extends BaseTypes.DECIMAL {
    toSql() {
      let definition = super.toSql();
      if (this._unsigned) {
        definition += ' UNSIGNED';
      }

      if (this._zerofill) {
        definition += ' ZEROFILL';
      }

      return definition;
    }
  }

  class DATE extends BaseTypes.DATE {
    toSql() {
      return this._length ? `DATETIME(${this._length})` : 'DATETIME';
    }

    _stringify(date, options) {
      if (!moment.isMoment(date)) {
        date = this._applyTimezone(date, options);
      }

      // Fractional DATETIMEs only supported on MySQL 5.6.4+
      if (this._length) {
        return date.format('YYYY-MM-DD HH:mm:ss.SSS');
      }

      return date.format('YYYY-MM-DD HH:mm:ss');
    }

    static parse(value, options) {
      value = value.string();
      if (value === null) {
        return value;
      }

      if (momentTz.tz.zone(options.timezone)) {
        value = momentTz.tz(value, options.timezone).toDate();
      } else {
        value = new Date(`${value} ${options.timezone}`);
      }

      return value;
    }
  }

  class DATEONLY extends BaseTypes.DATEONLY {
    static parse(value) {
      return value.string();
    }
  }

  class UUID extends BaseTypes.UUID {
    toSql() {
      return 'CHAR(36) BINARY';
    }
  }

  const SUPPORTED_GEOMETRY_TYPES = ['POINT', 'LINESTRING', 'POLYGON'];

  class GEOMETRY extends BaseTypes.GEOMETRY {
    constructor(type, srid) {
      super(type, srid);
      if (_.isEmpty(this.type)) {
        this.sqlType = this.key;

        return;
      }

      if (SUPPORTED_GEOMETRY_TYPES.includes(this.type)) {
        this.sqlType = this.type;

        return;
      }

      throw new Error(`Supported geometry types are: ${SUPPORTED_GEOMETRY_TYPES.join(', ')}`);
    }

    static parse(value) {
      value = value.buffer();
      // Empty buffer, MySQL doesn't support POINT EMPTY
      // check, https://dev.mysql.com/worklog/task/?id=2381
      if (!value || value.length === 0) {
        return null;
      }

      // For some reason, discard the first 4 bytes
      value = value.slice(4);

      return wkx.Geometry.parse(value).toGeoJSON({ shortCrs: true });
    }

    toSql() {
      return this.sqlType;
    }
  }

  class ENUM extends BaseTypes.ENUM {
    toSql(options) {
      return `ENUM(${this.values.map(value => options.escape(value)).join(', ')})`;
    }
  }

  class JSONTYPE extends BaseTypes.TEXT {
    _stringify(value, options) {
      return options.operation === 'where' && typeof value === 'string' ? value : JSON.stringify(value);
    }

    toSql() {
      return 'TEXT';
    }
  }

  return {
    ENUM,
    DATE,
    DATEONLY,
    UUID,
    GEOMETRY,
    DECIMAL,
    JSON: JSONTYPE,
  };
};
