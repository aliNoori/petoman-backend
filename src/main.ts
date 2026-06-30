import {NestFactory} from '@nestjs/core';
import {AppModule} from './app.module';
import {join} from "path";
import {NestExpressApplication} from "@nestjs/platform-express";
import {BadRequestException, ValidationPipe, VersioningType} from "@nestjs/common";
import {DocumentBuilder, SwaggerModule} from "@nestjs/swagger";
import {HttpExceptionFilter} from "./common/filters/http-exception.filter";
import {ExpressAdapter} from "@bull-board/express";
import {BullAdapter} from "@bull-board/api/bullAdapter";
import {createBullBoard} from "@bull-board/api";
import {setQueueUiApp} from "./shared/queue/queue-ui.controller";

async function bootstrap() {

    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    //app.enableTrustProxy();
    // Swagger config
    const config = new DocumentBuilder()
        .setTitle('Petoman API')
        .setDescription('Petoman API list')
        .setVersion('1.0')
        .addBearerAuth()
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);

    app.useStaticAssets(join(__dirname, '..', 'uploads'), {
        prefix: '/uploads/',
        setHeaders: (res,path) => {
            // اضافه کردن هدرهای لازم برای نمایش امن تصویر
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
            res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
            res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

            // 👇 اصلاح MIME type برای ویدیو
            if (path.endsWith('.mp4')) {
                res.setHeader('Content-Type', 'video/mp4');
            }
            if (path.endsWith('.m3u8')) {
                res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            }
            if (path.endsWith('.ts')) {
                res.setHeader('Content-Type', 'video/mp2t');
            }
        },
    });

    app.setGlobalPrefix('api', {});
    app.enableVersioning({type: VersioningType.URI});

    ///Set global validation
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: (errors) => {
            const messages = errors.map(error => {
                // بررسی ایمن برای جلوگیری از خطای undefined
                const constraints = error.constraints || {};
                return Object.values(constraints).join(', ');
            });

            return new BadRequestException({
                statusCode: 400,
                message: messages,
                error: 'Bad Request',
            });
        },
    }));

    app.useGlobalFilters(new HttpExceptionFilter());

    app.enableCors({
        origin: [
            'http://192.168.100.3:5173',
            'http://192.168.100.3:6503',
            'http://192.168.100.3:6507',
            'http://192.168.100.3:6501',
            'http://localhost:5173',
            'http://localhost:5174',
            'http://localhost:3002',
            'http://localhost:3005',
            'http://localhost:6501',
            'http://localhost:6503',
            'http://localhost:6505',
            'http://localhost:6507',
            'https://dash.petoman.com',
            'https://petoman.com'
        ],
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        credentials: true
    })

    // اپلیکیشن را به کنترلر معرفی می‌کنیم تا بتواند روت را ثبت کند
    setQueueUiApp(app);

    await app.listen(process.env.PORT ?? 3000,'0.0.0.0');
}

bootstrap();
