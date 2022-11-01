class DmSequelizeError extends Error{
  constructor(error, sql, parameters) {
    super(error.message);
    this.name = 'DmSequelizeError';
    this.sql = sql;
    this.parameters = parameters;
  }
}

module.exports = DmSequelizeError;
