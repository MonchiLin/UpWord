// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// 本地开发时 base 为空，GitHub Pages 部署时通过环境变量设置为 '/upword'
const base = process.env.DOCS_BASE_PATH || '';

// https://astro.build/config
export default defineConfig({
	site: 'https://monchilin.github.io',
	base,
	integrations: [
		starlight({
			title: 'UpWord Docs',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/MonchiLin/upword' }],
			defaultLocale: 'root',
			locales: {
				root: {
					label: 'English',
					lang: 'en',
				},
				'zh-cn': {
					label: '简体中文',
					lang: 'zh-CN',
				},
			},
			sidebar: [
				{
					label: 'Start Here',
					translations: {
						'zh-CN': '开始',
					},
					items: [
						{ label: 'Quick Start', slug: 'guides/quick-start', translations: { 'zh-CN': '快速开始' } },
						{ label: 'Environment Variables', slug: 'guides/env-vars', translations: { 'zh-CN': '环境变量' } },
					],
				},
				{
					label: 'Guides',
					translations: {
						'zh-CN': '指南',
					},
					items: [
						{ label: 'Deployment', slug: 'guides/deployment', translations: { 'zh-CN': '部署指南' } },
					],
				},
				{
					label: 'Reference',
					translations: {
						'zh-CN': '参考',
					},
					items: [
						{ label: 'API', slug: 'reference/api', translations: { 'zh-CN': 'API 参考' } },
						{ label: 'LLM Pipeline', slug: 'reference/llm-pipeline', translations: { 'zh-CN': 'LLM 管线' } },
						{ label: 'Feature Modules', slug: 'reference/features', translations: { 'zh-CN': '功能模块' } },
						{ label: 'Database', slug: 'reference/database', translations: { 'zh-CN': '数据库' } },
					],
				},
			],
		}),
	],
});
