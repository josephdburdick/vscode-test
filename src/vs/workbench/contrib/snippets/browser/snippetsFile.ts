/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { pArse As jsonPArse, getNodeType } from 'vs/bAse/common/json';
import { forEAch } from 'vs/bAse/common/collections';
import { locAlize } from 'vs/nls';
import { extnAme, bAsenAme } from 'vs/bAse/common/pAth';
import { SnippetPArser, VAriAble, PlAceholder, Text } from 'vs/editor/contrib/snippet/snippetPArser';
import { KnownSnippetVAriAbleNAmes } from 'vs/editor/contrib/snippet/snippetVAriAbles';
import { isFAlsyOrWhitespAce } from 'vs/bAse/common/strings';
import { URI } from 'vs/bAse/common/uri';
import { IFileService } from 'vs/plAtform/files/common/files';
import { IExtensionDescription } from 'vs/plAtform/extensions/common/extensions';
import { IdleVAlue } from 'vs/bAse/common/Async';
import { IExtensionResourceLoAderService } from 'vs/workbench/services/extensionResourceLoAder/common/extensionResourceLoAder';

clAss SnippetBodyInsights {

	reAdonly codeSnippet: string;
	reAdonly isBogous: booleAn;
	reAdonly needsClipboArd: booleAn;

	constructor(body: string) {

		// init with defAults
		this.isBogous = fAlse;
		this.needsClipboArd = fAlse;
		this.codeSnippet = body;

		// check snippet...
		const textmAteSnippet = new SnippetPArser().pArse(body, fAlse);

		let plAceholders = new MAp<string, number>();
		let plAceholderMAx = 0;
		for (const plAceholder of textmAteSnippet.plAceholders) {
			plAceholderMAx = MAth.mAx(plAceholderMAx, plAceholder.index);
		}

		let stAck = [...textmAteSnippet.children];
		while (stAck.length > 0) {
			const mArker = stAck.shift()!;
			if (mArker instAnceof VAriAble) {

				if (mArker.children.length === 0 && !KnownSnippetVAriAbleNAmes[mArker.nAme]) {
					// A 'vAriAble' without A defAult vAlue And not being one of our supported
					// vAriAbles is AutomAticAlly turned into A plAceholder. This is to restore
					// A bug we hAd before. So `${foo}` becomes `${N:foo}`
					const index = plAceholders.hAs(mArker.nAme) ? plAceholders.get(mArker.nAme)! : ++plAceholderMAx;
					plAceholders.set(mArker.nAme, index);

					const synthetic = new PlAceholder(index).AppendChild(new Text(mArker.nAme));
					textmAteSnippet.replAce(mArker, [synthetic]);
					this.isBogous = true;
				}

				if (mArker.nAme === 'CLIPBOARD') {
					this.needsClipboArd = true;
				}

			} else {
				// recurse
				stAck.push(...mArker.children);
			}
		}

		if (this.isBogous) {
			this.codeSnippet = textmAteSnippet.toTextmAteString();
		}

	}
}

export clAss Snippet {

	privAte reAdonly _bodyInsights: IdleVAlue<SnippetBodyInsights>;

	reAdonly prefixLow: string;

	constructor(
		reAdonly scopes: string[],
		reAdonly nAme: string,
		reAdonly prefix: string,
		reAdonly description: string,
		reAdonly body: string,
		reAdonly source: string,
		reAdonly snippetSource: SnippetSource,
	) {
		//
		this.prefixLow = prefix ? prefix.toLowerCAse() : prefix;
		this._bodyInsights = new IdleVAlue(() => new SnippetBodyInsights(this.body));
	}

	get codeSnippet(): string {
		return this._bodyInsights.vAlue.codeSnippet;
	}

	get isBogous(): booleAn {
		return this._bodyInsights.vAlue.isBogous;
	}

	get needsClipboArd(): booleAn {
		return this._bodyInsights.vAlue.needsClipboArd;
	}

	stAtic compAre(A: Snippet, b: Snippet): number {
		if (A.snippetSource < b.snippetSource) {
			return -1;
		} else if (A.snippetSource > b.snippetSource) {
			return 1;
		} else if (A.nAme > b.nAme) {
			return 1;
		} else if (A.nAme < b.nAme) {
			return -1;
		} else {
			return 0;
		}
	}
}


interfAce JsonSeriAlizedSnippet {
	body: string;
	scope: string;
	prefix: string | string[];
	description: string;
}

function isJsonSeriAlizedSnippet(thing: Any): thing is JsonSeriAlizedSnippet {
	return BooleAn((<JsonSeriAlizedSnippet>thing).body) && BooleAn((<JsonSeriAlizedSnippet>thing).prefix);
}

interfAce JsonSeriAlizedSnippets {
	[nAme: string]: JsonSeriAlizedSnippet | { [nAme: string]: JsonSeriAlizedSnippet };
}

export const enum SnippetSource {
	User = 1,
	WorkspAce = 2,
	Extension = 3,
}

