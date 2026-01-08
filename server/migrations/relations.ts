import { relations } from "drizzle-orm/relations";
import { articleVocabulary, articleVocabDefinitions, articles, generationProfiles, tasks, articleWordIndex, highlights, words, dailyWordReferences, articleVariants } from "./schema";

export const articleVocabDefinitionsRelations = relations(articleVocabDefinitions, ({one}) => ({
	articleVocabulary: one(articleVocabulary, {
		fields: [articleVocabDefinitions.vocabId],
		references: [articleVocabulary.id]
	}),
}));

export const articleVocabularyRelations = relations(articleVocabulary, ({one, many}) => ({
	articleVocabDefinitions: many(articleVocabDefinitions),
	article: one(articles, {
		fields: [articleVocabulary.articleId],
		references: [articles.id]
	}),
}));

export const articlesRelations = relations(articles, ({one, many}) => ({
	articleVocabularies: many(articleVocabulary),
	articleWordIndices: many(articleWordIndex),
	task: one(tasks, {
		fields: [articles.generationTaskId],
		references: [tasks.id]
	}),
	highlights: many(highlights),
	articleVariants: many(articleVariants),
}));

export const tasksRelations = relations(tasks, ({one, many}) => ({
	generationProfile: one(generationProfiles, {
		fields: [tasks.profileId],
		references: [generationProfiles.id]
	}),
	articles: many(articles),
}));

export const generationProfilesRelations = relations(generationProfiles, ({many}) => ({
	tasks: many(tasks),
}));

export const articleWordIndexRelations = relations(articleWordIndex, ({one}) => ({
	article: one(articles, {
		fields: [articleWordIndex.articleId],
		references: [articles.id]
	}),
}));

export const highlightsRelations = relations(highlights, ({one}) => ({
	article: one(articles, {
		fields: [highlights.articleId],
		references: [articles.id]
	}),
}));

export const dailyWordReferencesRelations = relations(dailyWordReferences, ({one}) => ({
	word: one(words, {
		fields: [dailyWordReferences.word],
		references: [words.word]
	}),
}));

export const wordsRelations = relations(words, ({many}) => ({
	dailyWordReferences: many(dailyWordReferences),
}));

export const articleVariantsRelations = relations(articleVariants, ({one}) => ({
	article: one(articles, {
		fields: [articleVariants.articleId],
		references: [articles.id]
	}),
}));