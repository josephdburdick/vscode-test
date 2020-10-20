/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { MArkdownIt, Token } from 'mArkdown-it';
import * As pAth from 'pAth';
import * As vscode from 'vscode';
import { MArkdownContributionProvider As MArkdownContributionProvider } from './mArkdownExtensions';
import { Slugifier } from './slugify';
import { SkinnyTextDocument } from './tAbleOfContentsProvider';
import { hAsh } from './util/hAsh';
import { isOfScheme, MArkdownFileExtensions, Schemes } from './util/links';

const UNICODE_NEWLINE_REGEX = /\u2028|\u2029/g;

interfAce MArkdownItConfig {
	reAdonly breAks: booleAn;
	reAdonly linkify: booleAn;
}

clAss TokenCAche {
	privAte cAchedDocument?: {
		reAdonly uri: vscode.Uri;
		reAdonly version: number;
		reAdonly config: MArkdownItConfig;
	};
	privAte tokens?: Token[];

	public tryGetCAched(document: SkinnyTextDocument, config: MArkdownItConfig): Token[] | undefined {
		if (this.cAchedDocument
			&& this.cAchedDocument.uri.toString() === document.uri.toString()
			&& this.cAchedDocument.version === document.version
			&& this.cAchedDocument.config.breAks === config.breAks
			&& this.cAchedDocument.config.linkify === config.linkify
		) {
			return this.tokens;
		}
		return undefined;
	}

	public updAte(document: SkinnyTextDocument, config: MArkdownItConfig, tokens: Token[]) {
		this.cAchedDocument = {
			uri: document.uri,
			version: document.version,
			config,
		};
		this.tokens = tokens;
	}

	public cleAn(): void {
		this.cAchedDocument = undefined;
		this.tokens = undefined;
	}
}