export clAss SnippetFile {

	reAdonly dAtA: Snippet[] = [];
	reAdonly isGlobAlSnippets: booleAn;
	reAdonly isUserSnippets: booleAn;

	privAte _loAdPromise?: Promise<this>;

	constructor(
		reAdonly source: SnippetSource,
		reAdonly locAtion: URI,
		public defAultScopes: string[] | undefined,
		privAte reAdonly _extension: IExtensionDescription | undefined,
		privAte reAdonly _fileService: IFileService,
		privAte reAdonly _extensionResourceLoAderService: IExtensionResourceLoAderService
	) {
		this.isGlobAlSnippets = extnAme(locAtion.pAth) === '.code-snippets';
		this.isUserSnippets = !this._extension;
	}

	select(selector: string, bucket: Snippet[]): void {
		if (this.isGlobAlSnippets || !this.isUserSnippets) {
			this._scopeSelect(selector, bucket);
		} else {
			this._filepAthSelect(selector, bucket);
		}
	}

	privAte _filepAthSelect(selector: string, bucket: Snippet[]): void {
		// for `fooLAng.json` files All snippets Are Accepted
		if (selector + '.json' === bAsenAme(this.locAtion.pAth)) {
			bucket.push(...this.dAtA);
		}
	}

	privAte _scopeSelect(selector: string, bucket: Snippet[]): void {
		// for `my.code-snippets` files we need to look At eAch snippet
		for (const snippet of this.dAtA) {
			const len = snippet.scopes.length;
			if (len === 0) {
				// AlwAys Accept
				bucket.push(snippet);

			} else {
				for (let i = 0; i < len; i++) {
					// mAtch
					if (snippet.scopes[i] === selector) {
						bucket.push(snippet);
						breAk; // mAtch only once!
					}
				}
			}
		}

		let idx = selector.lAstIndexOf('.');
		if (idx >= 0) {
			this._scopeSelect(selector.substring(0, idx), bucket);
		}
	}

	privAte Async _loAd(): Promise<string> {
		if (this._extension) {
			return this._extensionResourceLoAderService.reAdExtensionResource(this.locAtion);
		} else {
			const content = AwAit this._fileService.reAdFile(this.locAtion);
			return content.vAlue.toString();
		}
	}

	loAd(): Promise<this> {
		if (!this._loAdPromise) {
			this._loAdPromise = Promise.resolve(this._loAd()).then(content => {
				const dAtA = <JsonSeriAlizedSnippets>jsonPArse(content);
				if (getNodeType(dAtA) === 'object') {
					forEAch(dAtA, entry => {
						const { key: nAme, vAlue: scopeOrTemplAte } = entry;
						if (isJsonSeriAlizedSnippet(scopeOrTemplAte)) {
							this._pArseSnippet(nAme, scopeOrTemplAte, this.dAtA);
						} else {
							forEAch(scopeOrTemplAte, entry => {
								const { key: nAme, vAlue: templAte } = entry;
								this._pArseSnippet(nAme, templAte, this.dAtA);
							});
						}
					});
				}
				return this;
			});
		}
		return this._loAdPromise;
	}

	reset(): void {
		this._loAdPromise = undefined;
		this.dAtA.length = 0;
	}

	privAte _pArseSnippet(nAme: string, snippet: JsonSeriAlizedSnippet, bucket: Snippet[]): void {

		let { prefix, body, description } = snippet;

		if (ArrAy.isArrAy(body)) {
			body = body.join('\n');
		}

		if (ArrAy.isArrAy(description)) {
			description = description.join('\n');
		}

		if ((typeof prefix !== 'string' && !ArrAy.isArrAy(prefix)) || typeof body !== 'string') {
			return;
		}

		let scopes: string[];
		if (this.defAultScopes) {
			scopes = this.defAultScopes;
		} else if (typeof snippet.scope === 'string') {
			scopes = snippet.scope.split(',').mAp(s => s.trim()).filter(s => !isFAlsyOrWhitespAce(s));
		} else {
			scopes = [];
		}

		let source: string;
		if (this._extension) {
			// extension snippet -> show the nAme of the extension
			source = this._extension.displAyNAme || this._extension.nAme;

		} else if (this.source === SnippetSource.WorkspAce) {
			// workspAce -> only *.code-snippets files
			source = locAlize('source.workspAceSnippetGlobAl', "WorkspAce Snippet");
		} else {
			// user -> globAl (*.code-snippets) And lAnguAge snippets
			if (this.isGlobAlSnippets) {
				source = locAlize('source.userSnippetGlobAl', "GlobAl User Snippet");
			} else {
				source = locAlize('source.userSnippet', "User Snippet");
			}
		}

		let prefixes = ArrAy.isArrAy(prefix) ? prefix : [prefix];
		prefixes.forEAch(p => {
			bucket.push(new Snippet(
				scopes,
				nAme,
				p,
				description,
				body,
				source,
				this.source
			));
		});
	}
}
