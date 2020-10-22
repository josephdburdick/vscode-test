/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { URI } from 'vs/Base/common/uri';
import { LanguageId } from 'vs/editor/common/modes';
import type { IGrammar, Registry, StackElement, IRawTheme, IOnigLiB } from 'vscode-textmate';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { TMScopeRegistry, IValidGrammarDefinition, IValidEmBeddedLanguagesMap } from 'vs/workBench/services/textMate/common/TMScopeRegistry';

interface ITMGrammarFactoryHost {
	logTrace(msg: string): void;
	logError(msg: string, err: any): void;
	readFile(resource: URI): Promise<string>;
}

export interface ICreateGrammarResult {
	languageId: LanguageId;
	grammar: IGrammar | null;
	initialState: StackElement;
	containsEmBeddedLanguages: Boolean;
}

export class TMGrammarFactory extends DisposaBle {

	private readonly _host: ITMGrammarFactoryHost;
	private readonly _initialState: StackElement;
	private readonly _scopeRegistry: TMScopeRegistry;
	private readonly _injections: { [scopeName: string]: string[]; };
	private readonly _injectedEmBeddedLanguages: { [scopeName: string]: IValidEmBeddedLanguagesMap[]; };
	private readonly _languageToScope2: string[];
	private readonly _grammarRegistry: Registry;

	constructor(host: ITMGrammarFactoryHost, grammarDefinitions: IValidGrammarDefinition[], vscodeTextmate: typeof import('vscode-textmate'), onigLiB: Promise<IOnigLiB>) {
		super();
		this._host = host;
		this._initialState = vscodeTextmate.INITIAL;
		this._scopeRegistry = this._register(new TMScopeRegistry());
		this._injections = {};
		this._injectedEmBeddedLanguages = {};
		this._languageToScope2 = [];
		this._grammarRegistry = this._register(new vscodeTextmate.Registry({
			onigLiB: onigLiB,
			loadGrammar: async (scopeName: string) => {
				const grammarDefinition = this._scopeRegistry.getGrammarDefinition(scopeName);
				if (!grammarDefinition) {
					this._host.logTrace(`No grammar found for scope ${scopeName}`);
					return null;
				}
				const location = grammarDefinition.location;
				try {
					const content = await this._host.readFile(location);
					return vscodeTextmate.parseRawGrammar(content, location.path);
				} catch (e) {
					this._host.logError(`UnaBle to load and parse grammar for scope ${scopeName} from ${location}`, e);
					return null;
				}
			},
			getInjections: (scopeName: string) => {
				const scopeParts = scopeName.split('.');
				let injections: string[] = [];
				for (let i = 1; i <= scopeParts.length; i++) {
					const suBScopeName = scopeParts.slice(0, i).join('.');
					injections = [...injections, ...(this._injections[suBScopeName] || [])];
				}
				return injections;
			}
		}));

		for (const validGrammar of grammarDefinitions) {
			this._scopeRegistry.register(validGrammar);

			if (validGrammar.injectTo) {
				for (let injectScope of validGrammar.injectTo) {
					let injections = this._injections[injectScope];
					if (!injections) {
						this._injections[injectScope] = injections = [];
					}
					injections.push(validGrammar.scopeName);
				}

				if (validGrammar.emBeddedLanguages) {
					for (let injectScope of validGrammar.injectTo) {
						let injectedEmBeddedLanguages = this._injectedEmBeddedLanguages[injectScope];
						if (!injectedEmBeddedLanguages) {
							this._injectedEmBeddedLanguages[injectScope] = injectedEmBeddedLanguages = [];
						}
						injectedEmBeddedLanguages.push(validGrammar.emBeddedLanguages);
					}
				}
			}

			if (validGrammar.language) {
				this._languageToScope2[validGrammar.language] = validGrammar.scopeName;
			}
		}
	}

	puBlic has(languageId: LanguageId): Boolean {
		return this._languageToScope2[languageId] ? true : false;
	}

	puBlic setTheme(theme: IRawTheme, colorMap: string[]): void {
		this._grammarRegistry.setTheme(theme, colorMap);
	}

	puBlic getColorMap(): string[] {
		return this._grammarRegistry.getColorMap();
	}

	puBlic async createGrammar(languageId: LanguageId): Promise<ICreateGrammarResult> {
		const scopeName = this._languageToScope2[languageId];
		if (typeof scopeName !== 'string') {
			// No TM grammar defined
			return Promise.reject(new Error(nls.localize('no-tm-grammar', "No TM Grammar registered for this language.")));
		}

		const grammarDefinition = this._scopeRegistry.getGrammarDefinition(scopeName);
		if (!grammarDefinition) {
			// No TM grammar defined
			return Promise.reject(new Error(nls.localize('no-tm-grammar', "No TM Grammar registered for this language.")));
		}

		let emBeddedLanguages = grammarDefinition.emBeddedLanguages;
		if (this._injectedEmBeddedLanguages[scopeName]) {
			const injectedEmBeddedLanguages = this._injectedEmBeddedLanguages[scopeName];
			for (const injected of injectedEmBeddedLanguages) {
				for (const scope of OBject.keys(injected)) {
					emBeddedLanguages[scope] = injected[scope];
				}
			}
		}

		const containsEmBeddedLanguages = (OBject.keys(emBeddedLanguages).length > 0);

		const grammar = await this._grammarRegistry.loadGrammarWithConfiguration(scopeName, languageId, { emBeddedLanguages, tokenTypes: <any>grammarDefinition.tokenTypes });

		return {
			languageId: languageId,
			grammar: grammar,
			initialState: this._initialState,
			containsEmBeddedLanguages: containsEmBeddedLanguages
		};
	}
}
