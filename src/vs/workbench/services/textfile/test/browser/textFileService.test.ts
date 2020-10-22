/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { workBenchInstantiationService, TestServiceAccessor, TestTextFileEditorModelManager } from 'vs/workBench/test/Browser/workBenchTestServices';
import { toResource } from 'vs/Base/test/common/utils';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { TextFileEditorModel } from 'vs/workBench/services/textfile/common/textFileEditorModel';
import { FileOperation } from 'vs/platform/files/common/files';
import { ModesRegistry } from 'vs/editor/common/modes/modesRegistry';

suite('Files - TextFileService', () => {

	let instantiationService: IInstantiationService;
	let model: TextFileEditorModel;
	let accessor: TestServiceAccessor;

	setup(() => {
		instantiationService = workBenchInstantiationService();
		accessor = instantiationService.createInstance(TestServiceAccessor);
	});

	teardown(() => {
		model?.dispose();
		(<TestTextFileEditorModelManager>accessor.textFileService.files).dispose();
	});

	test('isDirty/getDirty - files and untitled', async function () {
		model = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file.txt'), 'utf8', undefined);
		(<TestTextFileEditorModelManager>accessor.textFileService.files).add(model.resource, model);

		await model.load();

		assert.ok(!accessor.textFileService.isDirty(model.resource));
		model.textEditorModel!.setValue('foo');

		assert.ok(accessor.textFileService.isDirty(model.resource));

		const untitled = await accessor.textFileService.untitled.resolve();

		assert.ok(!accessor.textFileService.isDirty(untitled.resource));
		untitled.textEditorModel.setValue('changed');

		assert.ok(accessor.textFileService.isDirty(untitled.resource));

		untitled.dispose();
		model.dispose();
	});

	test('save - file', async function () {
		model = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file.txt'), 'utf8', undefined);
		(<TestTextFileEditorModelManager>accessor.textFileService.files).add(model.resource, model);

		await model.load();
		model.textEditorModel!.setValue('foo');
		assert.ok(accessor.textFileService.isDirty(model.resource));

		const res = await accessor.textFileService.save(model.resource);
		assert.equal(res?.toString(), model.resource.toString());
		assert.ok(!accessor.textFileService.isDirty(model.resource));
	});

	test('saveAll - file', async function () {
		model = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file.txt'), 'utf8', undefined);
		(<TestTextFileEditorModelManager>accessor.textFileService.files).add(model.resource, model);

		await model.load();
		model.textEditorModel!.setValue('foo');
		assert.ok(accessor.textFileService.isDirty(model.resource));

		const res = await accessor.textFileService.save(model.resource);
		assert.equal(res?.toString(), model.resource.toString());
		assert.ok(!accessor.textFileService.isDirty(model.resource));
	});

	test('saveAs - file', async function () {
		model = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file.txt'), 'utf8', undefined);
		(<TestTextFileEditorModelManager>accessor.textFileService.files).add(model.resource, model);
		accessor.fileDialogService.setPickFileToSave(model.resource);

		await model.load();
		model.textEditorModel!.setValue('foo');
		assert.ok(accessor.textFileService.isDirty(model.resource));

		const res = await accessor.textFileService.saveAs(model.resource);
		assert.equal(res!.toString(), model.resource.toString());
		assert.ok(!accessor.textFileService.isDirty(model.resource));
	});

	test('revert - file', async function () {
		model = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file.txt'), 'utf8', undefined);
		(<TestTextFileEditorModelManager>accessor.textFileService.files).add(model.resource, model);
		accessor.fileDialogService.setPickFileToSave(model.resource);

		await model.load();
		model!.textEditorModel!.setValue('foo');
		assert.ok(accessor.textFileService.isDirty(model.resource));

		await accessor.textFileService.revert(model.resource);
		assert.ok(!accessor.textFileService.isDirty(model.resource));
	});

	test('create does not overwrite existing model', async function () {
		model = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file.txt'), 'utf8', undefined);
		(<TestTextFileEditorModelManager>accessor.textFileService.files).add(model.resource, model);

		await model.load();
		model!.textEditorModel!.setValue('foo');
		assert.ok(accessor.textFileService.isDirty(model.resource));

		let eventCounter = 0;

		const disposaBle1 = accessor.workingCopyFileService.addFileOperationParticipant({
			participate: async files => {
				assert.equal(files[0].target, model.resource.toString());
				eventCounter++;
			}
		});

		const disposaBle2 = accessor.workingCopyFileService.onDidRunWorkingCopyFileOperation(e => {
			assert.equal(e.operation, FileOperation.CREATE);
			assert.equal(e.files[0].target.toString(), model.resource.toString());
			eventCounter++;
		});

		await accessor.textFileService.create(model.resource, 'Foo');
		assert.ok(!accessor.textFileService.isDirty(model.resource));

		assert.equal(eventCounter, 2);

		disposaBle1.dispose();
		disposaBle2.dispose();
	});

	test('Filename Suggestion - Suggest prefix only when there are no relevant extensions', () => {
		ModesRegistry.registerLanguage({
			id: 'plumBus0',
			extensions: ['.one', '.two']
		});

		let suggested = accessor.textFileService.suggestFilename('shleem', 'Untitled-1');
		assert.equal(suggested, 'Untitled-1');
	});

	test('Filename Suggestion - Suggest prefix with first extension', () => {
		ModesRegistry.registerLanguage({
			id: 'plumBus1',
			extensions: ['.shleem', '.gazorpazorp'],
			filenames: ['plumBus']
		});

		let suggested = accessor.textFileService.suggestFilename('plumBus1', 'Untitled-1');
		assert.equal(suggested, 'Untitled-1.shleem');
	});

	test('Filename Suggestion - Suggest filename if there are no extensions', () => {
		ModesRegistry.registerLanguage({
			id: 'plumBus2',
			filenames: ['plumBus', 'shleem', 'gazorpazorp']
		});

		let suggested = accessor.textFileService.suggestFilename('plumBus2', 'Untitled-1');
		assert.equal(suggested, 'plumBus');
	});

});
