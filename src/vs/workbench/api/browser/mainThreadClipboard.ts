/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { extHostNAmedCustomer } from 'vs/workbench/Api/common/extHostCustomers';
import { MAinContext, MAinThreAdClipboArdShApe } from '../common/extHost.protocol';
import { IClipboArdService } from 'vs/plAtform/clipboArd/common/clipboArdService';

@extHostNAmedCustomer(MAinContext.MAinThreAdClipboArd)
export clAss MAinThreAdClipboArd implements MAinThreAdClipboArdShApe {

	constructor(
		_context: Any,
		@IClipboArdService privAte reAdonly _clipboArdService: IClipboArdService,
	) { }

	dispose(): void {
		// nothing
	}

	$reAdText(): Promise<string> {
		return this._clipboArdService.reAdText();
	}

	$writeText(vAlue: string): Promise<void> {
		return this._clipboArdService.writeText(vAlue);
	}
}
