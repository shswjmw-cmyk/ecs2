export default () => ({
  database: {
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'ecs_interview',
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    logging: process.env.DB_LOGGING === 'true',
    autoLoadEntities: true,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'ecs-dev-secret',
    expiresIn: '7d',
  },
})