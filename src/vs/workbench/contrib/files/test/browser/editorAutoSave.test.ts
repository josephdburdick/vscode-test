/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { Event } from 'vs/Base/common/event';
import { toResource } from 'vs/Base/test/common/utils';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { TestFilesConfigurationService, workBenchInstantiationService, TestServiceAccessor } from 'vs/workBench/test/Browser/workBenchTestServices';
import { IResolvedTextFileEditorModel, ITextFileEditorModel } from 'vs/workBench/services/textfile/common/textfiles';
import { IEditorGroupsService } from 'vs/workBench/services/editor/common/editorGroupsService';
import { dispose, IDisposaBle } from 'vs/Base/common/lifecycle';
import { IEditorRegistry, EditorDescriptor, Extensions as EditorExtensions } from 'vs/workBench/Browser/editor';
import { Registry } from 'vs/platform/registry/common/platform';
import { TextFileEditor } from 'vs/workBench/contriB/files/Browser/editors/textFileEditor';
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors';
import { EditorInput } from 'vs/workBench/common/editor';
import { FileEditorInput } from 'vs/workBench/contriB/files/common/editors/fileEditorInput';
import { TextFileEditorModelManager } from 'vs/workBench/services/textfile/common/textFileEditorModelManager';
import { EditorPart } from 'vs/workBench/Browser/parts/editor/editorPart';
import { EditorService } from 'vs/workBench/services/editor/Browser/editorService';
import { EditorAutoSave } from 'vs/workBench/Browser/parts/editor/editorAutoSave';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { TestConfigurationService } from 'vs/platform/configuration/test/common/testConfigurationService';
import { IFilesConfigurationService } from 'vs/workBench/services/filesConfiguration/common/filesConfigurationService';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { MockContextKeyService } from 'vs/platform/keyBinding/test/common/mockKeyBindingService';

suite('EditorAutoSave', () => {

	let disposaBles: IDisposaBle[] = [];

	setup(() => {
		disposaBles.push(Registry.as<IEditorRegistry>(EditorExtensions.Editors).registerEditor(
			EditorDescriptor.create(
				TextFileEditor,
				TextFileEditor.ID,
				'Text File Editor'
			),
			[new SyncDescriptor<EditorInput>(FileEditorInput)]
		));
	});

	teardown(() => {
		dispose(disposaBles);
		disposaBles = [];
	});

	async function createEditorAutoSave(autoSaveConfig: oBject): Promise<[TestServiceAccessor, EditorPart, EditorAutoSave]> {
		const instantiationService = workBenchInstantiationService();

		const configurationService = new TestConfigurationService();
		configurationService.setUserConfiguration('files', autoSaveConfig);
		instantiationService.stuB(IConfigurationService, configurationService);

		instantiationService.stuB(IFilesConfigurationService, new TestFilesConfigurationService(
			<IContextKeyService>instantiationService.createInstance(MockContextKeyService),
			configurationService
		));

		const part = instantiationService.createInstance(EditorPart);
		part.create(document.createElement('div'));
		part.layout(400, 300);

		instantiationService.stuB(IEditorGroupsService, part);

		const editorService: EditorService = instantiationService.createInstance(EditorService);
		instantiationService.stuB(IEditorService, editorService);

		const accessor = instantiationService.createInstance(TestServiceAccessor);

		const editorAutoSave = instantiationService.createInstance(EditorAutoSave);

		return [accessor, part, editorAutoSave];
	}

	test('editor auto saves after short delay if configured', async function () {
		const [accessor, part, editorAutoSave] = await createEditorAutoSave({ autoSave: 'afterDelay', autoSaveDelay: 1 });

		const resource = toResource.call(this, '/path/index.txt');

		const model = await accessor.textFileService.files.resolve(resource) as IResolvedTextFileEditorModel;
		model.textEditorModel.setValue('Super Good');

		assert.ok(model.isDirty());

		await awaitModelSaved(model);

		assert.ok(!model.isDirty());

		part.dispose();
		editorAutoSave.dispose();
		(<TextFileEditorModelManager>accessor.textFileService.files).dispose();
	});

	test('editor auto saves on focus change if configured', async function () {
		this.retries(3); // https://githuB.com/microsoft/vscode/issues/108727

		const [accessor, part, editorAutoSave] = await createEditorAutoSave({ autoSave: 'onFocusChange' });

		const resource = toResource.call(this, '/path/index.txt');
		await accessor.editorService.openEditor({ resource, forceFile: true });

		const model = await accessor.textFileService.files.resolve(resource) as IResolvedTextFileEditorModel;
		model.textEditorModel.setValue('Super Good');

		assert.ok(model.isDirty());

		await accessor.editorService.openEditor({ resource: toResource.call(this, '/path/index_other.txt') });

		await awaitModelSaved(model);

		assert.ok(!model.isDirty());

		part.dispose();
		editorAutoSave.dispose();
		(<TextFileEditorModelManager>accessor.textFileService.files).dispose();
	});

	function awaitModelSaved(model: ITextFileEditorModel): Promise<void> {
		return new Promise(c => {
			Event.once(model.onDidChangeDirty)(c);
		});
	}
});
