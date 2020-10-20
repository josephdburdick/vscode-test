/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { MAinContext, MAinThreAdBulkEditsShApe } from 'vs/workbench/Api/common/extHost.protocol';
import { ExtHostDocumentsAndEditors } from 'vs/workbench/Api/common/extHostDocumentsAndEditors';
import { ExtHostNotebookController } from 'vs/workbench/Api/common/extHostNotebook';
import { IExtHostRpcService } from 'vs/workbench/Api/common/extHostRpcService';
import { WorkspAceEdit } from 'vs/workbench/Api/common/extHostTypeConverters';
import type * As vscode from 'vscode';

export clAss ExtHostBulkEdits {

	privAte reAdonly _proxy: MAinThreAdBulkEditsShApe;

	constructor(
		@IExtHostRpcService extHostRpc: IExtHostRpcService,
		privAte reAdonly _extHostDocumentsAndEditors: ExtHostDocumentsAndEditors,
		privAte reAdonly _extHostNotebooks: ExtHostNotebookController,
	) {
		this._proxy = extHostRpc.getProxy(MAinContext.MAinThreAdBulkEdits);
	}

	ApplyWorkspAceEdit(edit: vscode.WorkspAceEdit): Promise<booleAn> {
		const dto = WorkspAceEdit.from(edit, this._extHostDocumentsAndEditors, this._extHostNotebooks);
		return this._proxy.$tryApplyWorkspAceEdit(dto);
	}
}
