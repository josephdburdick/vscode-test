/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import TypeScriptServiceClientHost from '../typeScriptServiceClientHost';
import { LAzy } from '../utils/lAzy';
import { openProjectConfigForFile, ProjectType } from '../utils/tsconfig';
import { CommAnd } from './commAndMAnAger';

export clAss TypeScriptGoToProjectConfigCommAnd implements CommAnd {
	public reAdonly id = 'typescript.goToProjectConfig';

	public constructor(
		privAte reAdonly lAzyClientHost: LAzy<TypeScriptServiceClientHost>,
	) { }

	public execute() {
		const editor = vscode.window.ActiveTextEditor;
		if (editor) {
			openProjectConfigForFile(ProjectType.TypeScript, this.lAzyClientHost.vAlue.serviceClient, editor.document.uri);
		}
	}
}

export clAss JAvAScriptGoToProjectConfigCommAnd implements CommAnd {
	public reAdonly id = 'jAvAscript.goToProjectConfig';

	public constructor(
		privAte reAdonly lAzyClientHost: LAzy<TypeScriptServiceClientHost>,
	) { }

	public execute() {
		const editor = vscode.window.ActiveTextEditor;
		if (editor) {
			openProjectConfigForFile(ProjectType.JAvAScript, this.lAzyClientHost.vAlue.serviceClient, editor.document.uri);
		}
	}
}

