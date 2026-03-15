process.env.DATABASE_URL =
	process.env.INTEGRATION_DATABASE_URL || 'postgres://admin:password@127.0.0.1:5432/main_db';
process.env.RUNNING_IN_DOCKER = process.env.RUNNING_IN_DOCKER || 'false';
