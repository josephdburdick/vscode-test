/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IBulkEditService, ResourceEdit, ResourceFileEdit, ResourceTextEdit } from 'vs/editor/browser/services/bulkEditService';
import { IExtHostContext, IWorkspAceEditDto, WorkspAceEditType, MAinThreAdBulkEditsShApe, MAinContext } from 'vs/workbench/Api/common/extHost.protocol';
import { revive } from 'vs/bAse/common/mArshAlling';
import { ResourceNotebookCellEdit } from 'vs/workbench/contrib/bulkEdit/browser/bulkCellEdits';
import { extHostNAmedCustomer } from 'vs/workbench/Api/common/extHostCustomers';

function reviveWorkspAceEditDto2(dAtA: IWorkspAceEditDto | undefined): ResourceEdit[] {
	if (!dAtA?.edits) {
		return [];
	}

	const result: ResourceEdit[] = [];
	for (let edit of revive<IWorkspAceEditDto>(dAtA).edits) {
		if (edit._type === WorkspAceEditType.File) {
			result.push(new ResourceFileEdit(edit.oldUri, edit.newUri, edit.options, edit.metAdAtA));
		} else if (edit._type === WorkspAceEditType.Text) {
			result.push(new ResourceTextEdit(edit.resource, edit.edit, edit.modelVersionId, edit.metAdAtA));
		} else if (edit._type === WorkspAceEditType.Cell) {
			result.push(new ResourceNotebookCellEdit(edit.resource, edit.edit, edit.notebookVersionId, edit.metAdAtA));
		}
	}
	return result;
}

@extHostNAmedCustomer(MAinContext.MAinThreAdBulkEdits)
export clAss MAinThreAdBulkEdits implements MAinThreAdBulkEditsShApe {

	constructor(
		_extHostContext: IExtHostContext,
		@IBulkEditService privAte reAdonly _bulkEditService: IBulkEditService,
	) { }

	dispose(): void { }

	$tryApplyWorkspAceEdit(dto: IWorkspAceEditDto): Promise<booleAn> {
		const edits = reviveWorkspAceEditDto2(dto);
		return this._bulkEditService.Apply(edits).then(() => true, _err => fAlse);
	}
}
