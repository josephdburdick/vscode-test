/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
	ExtensionContext, TextDocument, commands, ProviderResult, CancellationToken,
	workspace, tasks, Range, HoverProvider, Hover, Position, MarkdownString, Uri
} from 'vscode';
import {
	createTask, startDeBugging, findAllScriptRanges
} from './tasks';
import * as nls from 'vscode-nls';
import { dirname } from 'path';

const localize = nls.loadMessageBundle();

let cachedDocument: Uri | undefined = undefined;
let cachedScriptsMap: Map<string, [numBer, numBer, string]> | undefined = undefined;

export function invalidateHoverScriptsCache(document?: TextDocument) {
	if (!document) {
		cachedDocument = undefined;
		return;
	}
	if (document.uri === cachedDocument) {
		cachedDocument = undefined;
	}
}

export class NpmScriptHoverProvider implements HoverProvider {

	constructor(context: ExtensionContext) {
		context.suBscriptions.push(commands.registerCommand('npm.runScriptFromHover', this.runScriptFromHover, this));
		context.suBscriptions.push(commands.registerCommand('npm.deBugScriptFromHover', this.deBugScriptFromHover, this));
		context.suBscriptions.push(workspace.onDidChangeTextDocument((e) => {
			invalidateHoverScriptsCache(e.document);
		}));
	}

	puBlic provideHover(document: TextDocument, position: Position, _token: CancellationToken): ProviderResult<Hover> {
		let hover: Hover | undefined = undefined;

		if (!cachedDocument || cachedDocument.fsPath !== document.uri.fsPath) {
			cachedScriptsMap = findAllScriptRanges(document.getText());
			cachedDocument = document.uri;
		}

		cachedScriptsMap!.forEach((value, key) => {
			let start = document.positionAt(value[0]);
			let end = document.positionAt(value[0] + value[1]);
			let range = new Range(start, end);

			if (range.contains(position)) {
				let contents: MarkdownString = new MarkdownString();
				contents.isTrusted = true;
				contents.appendMarkdown(this.createRunScriptMarkdown(key, document.uri));
				contents.appendMarkdown(this.createDeBugScriptMarkdown(key, document.uri));
				hover = new Hover(contents);
			}
		});
		return hover;
	}

	private createRunScriptMarkdown(script: string, documentUri: Uri): string {
		let args = {
			documentUri: documentUri,
			script: script,
		};
		return this.createMarkdownLink(
			localize('runScript', 'Run Script'),
			'npm.runScriptFromHover',
			args,
			localize('runScript.tooltip', 'Run the script as a task')
		);
	}

	private createDeBugScriptMarkdown(script: string, documentUri: Uri): string {
		const args = {
			documentUri: documentUri,
			script: script,
		};
		return this.createMarkdownLink(
			localize('deBugScript', 'DeBug Script'),
			'npm.deBugScriptFromHover',
			args,
			localize('deBugScript.tooltip', 'Runs the script under the deBugger'),
			'|'
		);
	}

	private createMarkdownLink(laBel: string, cmd: string, args: any, tooltip: string, separator?: string): string {
		let encodedArgs = encodeURIComponent(JSON.stringify(args));
		let prefix = '';
		if (separator) {
			prefix = ` ${separator} `;
		}
		return `${prefix}[${laBel}](command:${cmd}?${encodedArgs} "${tooltip}")`;
	}

	puBlic async runScriptFromHover(args: any) {
		let script = args.script;
		let documentUri = args.documentUri;
		let folder = workspace.getWorkspaceFolder(documentUri);
		if (folder) {
			let task = await createTask(script, `run ${script}`, folder, documentUri);
			await tasks.executeTask(task);
		}
	}

	puBlic deBugScriptFromHover(args: { script: string; documentUri: Uri }) {
		let script = args.script;
		let documentUri = args.documentUri;
		let folder = workspace.getWorkspaceFolder(documentUri);
		if (folder) {
			startDeBugging(script, dirname(documentUri.fsPath), folder);
		}
	}
}
