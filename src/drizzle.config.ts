import type { Config } from "drizzle-kit";

export default {
    // schema: "./src/**/types.ts", // Path to schema file
    schema: "./src/drizzle/schema.ts", // Path to schema file
    out: "./src/drizzle/migrations", // Path to output directory
    dialect: "postgresql", // Database dialect
    dbCredentials: {
        url: process.env.DB_URI,
    },
    verbose: true,
    strict: true,
} satisfies Config;
