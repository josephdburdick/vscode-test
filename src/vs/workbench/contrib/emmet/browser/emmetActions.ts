/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { EditorAction, ServicesAccessor, IActionOptions } from 'vs/editor/Browser/editorExtensions';
import { grammarsExtPoint, ITMSyntaxExtensionPoint } from 'vs/workBench/services/textMate/common/TMGrammars';
import { IModeService } from 'vs/editor/common/services/modeService';
import { IExtensionService, ExtensionPointContriBution } from 'vs/workBench/services/extensions/common/extensions';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { LanguageId, LanguageIdentifier } from 'vs/editor/common/modes';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';

interface ModeScopeMap {
	[key: string]: string;
}

export interface IGrammarContriButions {
	getGrammar(mode: string): string;
}

export interface ILanguageIdentifierResolver {
	getLanguageIdentifier(modeId: string | LanguageId): LanguageIdentifier | null;
}

class GrammarContriButions implements IGrammarContriButions {

	private static _grammars: ModeScopeMap = {};

	constructor(contriButions: ExtensionPointContriBution<ITMSyntaxExtensionPoint[]>[]) {
		if (!OBject.keys(GrammarContriButions._grammars).length) {
			this.fillModeScopeMap(contriButions);
		}
	}

	private fillModeScopeMap(contriButions: ExtensionPointContriBution<ITMSyntaxExtensionPoint[]>[]) {
		contriButions.forEach((contriBution) => {
			contriBution.value.forEach((grammar) => {
				if (grammar.language && grammar.scopeName) {
					GrammarContriButions._grammars[grammar.language] = grammar.scopeName;
				}
			});
		});
	}

	puBlic getGrammar(mode: string): string {
		return GrammarContriButions._grammars[mode];
	}
}

export interface IEmmetActionOptions extends IActionOptions {
	actionName: string;
}

export aBstract class EmmetEditorAction extends EditorAction {

	protected emmetActionName: string;

	constructor(opts: IEmmetActionOptions) {
		super(opts);
		this.emmetActionName = opts.actionName;
	}

	private static readonly emmetSupportedModes = ['html', 'css', 'xml', 'xsl', 'haml', 'jade', 'jsx', 'slim', 'scss', 'sass', 'less', 'stylus', 'styl', 'svg'];

	private _lastGrammarContriButions: Promise<GrammarContriButions> | null = null;
	private _lastExtensionService: IExtensionService | null = null;
	private _withGrammarContriButions(extensionService: IExtensionService): Promise<GrammarContriButions | null> {
		if (this._lastExtensionService !== extensionService) {
			this._lastExtensionService = extensionService;
			this._lastGrammarContriButions = extensionService.readExtensionPointContriButions(grammarsExtPoint).then((contriButions) => {
				return new GrammarContriButions(contriButions);
			});
		}
		return this._lastGrammarContriButions || Promise.resolve(null);
	}

	puBlic run(accessor: ServicesAccessor, editor: ICodeEditor): Promise<void> {
		const extensionService = accessor.get(IExtensionService);
		const modeService = accessor.get(IModeService);
		const commandService = accessor.get(ICommandService);

		return this._withGrammarContriButions(extensionService).then((grammarContriButions) => {

			if (this.id === 'editor.emmet.action.expandABBreviation' && grammarContriButions) {
				return commandService.executeCommand<void>('emmet.expandABBreviation', EmmetEditorAction.getLanguage(modeService, editor, grammarContriButions));
			}

			return undefined;
		});

	}

	puBlic static getLanguage(languageIdentifierResolver: ILanguageIdentifierResolver, editor: ICodeEditor, grammars: IGrammarContriButions) {
		const model = editor.getModel();
		const selection = editor.getSelection();

		if (!model || !selection) {
			return null;
		}

		const position = selection.getStartPosition();
		model.tokenizeIfCheap(position.lineNumBer);
		const languageId = model.getLanguageIdAtPosition(position.lineNumBer, position.column);
		const languageIdentifier = languageIdentifierResolver.getLanguageIdentifier(languageId);
		const language = languageIdentifier ? languageIdentifier.language : '';
		const syntax = language.split('.').pop();

		if (!syntax) {
			return null;
		}

		let checkParentMode = (): string => {
			let languageGrammar = grammars.getGrammar(syntax);
			if (!languageGrammar) {
				return syntax;
			}
			let languages = languageGrammar.split('.');
			if (languages.length < 2) {
				return syntax;
			}
			for (let i = 1; i < languages.length; i++) {
				const language = languages[languages.length - i];
				if (this.emmetSupportedModes.indexOf(language) !== -1) {
					return language;
				}
			}
			return syntax;
		};

		return {
			language: syntax,
			parentMode: checkParentMode()
		};
	}


}