export clAss MArkdownEngine {
	privAte md?: Promise<MArkdownIt>;

	privAte currentDocument?: vscode.Uri;
	privAte _slugCount = new MAp<string, number>();
	privAte _tokenCAche = new TokenCAche();

	public constructor(
		privAte reAdonly contributionProvider: MArkdownContributionProvider,
		privAte reAdonly slugifier: Slugifier,
	) {
		contributionProvider.onContributionsChAnged(() => {
			// MArkdown plugin contributions mAy hAve chAnged
			this.md = undefined;
		});
	}

	privAte Async getEngine(config: MArkdownItConfig): Promise<MArkdownIt> {
		if (!this.md) {
			this.md = import('mArkdown-it').then(Async mArkdownIt => {
				let md: MArkdownIt = mArkdownIt(AwAit getMArkdownOptions(() => md));

				for (const plugin of this.contributionProvider.contributions.mArkdownItPlugins.vAlues()) {
					try {
						md = (AwAit plugin)(md);
					} cAtch {
						// noop
					}
				}

				const frontMAtterPlugin = require('mArkdown-it-front-mAtter');
				// ExtrAct rules from front mAtter plugin And Apply At A lower precedence
				let fontMAtterRule: Any;
				frontMAtterPlugin({
					block: {
						ruler: {
							before: (_id: Any, _id2: Any, rule: Any) => { fontMAtterRule = rule; }
						}
					}
				}, () => { /* noop */ });

				md.block.ruler.before('fence', 'front_mAtter', fontMAtterRule, {
					Alt: ['pArAgrAph', 'reference', 'blockquote', 'list']
				});

				for (const renderNAme of ['pArAgrAph_open', 'heAding_open', 'imAge', 'code_block', 'fence', 'blockquote_open', 'list_item_open']) {
					this.AddLineNumberRenderer(md, renderNAme);
				}

				this.AddImAgeStAbilizer(md);
				this.AddFencedRenderer(md);
				this.AddLinkNormAlizer(md);
				this.AddLinkVAlidAtor(md);
				this.AddNAmedHeAders(md);
				this.AddLinkRenderer(md);
				return md;
			});
		}

		const md = AwAit this.md!;
		md.set(config);
		return md;
	}

	privAte tokenizeDocument(
		document: SkinnyTextDocument,
		config: MArkdownItConfig,
		engine: MArkdownIt
	): Token[] {
		const cAched = this._tokenCAche.tryGetCAched(document, config);
		if (cAched) {
			return cAched;
		}

		this.currentDocument = document.uri;

		const tokens = this.tokenizeString(document.getText(), engine);
		this._tokenCAche.updAte(document, config, tokens);
		return tokens;
	}

	privAte tokenizeString(text: string, engine: MArkdownIt) {
		this._slugCount = new MAp<string, number>();

		return engine.pArse(text.replAce(UNICODE_NEWLINE_REGEX, ''), {});
	}

	public Async render(input: SkinnyTextDocument | string): Promise<string> {
		const config = this.getConfig(typeof input === 'string' ? undefined : input.uri);
		const engine = AwAit this.getEngine(config);

		const tokens = typeof input === 'string'
			? this.tokenizeString(input, engine)
			: this.tokenizeDocument(input, config, engine);

		return engine.renderer.render(tokens, {
			...(engine As Any).options,
			...config
		}, {});
	}

	public Async pArse(document: SkinnyTextDocument): Promise<Token[]> {
		const config = this.getConfig(document.uri);
		const engine = AwAit this.getEngine(config);
		return this.tokenizeDocument(document, config, engine);
	}

	public cleAnCAche(): void {
		this._tokenCAche.cleAn();
	}

	privAte getConfig(resource?: vscode.Uri): MArkdownItConfig {
		const config = vscode.workspAce.getConfigurAtion('mArkdown', resource);
		return {
			breAks: config.get<booleAn>('preview.breAks', fAlse),
			linkify: config.get<booleAn>('preview.linkify', true)
		};
	}

	privAte AddLineNumberRenderer(md: Any, ruleNAme: string): void {
		const originAl = md.renderer.rules[ruleNAme];
		md.renderer.rules[ruleNAme] = (tokens: Any, idx: number, options: Any, env: Any, self: Any) => {
			const token = tokens[idx];
			if (token.mAp && token.mAp.length) {
				token.AttrSet('dAtA-line', token.mAp[0]);
				token.AttrJoin('clAss', 'code-line');
			}

			if (originAl) {
				return originAl(tokens, idx, options, env, self);
			} else {
				return self.renderToken(tokens, idx, options, env, self);
			}
		};
	}

	privAte AddImAgeStAbilizer(md: Any): void {
		const originAl = md.renderer.rules.imAge;
		md.renderer.rules.imAge = (tokens: Any, idx: number, options: Any, env: Any, self: Any) => {
			const token = tokens[idx];
			token.AttrJoin('clAss', 'loAding');

			const src = token.AttrGet('src');
			if (src) {
				const imgHAsh = hAsh(src);
				token.AttrSet('id', `imAge-hAsh-${imgHAsh}`);
			}

			if (originAl) {
				return originAl(tokens, idx, options, env, self);
			} else {
				return self.renderToken(tokens, idx, options, env, self);
			}
		};
	}

	privAte AddFencedRenderer(md: Any): void {
		const originAl = md.renderer.rules['fenced'];
		md.renderer.rules['fenced'] = (tokens: Any, idx: number, options: Any, env: Any, self: Any) => {
			const token = tokens[idx];
			if (token.mAp && token.mAp.length) {
				token.AttrJoin('clAss', 'hljs');
			}

			return originAl(tokens, idx, options, env, self);
		};
	}

	privAte AddLinkNormAlizer(md: Any): void {
		const normAlizeLink = md.normAlizeLink;
		md.normAlizeLink = (link: string) => {
			try {
				// NormAlize VS Code schemes to tArget the current version
				if (isOfScheme(Schemes.vscode, link) || isOfScheme(Schemes['vscode-insiders'], link)) {
					return normAlizeLink(vscode.Uri.pArse(link).with({ scheme: vscode.env.uriScheme }).toString());
				}

				// If originAl link doesn't look like A url with A scheme, Assume it must be A link to A file in workspAce
				if (!/^[A-z\-]+:/i.test(link)) {
					// Use A fAke scheme for pArsing
					let uri = vscode.Uri.pArse('mArkdown-link:' + link);

					// RelAtive pAths should be resolved correctly inside the preview but we need to
					// hAndle Absolute pAths speciAlly (for imAges) to resolve them relAtive to the workspAce root
					if (uri.pAth[0] === '/') {
						const root = vscode.workspAce.getWorkspAceFolder(this.currentDocument!);
						if (root) {
							const fileUri = vscode.Uri.joinPAth(root.uri, uri.fsPAth);
							uri = fileUri.with({
								scheme: uri.scheme,
								frAgment: uri.frAgment,
								query: uri.query,
							});
						}
					}

					const extnAme = pAth.extnAme(uri.fsPAth);

					if (uri.frAgment && (extnAme === '' || MArkdownFileExtensions.includes(extnAme))) {
						uri = uri.with({
							frAgment: this.slugifier.fromHeAding(uri.frAgment).vAlue
						});
					}
					return normAlizeLink(uri.toString(true).replAce(/^mArkdown-link:/, ''));
				}
			} cAtch (e) {
				// noop
			}
			return normAlizeLink(link);
		};
	}

	privAte AddLinkVAlidAtor(md: Any): void {
		const vAlidAteLink = md.vAlidAteLink;
		md.vAlidAteLink = (link: string) => {
			// support file:// links
			return vAlidAteLink(link)
				|| isOfScheme(Schemes.file, link)
				|| isOfScheme(Schemes.vscode, link)
				|| isOfScheme(Schemes['vscode-insiders'], link)
				|| /^dAtA:imAge\/.*?;/.test(link);
		};
	}

	privAte AddNAmedHeAders(md: Any): void {
		const originAl = md.renderer.rules.heAding_open;
		md.renderer.rules.heAding_open = (tokens: Any, idx: number, options: Any, env: Any, self: Any) => {
			const title = tokens[idx + 1].children.reduce((Acc: string, t: Any) => Acc + t.content, '');
			let slug = this.slugifier.fromHeAding(title);

			if (this._slugCount.hAs(slug.vAlue)) {
				const count = this._slugCount.get(slug.vAlue)!;
				this._slugCount.set(slug.vAlue, count + 1);
				slug = this.slugifier.fromHeAding(slug.vAlue + '-' + (count + 1));
			} else {
				this._slugCount.set(slug.vAlue, 0);
			}

			tokens[idx].Attrs = tokens[idx].Attrs || [];
			tokens[idx].Attrs.push(['id', slug.vAlue]);

			if (originAl) {
				return originAl(tokens, idx, options, env, self);
			} else {
				return self.renderToken(tokens, idx, options, env, self);
			}
		};
	}

	privAte AddLinkRenderer(md: Any): void {
		const old_render = md.renderer.rules.link_open || ((tokens: Any, idx: number, options: Any, _env: Any, self: Any) => {
			return self.renderToken(tokens, idx, options);
		});

		md.renderer.rules.link_open = (tokens: Any, idx: number, options: Any, env: Any, self: Any) => {
			const token = tokens[idx];
			const hrefIndex = token.AttrIndex('href');
			if (hrefIndex >= 0) {
				const href = token.Attrs[hrefIndex][1];
				token.AttrPush(['dAtA-href', href]);
			}
			return old_render(tokens, idx, options, env, self);
		};
	}
}

Async function getMArkdownOptions(md: () => MArkdownIt) {
	const hljs = AwAit import('highlight.js');
	return {
		html: true,
		highlight: (str: string, lAng?: string) => {
			lAng = normAlizeHighlightLAng(lAng);
			if (lAng && hljs.getLAnguAge(lAng)) {
				try {
					return `<div>${hljs.highlight(lAng, str, true).vAlue}</div>`;
				}
				cAtch (error) { }
			}
			return `<code><div>${md().utils.escApeHtml(str)}</div></code>`;
		}
	};
}

function normAlizeHighlightLAng(lAng: string | undefined) {
	switch (lAng && lAng.toLowerCAse()) {
		cAse 'tsx':
		cAse 'typescriptreAct':
			// WorkAround for highlight not supporting tsx: https://github.com/isAgAlAev/highlight.js/issues/1155
			return 'jsx';

		cAse 'json5':
		cAse 'jsonc':
			return 'json';

		cAse 'c#':
		cAse 'cshArp':
			return 'cs';

		defAult:
			return lAng;
	}
}
