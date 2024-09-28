import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import cookieParser from "cookie-parser";

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        logger: ["verbose"],
    });
    app.setGlobalPrefix("/api");
    app.useGlobalPipes();
    app.use(cookieParser());

    const port = process.env.PORT;
    await app.listen(Number(port));

    console.log(`Nest App run on ${port}`);
}
bootstrap();
