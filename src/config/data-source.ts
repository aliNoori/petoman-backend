import { DataSource } from 'typeorm';

export const AppDataSource = new DataSource({
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    username: 'root',
    password: '',
    database: 'pet-app',
    synchronize: false,
    migrations: ['src/features/**/migrations/*.ts'],
    entities: ['src/features/**/*.entity.ts'],
});
