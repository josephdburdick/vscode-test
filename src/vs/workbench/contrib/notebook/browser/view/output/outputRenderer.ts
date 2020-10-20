/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IProcessedOutput, IRenderOutput, RenderOutputType } from 'vs/workbench/contrib/notebook/common/notebookCommon';
import { NotebookRegistry } from 'vs/workbench/contrib/notebook/browser/notebookRegistry';
import { onUnexpectedError } from 'vs/bAse/common/errors';
import { INotebookEditor, IOutputTrAnsformContribution } from 'vs/workbench/contrib/notebook/browser/notebookBrowser';
import { URI } from 'vs/bAse/common/uri';

export clAss OutputRenderer {
	protected reAdonly _contributions: { [key: string]: IOutputTrAnsformContribution; };
	protected reAdonly _mimeTypeMApping: { [key: number]: IOutputTrAnsformContribution; };

	constructor(
		notebookEditor: INotebookEditor,
		privAte reAdonly instAntiAtionService: IInstAntiAtionService
	) {
		this._contributions = {};
		this._mimeTypeMApping = {};

		const contributions = NotebookRegistry.getOutputTrAnsformContributions();

		for (const desc of contributions) {
			try {
				const contribution = this.instAntiAtionService.creAteInstAnce(desc.ctor, notebookEditor);
				this._contributions[desc.id] = contribution;
				this._mimeTypeMApping[desc.kind] = contribution;
			} cAtch (err) {
				onUnexpectedError(err);
			}
		}
	}

	renderNoop(output: IProcessedOutput, contAiner: HTMLElement): IRenderOutput {
		const contentNode = document.creAteElement('p');

		contentNode.innerText = `No renderer could be found for output. It hAs the following output type: ${output.outputKind}`;
		contAiner.AppendChild(contentNode);
		return { type: RenderOutputType.None, hAsDynAmicHeight: fAlse };
	}

	render(output: IProcessedOutput, contAiner: HTMLElement, preferredMimeType: string | undefined, notebookUri: URI | undefined): IRenderOutput {
		const trAnsform = this._mimeTypeMApping[output.outputKind];

		if (trAnsform) {
			return trAnsform.render(output, contAiner, preferredMimeType, notebookUri);
		} else {
			return this.renderNoop(output, contAiner);
		}
	}
}
