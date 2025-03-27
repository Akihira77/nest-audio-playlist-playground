import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import cookieParser from "cookie-parser";
import { ConsoleLogger } from "@nestjs/common";

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        logger: new ConsoleLogger("Nest Audio", {
            logLevels: ["verbose"],
            timestamp: true,
        }),
    });
    app.enableCors({
        origin: "*",
        methods: "GET,POST,PUT,DELETE,OPTIONS",
        allowedHeaders: "Content-Type, Authorization",
        credentials: true, // Optional jika butuh cookie
    });

    app.setGlobalPrefix("/api");
    app.useGlobalPipes();
    app.use(cookieParser());

    const port = process.env.PORT;
    await app.listen(Number(port));

    console.log(`Nest App run on ${await app.getUrl()}`);
}
bootstrap();
