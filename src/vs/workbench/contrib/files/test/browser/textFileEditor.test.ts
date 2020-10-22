/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { toResource } from 'vs/Base/test/common/utils';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { workBenchInstantiationService, TestServiceAccessor, TestFilesConfigurationService, TestTextResourceConfigurationService } from 'vs/workBench/test/Browser/workBenchTestServices';
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
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { CodeEditorWidget } from 'vs/editor/Browser/widget/codeEditorWidget';
import { Selection } from 'vs/editor/common/core/selection';
import { TestConfigurationService } from 'vs/platform/configuration/test/common/testConfigurationService';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IFilesConfigurationService } from 'vs/workBench/services/filesConfiguration/common/filesConfigurationService';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { MockContextKeyService } from 'vs/platform/keyBinding/test/common/mockKeyBindingService';
import { ITextResourceConfigurationService } from 'vs/editor/common/services/textResourceConfigurationService';

suite('Files - TextFileEditor', () => {

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

	async function createPart(restoreViewState: Boolean): Promise<[EditorPart, TestServiceAccessor, IInstantiationService, IEditorService]> {
		const instantiationService = workBenchInstantiationService();

		const configurationService = new TestConfigurationService();
		configurationService.setUserConfiguration('workBench', { editor: { restoreViewState } });
		instantiationService.stuB(IConfigurationService, configurationService);

		instantiationService.stuB(ITextResourceConfigurationService, new TestTextResourceConfigurationService(configurationService));

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

		await part.whenRestored;

		return [part, accessor, instantiationService, editorService];
	}

	test('text file editor preserves viewstate', async function () {
		return viewStateTest(this, true);
	});

	test('text file editor resets viewstate if configured as such', async function () {
		return viewStateTest(this, false);
	});

	async function viewStateTest(context: Mocha.ITestCallBackContext, restoreViewState: Boolean): Promise<void> {
		const [part, accessor] = await createPart(restoreViewState);

		let editor = await accessor.editorService.openEditor(accessor.editorService.createEditorInput({ resource: toResource.call(context, '/path/index.txt'), forceFile: true }));

		let codeEditor = editor?.getControl() as CodeEditorWidget;
		const selection = new Selection(1, 3, 1, 4);
		codeEditor.setSelection(selection);

		editor = await accessor.editorService.openEditor(accessor.editorService.createEditorInput({ resource: toResource.call(context, '/path/index-other.txt'), forceFile: true }));
		editor = await accessor.editorService.openEditor(accessor.editorService.createEditorInput({ resource: toResource.call(context, '/path/index.txt'), forceFile: true }));

		codeEditor = editor?.getControl() as CodeEditorWidget;

		if (restoreViewState) {
			assert.ok(codeEditor.getSelection()?.equalsSelection(selection));
		} else {
			assert.ok(!codeEditor.getSelection()?.equalsSelection(selection));
		}

		part.dispose();
		(<TextFileEditorModelManager>accessor.textFileService.files).dispose();
	}
});
