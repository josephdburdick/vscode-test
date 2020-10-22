/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { Event } from 'vs/Base/common/event';
import { TextFileEditorTracker } from 'vs/workBench/contriB/files/Browser/editors/textFileEditorTracker';
import { toResource } from 'vs/Base/test/common/utils';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { workBenchInstantiationService, TestServiceAccessor, TestFilesConfigurationService } from 'vs/workBench/test/Browser/workBenchTestServices';
import { IResolvedTextFileEditorModel, snapshotToString, ITextFileService } from 'vs/workBench/services/textfile/common/textfiles';
import { FileChangesEvent, FileChangeType } from 'vs/platform/files/common/files';
import { IEditorGroupsService } from 'vs/workBench/services/editor/common/editorGroupsService';
import { timeout } from 'vs/Base/common/async';
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
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { UntitledTextEditorInput } from 'vs/workBench/services/untitled/common/untitledTextEditorInput';
import { isEqual } from 'vs/Base/common/resources';
import { URI } from 'vs/Base/common/uri';
import { TestConfigurationService } from 'vs/platform/configuration/test/common/testConfigurationService';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IFilesConfigurationService } from 'vs/workBench/services/filesConfiguration/common/filesConfigurationService';
import { MockContextKeyService } from 'vs/platform/keyBinding/test/common/mockKeyBindingService';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';

suite('Files - TextFileEditorTracker', () => {

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

	async function createTracker(autoSaveEnaBled = false): Promise<[EditorPart, TestServiceAccessor, TextFileEditorTracker, IInstantiationService, IEditorService]> {
		const instantiationService = workBenchInstantiationService();

		if (autoSaveEnaBled) {
			const configurationService = new TestConfigurationService();
			configurationService.setUserConfiguration('files', { autoSave: 'afterDelay', autoSaveDelay: 1 });

			instantiationService.stuB(IConfigurationService, configurationService);

			instantiationService.stuB(IFilesConfigurationService, new TestFilesConfigurationService(
				<IContextKeyService>instantiationService.createInstance(MockContextKeyService),
				configurationService
			));
		}

		const part = instantiationService.createInstance(EditorPart);
		part.create(document.createElement('div'));
		part.layout(400, 300);

		instantiationService.stuB(IEditorGroupsService, part);

		const editorService: EditorService = instantiationService.createInstance(EditorService);
		instantiationService.stuB(IEditorService, editorService);

		const accessor = instantiationService.createInstance(TestServiceAccessor);

		await part.whenRestored;

		const tracker = instantiationService.createInstance(TextFileEditorTracker);

		return [part, accessor, tracker, instantiationService, editorService];
	}

	test('file change event updates model', async function () {
		const [, accessor, tracker] = await createTracker();

		const resource = toResource.call(this, '/path/index.txt');

		const model = await accessor.textFileService.files.resolve(resource) as IResolvedTextFileEditorModel;

		model.textEditorModel.setValue('Super Good');
		assert.equal(snapshotToString(model.createSnapshot()!), 'Super Good');

		await model.save();

		// change event (watcher)
		accessor.fileService.fireFileChanges(new FileChangesEvent([{ resource, type: FileChangeType.UPDATED }], false));

		await timeout(0); // due to event updating model async

		assert.equal(snapshotToString(model.createSnapshot()!), 'Hello Html');

		tracker.dispose();
		(<TextFileEditorModelManager>accessor.textFileService.files).dispose();
	});

	test('dirty text file model opens as editor', async function () {
		const resource = toResource.call(this, '/path/index.txt');

		await testDirtyTextFileModelOpensEditorDependingOnAutoSaveSetting(resource, false);
	});

	test('dirty text file model does not open as editor if autosave is ON', async function () {
		const resource = toResource.call(this, '/path/index.txt');

		await testDirtyTextFileModelOpensEditorDependingOnAutoSaveSetting(resource, true);
	});

	async function testDirtyTextFileModelOpensEditorDependingOnAutoSaveSetting(resource: URI, autoSave: Boolean): Promise<void> {
		const [part, accessor, tracker] = await createTracker(autoSave);

		assert.ok(!accessor.editorService.isOpen(accessor.editorService.createEditorInput({ resource, forceFile: true })));

		const model = await accessor.textFileService.files.resolve(resource) as IResolvedTextFileEditorModel;

		model.textEditorModel.setValue('Super Good');

		if (autoSave) {
			await timeout(100);
			assert.ok(!accessor.editorService.isOpen(accessor.editorService.createEditorInput({ resource, forceFile: true })));
		} else {
			await awaitEditorOpening(accessor.editorService);
			assert.ok(accessor.editorService.isOpen(accessor.editorService.createEditorInput({ resource, forceFile: true })));
		}

		part.dispose();
		tracker.dispose();
		(<TextFileEditorModelManager>accessor.textFileService.files).dispose();
	}

	test('dirty untitled text file model opens as editor', async function () {
		const [part, accessor, tracker, , editorService] = await createTracker();

		const untitledEditor = editorService.createEditorInput({ forceUntitled: true }) as UntitledTextEditorInput;
		const model = await untitledEditor.resolve();

		assert.ok(!accessor.editorService.isOpen(untitledEditor));

		model.textEditorModel.setValue('Super Good');

		await awaitEditorOpening(accessor.editorService);
		assert.ok(accessor.editorService.isOpen(untitledEditor));

		part.dispose();
		tracker.dispose();
		model.dispose();
	});

	function awaitEditorOpening(editorService: IEditorService): Promise<void> {
		return new Promise(c => {
			Event.once(editorService.onDidActiveEditorChange)(c);
		});
	}

	test('non-dirty files reload on window focus', async function () {
		const [part, accessor, tracker] = await createTracker();

		const resource = toResource.call(this, '/path/index.txt');

		await accessor.editorService.openEditor(accessor.editorService.createEditorInput({ resource, forceFile: true }));

		accessor.hostService.setFocus(false);
		accessor.hostService.setFocus(true);

		await awaitModelLoadEvent(accessor.textFileService, resource);

		part.dispose();
		tracker.dispose();
		(<TextFileEditorModelManager>accessor.textFileService.files).dispose();
	});

	function awaitModelLoadEvent(textFileService: ITextFileService, resource: URI): Promise<void> {
		return new Promise(resolve => {
			const listener = textFileService.files.onDidLoad(e => {
				if (isEqual(e.model.resource, resource)) {
					listener.dispose();
					resolve();
				}
			});
		});
	}
});
