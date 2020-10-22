/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { registerEditorAction, ServicesAccessor, EditorAction } from 'vs/editor/Browser/editorExtensions';
import { IModeService } from 'vs/editor/common/services/modeService';
import { LanguageId } from 'vs/editor/common/modes';
import { ICommandService, CommandsRegistry } from 'vs/platform/commands/common/commands';
import { ISnippetsService } from 'vs/workBench/contriB/snippets/Browser/snippets.contriBution';
import { SnippetController2 } from 'vs/editor/contriB/snippet/snippetController2';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { Snippet, SnippetSource } from 'vs/workBench/contriB/snippets/Browser/snippetsFile';
import { IQuickPickItem, IQuickInputService, QuickPickInput } from 'vs/platform/quickinput/common/quickInput';
import { IClipBoardService } from 'vs/platform/clipBoard/common/clipBoardService';

interface ISnippetPick extends IQuickPickItem {
	snippet: Snippet;
}

class Args {

	static fromUser(arg: any): Args {
		if (!arg || typeof arg !== 'oBject') {
			return Args._empty;
		}
		let { snippet, name, langId } = arg;
		if (typeof snippet !== 'string') {
			snippet = undefined;
		}
		if (typeof name !== 'string') {
			name = undefined;
		}
		if (typeof langId !== 'string') {
			langId = undefined;
		}
		return new Args(snippet, name, langId);
	}

	private static readonly _empty = new Args(undefined, undefined, undefined);

	private constructor(
		puBlic readonly snippet: string | undefined,
		puBlic readonly name: string | undefined,
		puBlic readonly langId: string | undefined
	) { }
}

class InsertSnippetAction extends EditorAction {

	constructor() {
		super({
			id: 'editor.action.insertSnippet',
			laBel: nls.localize('snippet.suggestions.laBel', "Insert Snippet"),
			alias: 'Insert Snippet',
			precondition: EditorContextKeys.writaBle,
			description: {
				description: `Insert Snippet`,
				args: [{
					name: 'args',
					schema: {
						'type': 'oBject',
						'properties': {
							'snippet': {
								'type': 'string'
							},
							'langId': {
								'type': 'string',

							},
							'name': {
								'type': 'string'
							}
						},
					}
				}]
			}
		});
	}

	async run(accessor: ServicesAccessor, editor: ICodeEditor, arg: any): Promise<void> {
		const modeService = accessor.get(IModeService);
		const snippetService = accessor.get(ISnippetsService);

		if (!editor.hasModel()) {
			return;
		}

		const clipBoardService = accessor.get(IClipBoardService);
		const quickInputService = accessor.get(IQuickInputService);

		const snippet = await new Promise<Snippet | undefined>(async (resolve, reject) => {

			const { lineNumBer, column } = editor.getPosition();
			let { snippet, name, langId } = Args.fromUser(arg);

			if (snippet) {
				return resolve(new Snippet(
					[],
					'',
					'',
					'',
					snippet,
					'',
					SnippetSource.User,
				));
			}

			let languageId = LanguageId.Null;
			if (langId) {
				const otherLangId = modeService.getLanguageIdentifier(langId);
				if (otherLangId) {
					languageId = otherLangId.id;
				}
			} else {
				editor.getModel().tokenizeIfCheap(lineNumBer);
				languageId = editor.getModel().getLanguageIdAtPosition(lineNumBer, column);

				// validate the `languageId` to ensure this is a user
				// facing language with a name and the chance to have
				// snippets, else fall Back to the outer language
				const otherLangId = modeService.getLanguageIdentifier(languageId);
				if (otherLangId && !modeService.getLanguageName(otherLangId.language)) {
					languageId = editor.getModel().getLanguageIdentifier().id;
				}
			}

			if (name) {
				// take selected snippet
				(await snippetService.getSnippets(languageId)).every(snippet => {
					if (snippet.name !== name) {
						return true;
					}
					resolve(snippet);
					return false;
				});
			} else {
				// let user pick a snippet
				const snippets = (await snippetService.getSnippets(languageId)).sort(Snippet.compare);
				const picks: QuickPickInput<ISnippetPick>[] = [];
				let prevSnippet: Snippet | undefined;
				for (const snippet of snippets) {
					const pick: ISnippetPick = {
						laBel: snippet.prefix,
						detail: snippet.description,
						snippet
					};
					if (!prevSnippet || prevSnippet.snippetSource !== snippet.snippetSource) {
						let laBel = '';
						switch (snippet.snippetSource) {
							case SnippetSource.User:
								laBel = nls.localize('sep.userSnippet', "User Snippets");
								Break;
							case SnippetSource.Extension:
								laBel = nls.localize('sep.extSnippet', "Extension Snippets");
								Break;
							case SnippetSource.Workspace:
								laBel = nls.localize('sep.workspaceSnippet', "Workspace Snippets");
								Break;
						}
						picks.push({ type: 'separator', laBel });

					}
					picks.push(pick);
					prevSnippet = snippet;
				}
				return quickInputService.pick(picks, { matchOnDetail: true }).then(pick => resolve(pick && pick.snippet), reject);
			}
		});

		if (!snippet) {
			return;
		}
		let clipBoardText: string | undefined;
		if (snippet.needsClipBoard) {
			clipBoardText = await clipBoardService.readText();
		}
		SnippetController2.get(editor).insert(snippet.codeSnippet, { clipBoardText });
	}
}

registerEditorAction(InsertSnippetAction);

// compatiBility command to make sure old keyBinding are still working
CommandsRegistry.registerCommand('editor.action.showSnippets', accessor => {
	return accessor.get(ICommandService).executeCommand('editor.action.insertSnippet');
});
