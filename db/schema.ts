import { sqliteTable, text, integer, real, blob } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// 活動主表
export const activities = sqliteTable('activities', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  summary: text('summary'),
  status: text('status').default('pending').notNull(),
  qualityScore: integer('quality_score').default(0).notNull(),
  // 價格相關
  price: integer('price').default(0),
  priceType: text('price_type', { enum: ['free', 'paid', 'donation'] }).default('free'),
  currency: text('currency').default('TWD'),
  // 熱門度相關
  viewCount: integer('view_count').default(0),
  favoriteCount: integer('favorite_count').default(0),
  clickCount: integer('click_count').default(0),
  popularityScore: real('popularity_score').default(0.0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// 地點資訊表
export const locations = sqliteTable('locations', {
  id: text('id').primaryKey(),
  activityId: text('activity_id').references(() => activities.id, { onDelete: 'cascade' }).notNull(),
  address: text('address').notNull(),
  district: text('district'),
  city: text('city').notNull(),
  region: text('region').notNull(),
  latitude: real('latitude'),
  longitude: real('longitude'),
  venue: text('venue'),
  landmarks: text('landmarks'), // JSON array of strings
});

// 分類表
export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  colorCode: text('color_code'),
  icon: text('icon'),
});

// 活動分類關聯表
export const activityCategories = sqliteTable('activity_categories', {
  id: text('id').primaryKey(),
  activityId: text('activity_id').references(() => activities.id, { onDelete: 'cascade' }).notNull(),
  categoryId: text('category_id').references(() => categories.id, { onDelete: 'cascade' }).notNull(),
});

// 活動時間表
export const activityTimes = sqliteTable('activity_times', {
  id: text('id').primaryKey(),
  activityId: text('activity_id').references(() => activities.id, { onDelete: 'cascade' }).notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
  startTime: text('start_time'),
  endTime: text('end_time'),
  timezone: text('timezone').default('Asia/Taipei').notNull(),
  isRecurring: integer('is_recurring', { mode: 'boolean' }).default(false).notNull(),
  recurrenceRule: text('recurrence_rule'), // JSON
});

// 資料來源表
export const dataSources = sqliteTable('data_sources', {
  id: text('id').primaryKey(),
  activityId: text('activity_id').references(() => activities.id, { onDelete: 'cascade' }).notNull(),
  website: text('website').notNull(),
  url: text('url'),
  crawledAt: integer('crawled_at', { mode: 'timestamp' }).notNull(),
  crawlerVersion: text('crawler_version'),
});

// 驗證記錄表
export const validationLogs = sqliteTable('validation_logs', {
  id: text('id').primaryKey(),
  activityId: text('activity_id').references(() => activities.id, { onDelete: 'cascade' }),
  originalData: text('original_data'), // JSON
  validatedData: text('validated_data'), // JSON
  qualityScore: integer('quality_score'),
  issues: text('issues'), // JSON array
  suggestions: text('suggestions'), // JSON array
  validatedAt: integer('validated_at', { mode: 'timestamp' }).notNull(),
  validator: text('validator'), // 'system' | 'claude' | 'manual'
});

// 使用者表
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  avatar: text('avatar'),
  preferences: text('preferences'), // JSON
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// 使用者收藏表
export const userFavorites = sqliteTable('user_favorites', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  activityId: text('activity_id').references(() => activities.id, { onDelete: 'cascade' }).notNull(),
  savedAt: integer('saved_at', { mode: 'timestamp' }).notNull(),
});

// 搜尋記錄表 (可選，用於分析)
export const searchLogs = sqliteTable('search_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  query: text('query'),
  filters: text('filters'), // JSON
  resultCount: integer('result_count'),
  clickedResults: text('clicked_results'), // JSON array
  searchedAt: integer('searched_at', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
});

// 標籤表
export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  category: text('category'),
  usageCount: integer('usage_count').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// 活動標籤關聯表
export const activityTags = sqliteTable('activity_tags', {
  id: text('id').primaryKey(),
  activityId: text('activity_id').references(() => activities.id, { onDelete: 'cascade' }).notNull(),
  tagId: text('tag_id').references(() => tags.id, { onDelete: 'cascade' }).notNull(),
});

// 關聯定義
export const activitiesRelations = relations(activities, ({ one, many }) => ({
  location: one(locations, {
    fields: [activities.id],
    references: [locations.activityId],
  }),
  time: one(activityTimes, {
    fields: [activities.id],
    references: [activityTimes.activityId],
  }),
  source: one(dataSources, {
    fields: [activities.id],
    references: [dataSources.activityId],
  }),
  categories: many(activityCategories),
  tags: many(activityTags),
  validationLogs: many(validationLogs),
  favorites: many(userFavorites),
}));

export const locationsRelations = relations(locations, ({ one }) => ({
  activity: one(activities, {
    fields: [locations.activityId],
    references: [activities.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  activities: many(activityCategories),
}));

export const activityCategoriesRelations = relations(activityCategories, ({ one }) => ({
  activity: one(activities, {
    fields: [activityCategories.activityId],
    references: [activities.id],
  }),
  category: one(categories, {
    fields: [activityCategories.categoryId],
    references: [categories.id],
  }),
}));

export const activityTimesRelations = relations(activityTimes, ({ one }) => ({
  activity: one(activities, {
    fields: [activityTimes.activityId],
    references: [activities.id],
  }),
}));

export const dataSourcesRelations = relations(dataSources, ({ one }) => ({
  activity: one(activities, {
    fields: [dataSources.activityId],
    references: [activities.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  favorites: many(userFavorites),
  searchLogs: many(searchLogs),
}));

export const userFavoritesRelations = relations(userFavorites, ({ one }) => ({
  user: one(users, {
    fields: [userFavorites.userId],
    references: [users.id],
  }),
  activity: one(activities, {
    fields: [userFavorites.activityId],
    references: [activities.id],
  }),
}));

// 標籤關聯定義
export const tagsRelations = relations(tags, ({ many }) => ({
  activities: many(activityTags),
}));

export const activityTagsRelations = relations(activityTags, ({ one }) => ({
  activity: one(activities, {
    fields: [activityTags.activityId],
    references: [activities.id],
  }),
  tag: one(tags, {
    fields: [activityTags.tagId],
    references: [tags.id],
  }),
}));

// 類型導出
export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type ActivityTime = typeof activityTimes.$inferSelect;
export type NewActivityTime = typeof activityTimes.$inferInsert;
export type DataSource = typeof dataSources.$inferSelect;
export type NewDataSource = typeof dataSources.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserFavorite = typeof userFavorites.$inferSelect;
export type NewUserFavorite = typeof userFavorites.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type ActivityTag = typeof activityTags.$inferSelect;
export type NewActivityTag = typeof activityTags.$inferInsert;
export type ActivityCategory = typeof activityCategories.$inferSelect;
export type NewActivityCategory = typeof activityCategories.$inferInsert;