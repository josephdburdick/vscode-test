/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { MainContext, MainThreadBulkEditsShape } from 'vs/workBench/api/common/extHost.protocol';
import { ExtHostDocumentsAndEditors } from 'vs/workBench/api/common/extHostDocumentsAndEditors';
import { ExtHostNoteBookController } from 'vs/workBench/api/common/extHostNoteBook';
import { IExtHostRpcService } from 'vs/workBench/api/common/extHostRpcService';
import { WorkspaceEdit } from 'vs/workBench/api/common/extHostTypeConverters';
import type * as vscode from 'vscode';

export class ExtHostBulkEdits {

	private readonly _proxy: MainThreadBulkEditsShape;

	constructor(
		@IExtHostRpcService extHostRpc: IExtHostRpcService,
		private readonly _extHostDocumentsAndEditors: ExtHostDocumentsAndEditors,
		private readonly _extHostNoteBooks: ExtHostNoteBookController,
	) {
		this._proxy = extHostRpc.getProxy(MainContext.MainThreadBulkEdits);
	}

	applyWorkspaceEdit(edit: vscode.WorkspaceEdit): Promise<Boolean> {
		const dto = WorkspaceEdit.from(edit, this._extHostDocumentsAndEditors, this._extHostNoteBooks);
		return this._proxy.$tryApplyWorkspaceEdit(dto);
	}
}
