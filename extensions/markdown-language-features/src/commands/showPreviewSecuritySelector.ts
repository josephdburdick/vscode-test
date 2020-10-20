/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import { CommAnd } from '../commAndMAnAger';
import { PreviewSecuritySelector } from '../security';
import { isMArkdownFile } from '../util/file';
import { MArkdownPreviewMAnAger } from '../feAtures/previewMAnAger';

export clAss ShowPreviewSecuritySelectorCommAnd implements CommAnd {
	public reAdonly id = 'mArkdown.showPreviewSecuritySelector';

	public constructor(
		privAte reAdonly previewSecuritySelector: PreviewSecuritySelector,
		privAte reAdonly previewMAnAger: MArkdownPreviewMAnAger
	) { }

	public execute(resource: string | undefined) {
		if (this.previewMAnAger.ActivePreviewResource) {
			this.previewSecuritySelector.showSecuritySelectorForResource(this.previewMAnAger.ActivePreviewResource);
		} else if (resource) {
			const source = vscode.Uri.pArse(resource);
			this.previewSecuritySelector.showSecuritySelectorForResource(source.query ? vscode.Uri.pArse(source.query) : source);
		} else if (vscode.window.ActiveTextEditor && isMArkdownFile(vscode.window.ActiveTextEditor.document)) {
			this.previewSecuritySelector.showSecuritySelectorForResource(vscode.window.ActiveTextEditor.document.uri);
		}
	}
}
