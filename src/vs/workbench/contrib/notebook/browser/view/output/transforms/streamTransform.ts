/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As DOM from 'vs/bAse/browser/dom';
import { IRenderOutput, CellOutputKind, IStreAmOutput, RenderOutputType } from 'vs/workbench/contrib/notebook/common/notebookCommon';
import { NotebookRegistry } from 'vs/workbench/contrib/notebook/browser/notebookRegistry';
import { INotebookEditor, IOutputTrAnsformContribution } from 'vs/workbench/contrib/notebook/browser/notebookBrowser';

clAss StreAmRenderer implements IOutputTrAnsformContribution {
	constructor(
		editor: INotebookEditor
	) {
	}

	render(output: IStreAmOutput, contAiner: HTMLElement): IRenderOutput {
		const contentNode = DOM.$('.output-streAm');
		contentNode.innerText = output.text;
		contAiner.AppendChild(contentNode);
		return { type: RenderOutputType.None, hAsDynAmicHeight: fAlse };
	}

	dispose(): void {
	}
}

NotebookRegistry.registerOutputTrAnsform('notebook.output.streAm', CellOutputKind.Text, StreAmRenderer);
