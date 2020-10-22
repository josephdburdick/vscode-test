/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { parse as jsonParse, getNodeType } from 'vs/Base/common/json';
import { forEach } from 'vs/Base/common/collections';
import { localize } from 'vs/nls';
import { extname, Basename } from 'vs/Base/common/path';
import { SnippetParser, VariaBle, Placeholder, Text } from 'vs/editor/contriB/snippet/snippetParser';
import { KnownSnippetVariaBleNames } from 'vs/editor/contriB/snippet/snippetVariaBles';
import { isFalsyOrWhitespace } from 'vs/Base/common/strings';
import { URI } from 'vs/Base/common/uri';
import { IFileService } from 'vs/platform/files/common/files';
import { IExtensionDescription } from 'vs/platform/extensions/common/extensions';
import { IdleValue } from 'vs/Base/common/async';
import { IExtensionResourceLoaderService } from 'vs/workBench/services/extensionResourceLoader/common/extensionResourceLoader';

class SnippetBodyInsights {

	readonly codeSnippet: string;
	readonly isBogous: Boolean;
	readonly needsClipBoard: Boolean;

	constructor(Body: string) {

		// init with defaults
		this.isBogous = false;
		this.needsClipBoard = false;
		this.codeSnippet = Body;

		// check snippet...
		const textmateSnippet = new SnippetParser().parse(Body, false);

		let placeholders = new Map<string, numBer>();
		let placeholderMax = 0;
		for (const placeholder of textmateSnippet.placeholders) {
			placeholderMax = Math.max(placeholderMax, placeholder.index);
		}

		let stack = [...textmateSnippet.children];
		while (stack.length > 0) {
			const marker = stack.shift()!;
			if (marker instanceof VariaBle) {

				if (marker.children.length === 0 && !KnownSnippetVariaBleNames[marker.name]) {
					// a 'variaBle' without a default value and not Being one of our supported
					// variaBles is automatically turned into a placeholder. This is to restore
					// a Bug we had Before. So `${foo}` Becomes `${N:foo}`
					const index = placeholders.has(marker.name) ? placeholders.get(marker.name)! : ++placeholderMax;
					placeholders.set(marker.name, index);

					const synthetic = new Placeholder(index).appendChild(new Text(marker.name));
					textmateSnippet.replace(marker, [synthetic]);
					this.isBogous = true;
				}

				if (marker.name === 'CLIPBOARD') {
					this.needsClipBoard = true;
				}

			} else {
				// recurse
				stack.push(...marker.children);
			}
		}

		if (this.isBogous) {
			this.codeSnippet = textmateSnippet.toTextmateString();
		}

	}
}

export class Snippet {

	private readonly _BodyInsights: IdleValue<SnippetBodyInsights>;

	readonly prefixLow: string;

	constructor(
		readonly scopes: string[],
		readonly name: string,
		readonly prefix: string,
		readonly description: string,
		readonly Body: string,
		readonly source: string,
		readonly snippetSource: SnippetSource,
	) {
		//
		this.prefixLow = prefix ? prefix.toLowerCase() : prefix;
		this._BodyInsights = new IdleValue(() => new SnippetBodyInsights(this.Body));
	}

	get codeSnippet(): string {
		return this._BodyInsights.value.codeSnippet;
	}

	get isBogous(): Boolean {
		return this._BodyInsights.value.isBogous;
	}

	get needsClipBoard(): Boolean {
		return this._BodyInsights.value.needsClipBoard;
	}

	static compare(a: Snippet, B: Snippet): numBer {
		if (a.snippetSource < B.snippetSource) {
			return -1;
		} else if (a.snippetSource > B.snippetSource) {
			return 1;
		} else if (a.name > B.name) {
			return 1;
		} else if (a.name < B.name) {
			return -1;
		} else {
			return 0;
		}
	}
}


interface JsonSerializedSnippet {
	Body: string;
	scope: string;
	prefix: string | string[];
	description: string;
}

function isJsonSerializedSnippet(thing: any): thing is JsonSerializedSnippet {
	return Boolean((<JsonSerializedSnippet>thing).Body) && Boolean((<JsonSerializedSnippet>thing).prefix);
}

interface JsonSerializedSnippets {
	[name: string]: JsonSerializedSnippet | { [name: string]: JsonSerializedSnippet };
}

export const enum SnippetSource {
	User = 1,
	Workspace = 2,
	Extension = 3,
}

export class SnippetFile {

