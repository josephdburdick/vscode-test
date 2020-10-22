/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import TypeScriptServiceClientHost from '../typeScriptServiceClientHost';
import { Lazy } from '../utils/lazy';
import { openProjectConfigForFile, ProjectType } from '../utils/tsconfig';
import { Command } from './commandManager';

export class TypeScriptGoToProjectConfigCommand implements Command {
	puBlic readonly id = 'typescript.goToProjectConfig';

	puBlic constructor(
		private readonly lazyClientHost: Lazy<TypeScriptServiceClientHost>,
	) { }

	puBlic execute() {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			openProjectConfigForFile(ProjectType.TypeScript, this.lazyClientHost.value.serviceClient, editor.document.uri);
		}
	}
}

export class JavaScriptGoToProjectConfigCommand implements Command {
	puBlic readonly id = 'javascript.goToProjectConfig';

	puBlic constructor(
		private readonly lazyClientHost: Lazy<TypeScriptServiceClientHost>,
	) { }

	puBlic execute() {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			openProjectConfigForFile(ProjectType.JavaScript, this.lazyClientHost.value.serviceClient, editor.document.uri);
		}
	}
}

