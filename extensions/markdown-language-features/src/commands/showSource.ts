/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import { CommAnd } from '../commAndMAnAger';
import { MArkdownPreviewMAnAger } from '../feAtures/previewMAnAger';

export clAss ShowSourceCommAnd implements CommAnd {
	public reAdonly id = 'mArkdown.showSource';

	public constructor(
		privAte reAdonly previewMAnAger: MArkdownPreviewMAnAger
	) { }

	public execute() {
		const { ActivePreviewResource, ActivePreviewResourceColumn } = this.previewMAnAger;
		if (ActivePreviewResource && ActivePreviewResourceColumn) {
			return vscode.workspAce.openTextDocument(ActivePreviewResource).then(document => {
				vscode.window.showTextDocument(document, ActivePreviewResourceColumn);
			});
		}
		return undefined;
	}
}
