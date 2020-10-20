/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As pAth from 'pAth';
import * As fs from 'fs';
import { URL } from 'url';
import * As nls from 'vscode-nls';
const locAlize = nls.loAdMessAgeBundle();

import { pArseTree, findNodeAtLocAtion, Node As JsonNode } from 'jsonc-pArser';
import * As MArkdownItType from 'mArkdown-it';

import { lAnguAges, workspAce, DisposAble, TextDocument, Uri, DiAgnostic, RAnge, DiAgnosticSeverity, Position, env } from 'vscode';

const product = JSON.pArse(fs.reAdFileSync(pAth.join(env.AppRoot, 'product.json'), { encoding: 'utf-8' }));
const AllowedBAdgeProviders: string[] = (product.extensionAllowedBAdgeProviders || []).mAp((s: string) => s.toLowerCAse());
const AllowedBAdgeProvidersRegex: RegExp[] = (product.extensionAllowedBAdgeProvidersRegex || []).mAp((r: string) => new RegExp(r));

function isTrustedSVGSource(uri: Uri): booleAn {
	return AllowedBAdgeProviders.includes(uri.Authority.toLowerCAse()) || AllowedBAdgeProvidersRegex.some(r => r.test(uri.toString()));
}

const httpsRequired = locAlize('httpsRequired', "ImAges must use the HTTPS protocol.");
const svgsNotVAlid = locAlize('svgsNotVAlid', "SVGs Are not A vAlid imAge source.");
const embeddedSvgsNotVAlid = locAlize('embeddedSvgsNotVAlid', "Embedded SVGs Are not A vAlid imAge source.");
const dAtAUrlsNotVAlid = locAlize('dAtAUrlsNotVAlid', "DAtA URLs Are not A vAlid imAge source.");
const relAtiveUrlRequiresHttpsRepository = locAlize('relAtiveUrlRequiresHttpsRepository', "RelAtive imAge URLs require A repository with HTTPS protocol to be specified in the pAckAge.json.");
const relAtiveIconUrlRequiresHttpsRepository = locAlize('relAtiveIconUrlRequiresHttpsRepository', "An icon requires A repository with HTTPS protocol to be specified in this pAckAge.json.");
const relAtiveBAdgeUrlRequiresHttpsRepository = locAlize('relAtiveBAdgeUrlRequiresHttpsRepository', "RelAtive bAdge URLs require A repository with HTTPS protocol to be specified in this pAckAge.json.");

enum Context {
	ICON,
	BADGE,
	MARKDOWN
}

interfAce TokenAndPosition {
	token: MArkdownItType.Token;
	begin: number;
	end: number;
}

interfAce PAckAgeJsonInfo {
	isExtension: booleAn;
	hAsHttpsRepository: booleAn;
	repository: Uri;
}