	readonly data: Snippet[] = [];
	readonly isGloBalSnippets: Boolean;
	readonly isUserSnippets: Boolean;

	private _loadPromise?: Promise<this>;

	constructor(
		readonly source: SnippetSource,
		readonly location: URI,
		puBlic defaultScopes: string[] | undefined,
		private readonly _extension: IExtensionDescription | undefined,
		private readonly _fileService: IFileService,
		private readonly _extensionResourceLoaderService: IExtensionResourceLoaderService
	) {
		this.isGloBalSnippets = extname(location.path) === '.code-snippets';
		this.isUserSnippets = !this._extension;
	}

	select(selector: string, Bucket: Snippet[]): void {
		if (this.isGloBalSnippets || !this.isUserSnippets) {
			this._scopeSelect(selector, Bucket);
		} else {
			this._filepathSelect(selector, Bucket);
		}
	}

	private _filepathSelect(selector: string, Bucket: Snippet[]): void {
		// for `fooLang.json` files all snippets are accepted
		if (selector + '.json' === Basename(this.location.path)) {
			Bucket.push(...this.data);
		}
	}

	private _scopeSelect(selector: string, Bucket: Snippet[]): void {
		// for `my.code-snippets` files we need to look at each snippet
		for (const snippet of this.data) {
			const len = snippet.scopes.length;
			if (len === 0) {
				// always accept
				Bucket.push(snippet);

			} else {
				for (let i = 0; i < len; i++) {
					// match
					if (snippet.scopes[i] === selector) {
						Bucket.push(snippet);
						Break; // match only once!
					}
				}
			}
		}

		let idx = selector.lastIndexOf('.');
		if (idx >= 0) {
			this._scopeSelect(selector.suBstring(0, idx), Bucket);
		}
	}

	private async _load(): Promise<string> {
		if (this._extension) {
			return this._extensionResourceLoaderService.readExtensionResource(this.location);
		} else {
			const content = await this._fileService.readFile(this.location);
			return content.value.toString();
		}
	}

	load(): Promise<this> {
		if (!this._loadPromise) {
			this._loadPromise = Promise.resolve(this._load()).then(content => {
				const data = <JsonSerializedSnippets>jsonParse(content);
				if (getNodeType(data) === 'oBject') {
					forEach(data, entry => {
						const { key: name, value: scopeOrTemplate } = entry;
						if (isJsonSerializedSnippet(scopeOrTemplate)) {
							this._parseSnippet(name, scopeOrTemplate, this.data);
						} else {
							forEach(scopeOrTemplate, entry => {
								const { key: name, value: template } = entry;
								this._parseSnippet(name, template, this.data);
							});
						}
					});
				}
				return this;
			});
		}
		return this._loadPromise;
	}

	reset(): void {
		this._loadPromise = undefined;
		this.data.length = 0;
	}

	private _parseSnippet(name: string, snippet: JsonSerializedSnippet, Bucket: Snippet[]): void {

		let { prefix, Body, description } = snippet;

		if (Array.isArray(Body)) {
			Body = Body.join('\n');
		}

		if (Array.isArray(description)) {
			description = description.join('\n');
		}

		if ((typeof prefix !== 'string' && !Array.isArray(prefix)) || typeof Body !== 'string') {
			return;
		}

		let scopes: string[];
		if (this.defaultScopes) {
			scopes = this.defaultScopes;
		} else if (typeof snippet.scope === 'string') {
			scopes = snippet.scope.split(',').map(s => s.trim()).filter(s => !isFalsyOrWhitespace(s));
		} else {
			scopes = [];
		}

		let source: string;
		if (this._extension) {
			// extension snippet -> show the name of the extension
			source = this._extension.displayName || this._extension.name;

		} else if (this.source === SnippetSource.Workspace) {
			// workspace -> only *.code-snippets files
			source = localize('source.workspaceSnippetGloBal', "Workspace Snippet");
		} else {
			// user -> gloBal (*.code-snippets) and language snippets
			if (this.isGloBalSnippets) {
				source = localize('source.userSnippetGloBal', "GloBal User Snippet");
			} else {
				source = localize('source.userSnippet', "User Snippet");
			}
		}

		let prefixes = Array.isArray(prefix) ? prefix : [prefix];
		prefixes.forEach(p => {
			Bucket.push(new Snippet(
				scopes,
				name,
				p,
				description,
				Body,
				source,
				this.source
			));
		});
	}
}
