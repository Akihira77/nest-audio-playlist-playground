import { relations } from "drizzle-orm";
import {
    text,
    pgTable,
    uuid,
    integer,
    numeric,
    boolean,
    timestamp,
    index,
    primaryKey,
} from "drizzle-orm/pg-core";

export const users = pgTable(
    "users",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        name: text("name").notNull(),
        email: text("email").notNull().unique(),
        password: text("password").notNull(),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (table) => {
        return {
            emailIdx: index("email_idx").on(table.email),
        };
    },
);

export const audios = pgTable(
    "audios",
    {
        id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
        title: text("title").notNull(),
        duration: numeric("duration").notNull(),
        creator: text("creator").notNull(),
        publishAt: integer("publish_at").notNull(),
        file_path: text("file_path").notNull(),
        likes: integer("likes").notNull().default(0),
        uploaderId: uuid("uploader_id")
            .notNull()
            .references(() => users.id, {
                onUpdate: "cascade",
                onDelete: "cascade",
            }),
    },
    (table) => {
        return {
            titleIdx: index("title_idx").on(table.title),
            creatorIdx: index("creator_idx").on(table.creator),
            uploaderIdx: index("uploader_idx").on(table.uploaderId),
        };
    },
);

export const playlistMetadata = pgTable(
    "playlist_metadata",
    {
        id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, {
                onDelete: "cascade",
                onUpdate: "cascade",
            }),
        name: text("name").notNull(),
        isPublic: boolean("is_public").notNull(),
        audioCount: integer("audio_count").notNull(),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (table) => {
        return {
            nameIdx: index("name_idx").on(table.name),
        };
    },
);

export const usersPlaylists = pgTable(
    "users_playlists",
    {
        playlistId: integer("playlist_id")
            .notNull()
            .references(() => playlistMetadata.id, {
                onDelete: "cascade",
                onUpdate: "cascade",
            }),
        audioId: integer("audio_id")
            .notNull()
            .references(() => audios.id, {
                onDelete: "set null",
                onUpdate: "cascade",
            }),
    },
    (self) => {
        return {
            pk: primaryKey({ columns: [self.playlistId, self.audioId] }),
        };
    },
);

export const audiosRelations = relations(audios, ({ one, many }) => {
    return {
        playlist: one(usersPlaylists, {
            fields: [audios.id],
            references: [usersPlaylists.audioId],
        }),
        usersPlaylists: many(usersPlaylists),
    };
});

export const playlistRelations = relations(playlistMetadata, ({ many }) => {
    return {
        usersPlaylists: many(usersPlaylists),
    };
});
export const audiosPlaylistsRelations = relations(usersPlaylists, ({ one }) => {
    return {
        playlist: one(playlistMetadata, {
            fields: [usersPlaylists.playlistId],
            references: [playlistMetadata.id],
        }),
        audio: one(audios, {
            fields: [usersPlaylists.audioId],
            references: [audios.id],
        }),
    };
});
