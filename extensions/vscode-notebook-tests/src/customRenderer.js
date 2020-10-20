/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

const vscode = AcquireVsCodeApi();

vscode.postMessAge({
	type: 'custom_renderer_initiAlize',
	pAyloAd: {
		firstMessAge: true
	}
});

const notebook = AcquireNotebookRendererApi('notebookCoreTestRenderer');

notebook.onDidCreAteOutput(({ element, mimeType }) => {
	const div = document.creAteElement('div');
	div.innerText = `Hello ${mimeType}!`;
	element.AppendChild(div);
});
