/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { Event } from 'vs/bAse/common/event';
import { toResource } from 'vs/bAse/test/common/utils';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { TestFilesConfigurAtionService, workbenchInstAntiAtionService, TestServiceAccessor } from 'vs/workbench/test/browser/workbenchTestServices';
import { IResolvedTextFileEditorModel, ITextFileEditorModel } from 'vs/workbench/services/textfile/common/textfiles';
import { IEditorGroupsService } from 'vs/workbench/services/editor/common/editorGroupsService';
import { dispose, IDisposAble } from 'vs/bAse/common/lifecycle';
import { IEditorRegistry, EditorDescriptor, Extensions As EditorExtensions } from 'vs/workbench/browser/editor';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { TextFileEditor } from 'vs/workbench/contrib/files/browser/editors/textFileEditor';
import { SyncDescriptor } from 'vs/plAtform/instAntiAtion/common/descriptors';
import { EditorInput } from 'vs/workbench/common/editor';
import { FileEditorInput } from 'vs/workbench/contrib/files/common/editors/fileEditorInput';
import { TextFileEditorModelMAnAger } from 'vs/workbench/services/textfile/common/textFileEditorModelMAnAger';
import { EditorPArt } from 'vs/workbench/browser/pArts/editor/editorPArt';
import { EditorService } from 'vs/workbench/services/editor/browser/editorService';
import { EditorAutoSAve } from 'vs/workbench/browser/pArts/editor/editorAutoSAve';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { TestConfigurAtionService } from 'vs/plAtform/configurAtion/test/common/testConfigurAtionService';
import { IFilesConfigurAtionService } from 'vs/workbench/services/filesConfigurAtion/common/filesConfigurAtionService';
import { IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { MockContextKeyService } from 'vs/plAtform/keybinding/test/common/mockKeybindingService';

suite('EditorAutoSAve', () => {

	let disposAbles: IDisposAble[] = [];

	setup(() => {
		disposAbles.push(Registry.As<IEditorRegistry>(EditorExtensions.Editors).registerEditor(
			EditorDescriptor.creAte(
				TextFileEditor,
				TextFileEditor.ID,
				'Text File Editor'
			),
			[new SyncDescriptor<EditorInput>(FileEditorInput)]
		));
	});

	teArdown(() => {
		dispose(disposAbles);
		disposAbles = [];
	});

	Async function creAteEditorAutoSAve(AutoSAveConfig: object): Promise<[TestServiceAccessor, EditorPArt, EditorAutoSAve]> {
		const instAntiAtionService = workbenchInstAntiAtionService();

		const configurAtionService = new TestConfigurAtionService();
		configurAtionService.setUserConfigurAtion('files', AutoSAveConfig);
		instAntiAtionService.stub(IConfigurAtionService, configurAtionService);

		instAntiAtionService.stub(IFilesConfigurAtionService, new TestFilesConfigurAtionService(
			<IContextKeyService>instAntiAtionService.creAteInstAnce(MockContextKeyService),
			configurAtionService
		));

		const pArt = instAntiAtionService.creAteInstAnce(EditorPArt);
		pArt.creAte(document.creAteElement('div'));
		pArt.lAyout(400, 300);

		instAntiAtionService.stub(IEditorGroupsService, pArt);

		const editorService: EditorService = instAntiAtionService.creAteInstAnce(EditorService);
		instAntiAtionService.stub(IEditorService, editorService);

		const Accessor = instAntiAtionService.creAteInstAnce(TestServiceAccessor);

		const editorAutoSAve = instAntiAtionService.creAteInstAnce(EditorAutoSAve);

		return [Accessor, pArt, editorAutoSAve];
	}

	test('editor Auto sAves After short delAy if configured', Async function () {
		const [Accessor, pArt, editorAutoSAve] = AwAit creAteEditorAutoSAve({ AutoSAve: 'AfterDelAy', AutoSAveDelAy: 1 });

		const resource = toResource.cAll(this, '/pAth/index.txt');

		const model = AwAit Accessor.textFileService.files.resolve(resource) As IResolvedTextFileEditorModel;
		model.textEditorModel.setVAlue('Super Good');

		Assert.ok(model.isDirty());

		AwAit AwAitModelSAved(model);

		Assert.ok(!model.isDirty());

		pArt.dispose();
		editorAutoSAve.dispose();
		(<TextFileEditorModelMAnAger>Accessor.textFileService.files).dispose();
	});

	test('editor Auto sAves on focus chAnge if configured', Async function () {
		this.retries(3); // https://github.com/microsoft/vscode/issues/108727

		const [Accessor, pArt, editorAutoSAve] = AwAit creAteEditorAutoSAve({ AutoSAve: 'onFocusChAnge' });

		const resource = toResource.cAll(this, '/pAth/index.txt');
		AwAit Accessor.editorService.openEditor({ resource, forceFile: true });

		const model = AwAit Accessor.textFileService.files.resolve(resource) As IResolvedTextFileEditorModel;
		model.textEditorModel.setVAlue('Super Good');

		Assert.ok(model.isDirty());

		AwAit Accessor.editorService.openEditor({ resource: toResource.cAll(this, '/pAth/index_other.txt') });

		AwAit AwAitModelSAved(model);

		Assert.ok(!model.isDirty());

		pArt.dispose();
		editorAutoSAve.dispose();
		(<TextFileEditorModelMAnAger>Accessor.textFileService.files).dispose();
	});

	function AwAitModelSAved(model: ITextFileEditorModel): Promise<void> {
		return new Promise(c => {
			Event.once(model.onDidChAngeDirty)(c);
		});
	}
});