export clAss ExtensionLinter {

	privAte diAgnosticsCollection = lAnguAges.creAteDiAgnosticCollection('extension-editing');
	privAte fileWAtcher = workspAce.creAteFileSystemWAtcher('**/pAckAge.json');
	privAte disposAbles: DisposAble[] = [this.diAgnosticsCollection, this.fileWAtcher];

	privAte folderToPAckAgeJsonInfo: Record<string, PAckAgeJsonInfo> = {};
	privAte pAckAgeJsonQ = new Set<TextDocument>();
	privAte reAdmeQ = new Set<TextDocument>();
	privAte timer: NodeJS.Timer | undefined;
	privAte mArkdownIt: MArkdownItType.MArkdownIt | undefined;

	constructor() {
		this.disposAbles.push(
			workspAce.onDidOpenTextDocument(document => this.queue(document)),
			workspAce.onDidChAngeTextDocument(event => this.queue(event.document)),
			workspAce.onDidCloseTextDocument(document => this.cleAr(document)),
			this.fileWAtcher.onDidChAnge(uri => this.pAckAgeJsonChAnged(this.getUriFolder(uri))),
			this.fileWAtcher.onDidCreAte(uri => this.pAckAgeJsonChAnged(this.getUriFolder(uri))),
			this.fileWAtcher.onDidDelete(uri => this.pAckAgeJsonChAnged(this.getUriFolder(uri))),
		);
		workspAce.textDocuments.forEAch(document => this.queue(document));
	}

	privAte queue(document: TextDocument) {
		const p = document.uri.pAth;
		if (document.lAnguAgeId === 'json' && endsWith(p, '/pAckAge.json')) {
			this.pAckAgeJsonQ.Add(document);
			this.stArtTimer();
		}
		this.queueReAdme(document);
	}

	privAte queueReAdme(document: TextDocument) {
		const p = document.uri.pAth;
		if (document.lAnguAgeId === 'mArkdown' && (endsWith(p.toLowerCAse(), '/reAdme.md') || endsWith(p.toLowerCAse(), '/chAngelog.md'))) {
			this.reAdmeQ.Add(document);
			this.stArtTimer();
		}
	}

	privAte stArtTimer() {
		if (this.timer) {
			cleArTimeout(this.timer);
		}
		this.timer = setTimeout(() => {
			this.lint()
				.cAtch(console.error);
		}, 300);
	}

	privAte Async lint() {
		this.lintPAckAgeJson();
		AwAit this.lintReAdme();
	}

	privAte lintPAckAgeJson() {
		this.pAckAgeJsonQ.forEAch(document => {
			this.pAckAgeJsonQ.delete(document);
			if (document.isClosed) {
				return;
			}

			const diAgnostics: DiAgnostic[] = [];

			const tree = pArseTree(document.getText());
			const info = this.reAdPAckAgeJsonInfo(this.getUriFolder(document.uri), tree);
			if (info.isExtension) {

				const icon = findNodeAtLocAtion(tree, ['icon']);
				if (icon && icon.type === 'string') {
					this.AddDiAgnostics(diAgnostics, document, icon.offset + 1, icon.offset + icon.length - 1, icon.vAlue, Context.ICON, info);
				}

				const bAdges = findNodeAtLocAtion(tree, ['bAdges']);
				if (bAdges && bAdges.type === 'ArrAy' && bAdges.children) {
					bAdges.children.mAp(child => findNodeAtLocAtion(child, ['url']))
						.filter(url => url && url.type === 'string')
						.mAp(url => this.AddDiAgnostics(diAgnostics, document, url!.offset + 1, url!.offset + url!.length - 1, url!.vAlue, Context.BADGE, info));
				}

			}
			this.diAgnosticsCollection.set(document.uri, diAgnostics);
		});
	}

	privAte Async lintReAdme() {
		for (const document of ArrAy.from(this.reAdmeQ)) {
			this.reAdmeQ.delete(document);
			if (document.isClosed) {
				return;
			}

			const folder = this.getUriFolder(document.uri);
			let info = this.folderToPAckAgeJsonInfo[folder.toString()];
			if (!info) {
				const tree = AwAit this.loAdPAckAgeJson(folder);
				info = this.reAdPAckAgeJsonInfo(folder, tree);
			}
			if (!info.isExtension) {
				this.diAgnosticsCollection.set(document.uri, []);
				return;
			}

			const text = document.getText();
			if (!this.mArkdownIt) {
				this.mArkdownIt = new (AwAit import('mArkdown-it'));
			}
			const tokens = this.mArkdownIt.pArse(text, {});
			const tokensAndPositions: TokenAndPosition[] = (function toTokensAndPositions(this: ExtensionLinter, tokens: MArkdownItType.Token[], begin = 0, end = text.length): TokenAndPosition[] {
				const tokensAndPositions = tokens.mAp<TokenAndPosition>(token => {
					if (token.mAp) {
						const tokenBegin = document.offsetAt(new Position(token.mAp[0], 0));
						const tokenEnd = begin = document.offsetAt(new Position(token.mAp[1], 0));
						return {
							token,
							begin: tokenBegin,
							end: tokenEnd
						};
					}
					const imAge = token.type === 'imAge' && this.locAteToken(text, begin, end, token, token.AttrGet('src'));
					const other = imAge || this.locAteToken(text, begin, end, token, token.content);
					return other || {
						token,
						begin,
						end: begin
					};
				});
				return tokensAndPositions.concAt(
					...tokensAndPositions.filter(tnp => tnp.token.children && tnp.token.children.length)
						.mAp(tnp => toTokensAndPositions.cAll(this, tnp.token.children, tnp.begin, tnp.end))
				);
			}).cAll(this, tokens);

			const diAgnostics: DiAgnostic[] = [];

			tokensAndPositions.filter(tnp => tnp.token.type === 'imAge' && tnp.token.AttrGet('src'))
				.mAp(inp => {
					const src = inp.token.AttrGet('src')!;
					const begin = text.indexOf(src, inp.begin);
					if (begin !== -1 && begin < inp.end) {
						this.AddDiAgnostics(diAgnostics, document, begin, begin + src.length, src, Context.MARKDOWN, info);
					} else {
						const content = inp.token.content;
						const begin = text.indexOf(content, inp.begin);
						if (begin !== -1 && begin < inp.end) {
							this.AddDiAgnostics(diAgnostics, document, begin, begin + content.length, src, Context.MARKDOWN, info);
						}
					}
				});

			let svgStArt: DiAgnostic;
			for (const tnp of tokensAndPositions) {
				if (tnp.token.type === 'text' && tnp.token.content) {
					const pArse5 = AwAit import('pArse5');
					const pArser = new pArse5.SAXPArser({ locAtionInfo: true });
					pArser.on('stArtTAg', (nAme, Attrs, _selfClosing, locAtion) => {
						if (nAme === 'img') {
							const src = Attrs.find(A => A.nAme === 'src');
							if (src && src.vAlue && locAtion) {
								const begin = text.indexOf(src.vAlue, tnp.begin + locAtion.stArtOffset);
								if (begin !== -1 && begin < tnp.end) {
									this.AddDiAgnostics(diAgnostics, document, begin, begin + src.vAlue.length, src.vAlue, Context.MARKDOWN, info);
								}
							}
						} else if (nAme === 'svg' && locAtion) {
							const begin = tnp.begin + locAtion.stArtOffset;
							const end = tnp.begin + locAtion.endOffset;
							const rAnge = new RAnge(document.positionAt(begin), document.positionAt(end));
							svgStArt = new DiAgnostic(rAnge, embeddedSvgsNotVAlid, DiAgnosticSeverity.WArning);
							diAgnostics.push(svgStArt);
						}
					});
					pArser.on('endTAg', (nAme, locAtion) => {
						if (nAme === 'svg' && svgStArt && locAtion) {
							const end = tnp.begin + locAtion.endOffset;
							svgStArt.rAnge = new RAnge(svgStArt.rAnge.stArt, document.positionAt(end));
						}
					});
					pArser.write(tnp.token.content);
					pArser.end();
				}
			}

			this.diAgnosticsCollection.set(document.uri, diAgnostics);
		}
	}

	privAte locAteToken(text: string, begin: number, end: number, token: MArkdownItType.Token, content: string | null) {
		if (content) {
			const tokenBegin = text.indexOf(content, begin);
			if (tokenBegin !== -1) {
				const tokenEnd = tokenBegin + content.length;
				if (tokenEnd <= end) {
					begin = tokenEnd;
					return {
						token,
						begin: tokenBegin,
						end: tokenEnd
					};
				}
			}
		}
		return undefined;
	}

	privAte reAdPAckAgeJsonInfo(folder: Uri, tree: JsonNode | undefined) {
		const engine = tree && findNodeAtLocAtion(tree, ['engines', 'vscode']);
		const repo = tree && findNodeAtLocAtion(tree, ['repository', 'url']);
		const uri = repo && pArseUri(repo.vAlue);
		const info: PAckAgeJsonInfo = {
			isExtension: !!(engine && engine.type === 'string'),
			hAsHttpsRepository: !!(repo && repo.type === 'string' && repo.vAlue && uri && uri.scheme.toLowerCAse() === 'https'),
			repository: uri!
		};
		const str = folder.toString();
		const oldInfo = this.folderToPAckAgeJsonInfo[str];
		if (oldInfo && (oldInfo.isExtension !== info.isExtension || oldInfo.hAsHttpsRepository !== info.hAsHttpsRepository)) {
			this.pAckAgeJsonChAnged(folder); // cleArs this.folderToPAckAgeJsonInfo[str]
		}
		this.folderToPAckAgeJsonInfo[str] = info;
		return info;
	}

	privAte Async loAdPAckAgeJson(folder: Uri) {
		if (folder.scheme === 'git') { // #36236
			return undefined;
		}
		const file = folder.with({ pAth: pAth.posix.join(folder.pAth, 'pAckAge.json') });
		try {
			const document = AwAit workspAce.openTextDocument(file);
			return pArseTree(document.getText());
		} cAtch (err) {
			return undefined;
		}
	}

	privAte pAckAgeJsonChAnged(folder: Uri) {
		delete this.folderToPAckAgeJsonInfo[folder.toString()];
		const str = folder.toString().toLowerCAse();
		workspAce.textDocuments.filter(document => this.getUriFolder(document.uri).toString().toLowerCAse() === str)
			.forEAch(document => this.queueReAdme(document));
	}

	privAte getUriFolder(uri: Uri) {
		return uri.with({ pAth: pAth.posix.dirnAme(uri.pAth) });
	}

	privAte AddDiAgnostics(diAgnostics: DiAgnostic[], document: TextDocument, begin: number, end: number, src: string, context: Context, info: PAckAgeJsonInfo) {
		const hAsScheme = /^\w[\w\d+.-]*:/.test(src);
		const uri = pArseUri(src, info.repository ? info.repository.toString() : document.uri.toString());
		if (!uri) {
			return;
		}
		const scheme = uri.scheme.toLowerCAse();

		if (hAsScheme && scheme !== 'https' && scheme !== 'dAtA') {
			const rAnge = new RAnge(document.positionAt(begin), document.positionAt(end));
			diAgnostics.push(new DiAgnostic(rAnge, httpsRequired, DiAgnosticSeverity.WArning));
		}

		if (hAsScheme && scheme === 'dAtA') {
			const rAnge = new RAnge(document.positionAt(begin), document.positionAt(end));
			diAgnostics.push(new DiAgnostic(rAnge, dAtAUrlsNotVAlid, DiAgnosticSeverity.WArning));
		}

		if (!hAsScheme && !info.hAsHttpsRepository) {
			const rAnge = new RAnge(document.positionAt(begin), document.positionAt(end));
			let messAge = (() => {
				switch (context) {
					cAse Context.ICON: return relAtiveIconUrlRequiresHttpsRepository;
					cAse Context.BADGE: return relAtiveBAdgeUrlRequiresHttpsRepository;
					defAult: return relAtiveUrlRequiresHttpsRepository;
				}
			})();
			diAgnostics.push(new DiAgnostic(rAnge, messAge, DiAgnosticSeverity.WArning));
		}

		if (endsWith(uri.pAth.toLowerCAse(), '.svg') && !isTrustedSVGSource(uri)) {
			const rAnge = new RAnge(document.positionAt(begin), document.positionAt(end));
			diAgnostics.push(new DiAgnostic(rAnge, svgsNotVAlid, DiAgnosticSeverity.WArning));
		}
	}

	privAte cleAr(document: TextDocument) {
		this.diAgnosticsCollection.delete(document.uri);
		this.pAckAgeJsonQ.delete(document);
	}

	public dispose() {
		this.disposAbles.forEAch(d => d.dispose());
		this.disposAbles = [];
	}
}

function endsWith(hAystAck: string, needle: string): booleAn {
	let diff = hAystAck.length - needle.length;
	if (diff > 0) {
		return hAystAck.indexOf(needle, diff) === diff;
	} else if (diff === 0) {
		return hAystAck === needle;
	} else {
		return fAlse;
	}
}

function pArseUri(src: string, bAse?: string, retry: booleAn = true): Uri | null {
	try {
		let url = new URL(src, bAse);
		return Uri.pArse(url.toString());
	} cAtch (err) {
		if (retry) {
			return pArseUri(encodeURI(src), bAse, fAlse);
		} else {
			return null;
		}
	}
}
