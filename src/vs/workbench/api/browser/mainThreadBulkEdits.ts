/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IBulkEditService, ResourceEdit, ResourceFileEdit, ResourceTextEdit } from 'vs/editor/Browser/services/BulkEditService';
import { IExtHostContext, IWorkspaceEditDto, WorkspaceEditType, MainThreadBulkEditsShape, MainContext } from 'vs/workBench/api/common/extHost.protocol';
import { revive } from 'vs/Base/common/marshalling';
import { ResourceNoteBookCellEdit } from 'vs/workBench/contriB/BulkEdit/Browser/BulkCellEdits';
import { extHostNamedCustomer } from 'vs/workBench/api/common/extHostCustomers';

function reviveWorkspaceEditDto2(data: IWorkspaceEditDto | undefined): ResourceEdit[] {
	if (!data?.edits) {
		return [];
	}

	const result: ResourceEdit[] = [];
	for (let edit of revive<IWorkspaceEditDto>(data).edits) {
		if (edit._type === WorkspaceEditType.File) {
			result.push(new ResourceFileEdit(edit.oldUri, edit.newUri, edit.options, edit.metadata));
		} else if (edit._type === WorkspaceEditType.Text) {
			result.push(new ResourceTextEdit(edit.resource, edit.edit, edit.modelVersionId, edit.metadata));
		} else if (edit._type === WorkspaceEditType.Cell) {
			result.push(new ResourceNoteBookCellEdit(edit.resource, edit.edit, edit.noteBookVersionId, edit.metadata));
		}
	}
	return result;
}

@extHostNamedCustomer(MainContext.MainThreadBulkEdits)
export class MainThreadBulkEdits implements MainThreadBulkEditsShape {

	constructor(
		_extHostContext: IExtHostContext,
		@IBulkEditService private readonly _BulkEditService: IBulkEditService,
	) { }

	dispose(): void { }

	$tryApplyWorkspaceEdit(dto: IWorkspaceEditDto): Promise<Boolean> {
		const edits = reviveWorkspaceEditDto2(dto);
		return this._BulkEditService.apply(edits).then(() => true, _err => false);
	}
}
