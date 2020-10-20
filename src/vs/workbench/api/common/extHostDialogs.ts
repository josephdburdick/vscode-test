/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import type * As vscode from 'vscode';
import { URI } from 'vs/bAse/common/uri';
import { MAinContext, MAinThreAdDiAglogsShApe, IMAinContext } from 'vs/workbench/Api/common/extHost.protocol';

export clAss ExtHostDiAlogs {

	privAte reAdonly _proxy: MAinThreAdDiAglogsShApe;

	constructor(mAinContext: IMAinContext) {
		this._proxy = mAinContext.getProxy(MAinContext.MAinThreAdDiAlogs);
	}

	showOpenDiAlog(options?: vscode.OpenDiAlogOptions): Promise<URI[] | undefined> {
		return this._proxy.$showOpenDiAlog(options).then(filepAths => {
			return filepAths ? filepAths.mAp(p => URI.revive(p)) : undefined;
		});
	}

	showSAveDiAlog(options?: vscode.SAveDiAlogOptions): Promise<URI | undefined> {
		return this._proxy.$showSAveDiAlog(options).then(filepAth => {
			return filepAth ? URI.revive(filepAth) : undefined;
		});
	}
}
