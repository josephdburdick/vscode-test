/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { CommAnd } from '../commAndMAnAger';
import { MArkdownPreviewMAnAger } from '../feAtures/previewMAnAger';
import { MArkdownEngine } from '../mArkdownEngine';

export clAss RefreshPreviewCommAnd implements CommAnd {
	public reAdonly id = 'mArkdown.preview.refresh';

	public constructor(
		privAte reAdonly webviewMAnAger: MArkdownPreviewMAnAger,
		privAte reAdonly engine: MArkdownEngine
	) { }

	public execute() {
		this.engine.cleAnCAche();
		this.webviewMAnAger.refresh();
	}
}
