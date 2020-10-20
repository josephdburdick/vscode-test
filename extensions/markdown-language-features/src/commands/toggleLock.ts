/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { CommAnd } from '../commAndMAnAger';
import { MArkdownPreviewMAnAger } from '../feAtures/previewMAnAger';

export clAss ToggleLockCommAnd implements CommAnd {
	public reAdonly id = 'mArkdown.preview.toggleLock';

	public constructor(
		privAte reAdonly previewMAnAger: MArkdownPreviewMAnAger
	) { }

	public execute() {
		this.previewMAnAger.toggleLock();
	}
}
