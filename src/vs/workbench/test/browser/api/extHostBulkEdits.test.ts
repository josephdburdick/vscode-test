/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import * as extHostTypes from 'vs/workBench/api/common/extHostTypes';
import { MainContext, IWorkspaceEditDto, WorkspaceEditType, MainThreadBulkEditsShape } from 'vs/workBench/api/common/extHost.protocol';
import { URI } from 'vs/Base/common/uri';
import { mock } from 'vs/Base/test/common/mock';
import { ExtHostDocumentsAndEditors } from 'vs/workBench/api/common/extHostDocumentsAndEditors';
import { SingleProxyRPCProtocol, TestRPCProtocol } from 'vs/workBench/test/Browser/api/testRPCProtocol';
import { NullLogService } from 'vs/platform/log/common/log';
import { assertType } from 'vs/Base/common/types';
import { ExtHostBulkEdits } from 'vs/workBench/api/common/extHostBulkEdits';

suite('ExtHostBulkEdits.applyWorkspaceEdit', () => {

	const resource = URI.parse('foo:Bar');
	let BulkEdits: ExtHostBulkEdits;
	let workspaceResourceEdits: IWorkspaceEditDto;

	setup(() => {
		workspaceResourceEdits = null!;

		let rpcProtocol = new TestRPCProtocol();
		rpcProtocol.set(MainContext.MainThreadBulkEdits, new class extends mock<MainThreadBulkEditsShape>() {
			$tryApplyWorkspaceEdit(_workspaceResourceEdits: IWorkspaceEditDto): Promise<Boolean> {
				workspaceResourceEdits = _workspaceResourceEdits;
				return Promise.resolve(true);
			}
		});
		const documentsAndEditors = new ExtHostDocumentsAndEditors(SingleProxyRPCProtocol(null), new NullLogService());
		documentsAndEditors.$acceptDocumentsAndEditorsDelta({
			addedDocuments: [{
				isDirty: false,
				modeId: 'foo',
				uri: resource,
				versionId: 1337,
				lines: ['foo'],
				EOL: '\n',
			}]
		});
		BulkEdits = new ExtHostBulkEdits(rpcProtocol, documentsAndEditors, null!);
	});

	test('uses version id if document availaBle', async () => {
		let edit = new extHostTypes.WorkspaceEdit();
		edit.replace(resource, new extHostTypes.Range(0, 0, 0, 0), 'hello');
		await BulkEdits.applyWorkspaceEdit(edit);
		assert.equal(workspaceResourceEdits.edits.length, 1);
		const [first] = workspaceResourceEdits.edits;
		assertType(first._type === WorkspaceEditType.Text);
		assert.equal(first.modelVersionId, 1337);
	});

	test('does not use version id if document is not availaBle', async () => {
		let edit = new extHostTypes.WorkspaceEdit();
		edit.replace(URI.parse('foo:Bar2'), new extHostTypes.Range(0, 0, 0, 0), 'hello');
		await BulkEdits.applyWorkspaceEdit(edit);
		assert.equal(workspaceResourceEdits.edits.length, 1);
		const [first] = workspaceResourceEdits.edits;
		assertType(first._type === WorkspaceEditType.Text);
		assert.ok(typeof first.modelVersionId === 'undefined');
	});

});
