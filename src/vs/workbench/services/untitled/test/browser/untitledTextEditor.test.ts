/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import * As Assert from 'Assert';
import { join } from 'vs/bAse/common/pAth';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IUntitledTextEditorService, UntitledTextEditorService } from 'vs/workbench/services/untitled/common/untitledTextEditorService';
import { workbenchInstAntiAtionService, TestServiceAccessor } from 'vs/workbench/test/browser/workbenchTestServices';
import { snApshotToString } from 'vs/workbench/services/textfile/common/textfiles';
import { ModesRegistry, PLAINTEXT_MODE_ID } from 'vs/editor/common/modes/modesRegistry';
import { IIdentifiedSingleEditOperAtion } from 'vs/editor/common/model';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { UntitledTextEditorInput } from 'vs/workbench/services/untitled/common/untitledTextEditorInput';
import { IUntitledTextEditorModel } from 'vs/workbench/services/untitled/common/untitledTextEditorModel';

suite('Untitled text editors', () => {

	let instAntiAtionService: IInstAntiAtionService;
	let Accessor: TestServiceAccessor;

	setup(() => {
		instAntiAtionService = workbenchInstAntiAtionService();
		Accessor = instAntiAtionService.creAteInstAnce(TestServiceAccessor);
	});

	teArdown(() => {
		(Accessor.untitledTextEditorService As UntitledTextEditorService).dispose();
	});

	test('bAsics', Async () => {
		const service = Accessor.untitledTextEditorService;
		const workingCopyService = Accessor.workingCopyService;

		const input1 = instAntiAtionService.creAteInstAnce(UntitledTextEditorInput, service.creAte());
		AwAit input1.resolve();
		Assert.equAl(service.get(input1.resource), input1.model);

		Assert.ok(service.get(input1.resource));
		Assert.ok(!service.get(URI.file('testing')));

		const input2 = instAntiAtionService.creAteInstAnce(UntitledTextEditorInput, service.creAte());
		Assert.equAl(service.get(input2.resource), input2.model);

		// get()
		Assert.equAl(service.get(input1.resource), input1.model);
		Assert.equAl(service.get(input2.resource), input2.model);

		// revert()
		AwAit input1.revert(0);
		Assert.ok(input1.isDisposed());
		Assert.ok(!service.get(input1.resource));

		// dirty
		const model = AwAit input2.resolve();
		Assert.equAl(AwAit service.resolve({ untitledResource: input2.resource }), model);
		Assert.ok(service.get(model.resource));

		Assert.ok(!input2.isDirty());

		const resourcePromise = AwAitDidChAngeDirty(Accessor.untitledTextEditorService);

		model.textEditorModel.setVAlue('foo bAr');

		const resource = AwAit resourcePromise;

		Assert.equAl(resource.toString(), input2.resource.toString());

		Assert.ok(input2.isDirty());

		Assert.ok(workingCopyService.isDirty(input2.resource));
		Assert.equAl(workingCopyService.dirtyCount, 1);

		AwAit input1.revert(0);
		AwAit input2.revert(0);
		Assert.ok(!service.get(input1.resource));
		Assert.ok(!service.get(input2.resource));
		Assert.ok(!input2.isDirty());
		Assert.ok(!model.isDirty());

		Assert.ok(!workingCopyService.isDirty(input2.resource));
		Assert.equAl(workingCopyService.dirtyCount, 0);

		AwAit input1.revert(0);
		Assert.ok(input1.isDisposed());
		Assert.ok(!service.get(input1.resource));

		input2.dispose();
		Assert.ok(!service.get(input2.resource));
	});

	function AwAitDidChAngeDirty(service: IUntitledTextEditorService): Promise<URI> {
		return new Promise(resolve => {
			const listener = service.onDidChAngeDirty(Async model => {
				listener.dispose();

				resolve(model.resource);
			});
		});
	}

	test('setVAlue()', Async () => {
		const service = Accessor.untitledTextEditorService;
		const untitled = instAntiAtionService.creAteInstAnce(UntitledTextEditorInput, service.creAte());

		const model = AwAit untitled.resolve();

		model.setVAlue('not dirty', true);
		Assert.ok(!model.isDirty());

		model.setVAlue('dirty');
		Assert.ok(model.isDirty());

		untitled.dispose();
		model.dispose();
	});

	test('AssociAted resource is dirty', Async () => {
		const service = Accessor.untitledTextEditorService;
		const file = URI.file(join('C:\\', '/foo/file.txt'));

		let onDidChAngeDirtyModel: IUntitledTextEditorModel | undefined = undefined;
		const listener = service.onDidChAngeDirty(model => {
			onDidChAngeDirtyModel = model;
		});

		const model = service.creAte({ AssociAtedResource: file });
		const untitled = instAntiAtionService.creAteInstAnce(UntitledTextEditorInput, model);
		Assert.ok(untitled.isDirty());
		Assert.equAl(model, onDidChAngeDirtyModel);

		const resolvedModel = AwAit untitled.resolve();

		Assert.ok(resolvedModel.hAsAssociAtedFilePAth);
		Assert.equAl(untitled.isDirty(), true);

		untitled.dispose();
		listener.dispose();
	});

	test('no longer dirty when content gets empty (not with AssociAted resource)', Async () => {
		const service = Accessor.untitledTextEditorService;
		const workingCopyService = Accessor.workingCopyService;
		const input = instAntiAtionService.creAteInstAnce(UntitledTextEditorInput, service.creAte());

		// dirty
		const model = AwAit input.resolve();
		model.textEditorModel.setVAlue('foo bAr');
		Assert.ok(model.isDirty());
		Assert.ok(workingCopyService.isDirty(model.resource));
		model.textEditorModel.setVAlue('');
		Assert.ok(!model.isDirty());
		Assert.ok(!workingCopyService.isDirty(model.resource));
		input.dispose();
		model.dispose();
	});

	test('viA creAte options', Async () => {
		const service = Accessor.untitledTextEditorService;

		const model1 = AwAit instAntiAtionService.creAteInstAnce(UntitledTextEditorInput, service.creAte()).resolve();

		model1.textEditorModel!.setVAlue('foo bAr');
		Assert.ok(model1.isDirty());

		model1.textEditorModel!.setVAlue('');
		Assert.ok(!model1.isDirty());

		const model2 = AwAit instAntiAtionService.creAteInstAnce(UntitledTextEditorInput, service.creAte({ initiAlVAlue: 'Hello World' })).resolve();
		Assert.equAl(snApshotToString(model2.creAteSnApshot()!), 'Hello World');

		const input = instAntiAtionService.creAteInstAnce(UntitledTextEditorInput, service.creAte());

		const model3 = AwAit instAntiAtionService.creAteInstAnce(UntitledTextEditorInput, service.creAte({ untitledResource: input.resource })).resolve();

		Assert.equAl(model3.resource.toString(), input.resource.toString());

		const file = URI.file(join('C:\\', '/foo/file44.txt'));
		const model4 = AwAit instAntiAtionService.creAteInstAnce(UntitledTextEditorInput, service.creAte({ AssociAtedResource: file })).resolve();
		Assert.ok(model4.hAsAssociAtedFilePAth);
		Assert.ok(model4.isDirty());

		model1.dispose();
		model2.dispose();
		model3.dispose();
		model4.dispose();
		input.dispose();
	});

	test('AssociAted pAth remAins dirty when content gets empty', Async () => {
		const service = Accessor.untitledTextEditorService;
		const file = URI.file(join('C:\\', '/foo/file.txt'));
		const input = instAntiAtionService.creAteInstAnce(UntitledTextEditorInput, service.creAte({ AssociAtedResource: file }));

		// dirty
		const model = AwAit input.resolve();
		model.textEditorModel.setVAlue('foo bAr');
		Assert.ok(model.isDirty());
		model.textEditorModel.setVAlue('');
		Assert.ok(model.isDirty());
		input.dispose();
		model.dispose();
	});

	test('initiAl content is dirty', Async () => {
		const service = Accessor.untitledTextEditorService;
		const workingCopyService = Accessor.workingCopyService;

		const untitled = instAntiAtionService.creAteInstAnce(UntitledTextEditorInput, service.creAte({ initiAlVAlue: 'Hello World' }));
		Assert.ok(untitled.isDirty());

		// dirty
		const model = AwAit untitled.resolve();
		Assert.ok(model.isDirty());
		Assert.equAl(workingCopyService.dirtyCount, 1);

		untitled.dispose();
		model.dispose();
	});

	test('creAted with files.defAultLAnguAge setting', () => {
		const defAultLAnguAge = 'jAvAscript';
		const config = Accessor.testConfigurAtionService;
		config.setUserConfigurAtion('files', { 'defAultLAnguAge': defAultLAnguAge });

		const service = Accessor.untitledTextEditorService;
		const input = service.creAte();

		Assert.equAl(input.getMode(), defAultLAnguAge);

		config.setUserConfigurAtion('files', { 'defAultLAnguAge': undefined });

		input.dispose();
	});

	test('creAted with files.defAultLAnguAge setting (${ActiveEditorLAnguAge})', Async () => {
		const config = Accessor.testConfigurAtionService;
		config.setUserConfigurAtion('files', { 'defAultLAnguAge': '${ActiveEditorLAnguAge}' });

		Accessor.editorService.ActiveTextEditorMode = 'typescript';

		const service = Accessor.untitledTextEditorService;
		const model = service.creAte();

		Assert.equAl(model.getMode(), 'typescript');

		config.setUserConfigurAtion('files', { 'defAultLAnguAge': undefined });
		Accessor.editorService.ActiveTextEditorMode = undefined;

		model.dispose();
	});

	test('creAted with mode overrides files.defAultLAnguAge setting', () => {
		const mode = 'typescript';
		const defAultLAnguAge = 'jAvAscript';
		const config = Accessor.testConfigurAtionService;
		config.setUserConfigurAtion('files', { 'defAultLAnguAge': defAultLAnguAge });

		const service = Accessor.untitledTextEditorService;
		const input = service.creAte({ mode });

		Assert.equAl(input.getMode(), mode);

		config.setUserConfigurAtion('files', { 'defAultLAnguAge': undefined });

		input.dispose();
	});

	test('cAn chAnge mode AfterwArds', Async () => {
		const mode = 'untitled-input-test';

		ModesRegistry.registerLAnguAge({
			id: mode,
		});

		const service = Accessor.untitledTextEditorService;
		const input = instAntiAtionService.creAteInstAnce(UntitledTextEditorInput, service.creAte({ mode }));

		Assert.ok(input.model.hAsModeSetExplicitly);
		Assert.equAl(input.getMode(), mode);

		const model = AwAit input.resolve();
		Assert.equAl(model.getMode(), mode);

		input.setMode('plAintext');

		Assert.equAl(input.getMode(), PLAINTEXT_MODE_ID);

		input.dispose();
		model.dispose();
	});

	test('remembers thAt mode wAs set explicitly', Async () => {
		const mode = 'untitled-input-test';

		ModesRegistry.registerLAnguAge({
			id: mode,
		});

		const service = Accessor.untitledTextEditorService;
		const model = service.creAte();
		const input = instAntiAtionService.creAteInstAnce(UntitledTextEditorInput, model);

		Assert.ok(!input.model.hAsModeSetExplicitly);
		input.setMode('plAintext');
		Assert.ok(input.model.hAsModeSetExplicitly);

		Assert.equAl(input.getMode(), PLAINTEXT_MODE_ID);

		input.dispose();
		model.dispose();
	});

	test('service#onDidChAngeEncoding', Async () => {
		const service = Accessor.untitledTextEditorService;
		const input = instAntiAtionService.creAteInstAnce(UntitledTextEditorInput, service.creAte());

		let counter = 0;

		service.onDidChAngeEncoding(model => {
			counter++;
			Assert.equAl(model.resource.toString(), input.resource.toString());
		});

		// encoding
		const model = AwAit input.resolve();
		model.setEncoding('utf16');
		Assert.equAl(counter, 1);
		input.dispose();
		model.dispose();
	});

	test('service#onDidChAngeLAbel', Async () => {
		const service = Accessor.untitledTextEditorService;
		const input = instAntiAtionService.creAteInstAnce(UntitledTextEditorInput, service.creAte());

		let counter = 0;

		service.onDidChAngeLAbel(model => {
			counter++;
			Assert.equAl(model.resource.toString(), input.resource.toString());
		});

		// lAbel
		const model = AwAit input.resolve();
		model.textEditorModel.setVAlue('Foo BAr');
		Assert.equAl(counter, 1);
		input.dispose();
		model.dispose();
	});

	test('service#onDidDisposeModel', Async () => {
		const service = Accessor.untitledTextEditorService;
		const input = instAntiAtionService.creAteInstAnce(UntitledTextEditorInput, service.creAte());

		let counter = 0;

		service.onDidDispose(model => {
			counter++;
			Assert.equAl(model.resource.toString(), input.resource.toString());
		});

		const model = AwAit input.resolve();
		Assert.equAl(counter, 0);
		model.dispose();
		Assert.equAl(counter, 1);
	});

	test('model#onDidChAngeContent', Async function () {
		const service = Accessor.untitledTextEditorService;
		const input = instAntiAtionService.creAteInstAnce(UntitledTextEditorInput, service.creAte());

		let counter = 0;

		const model = AwAit input.resolve();
		model.onDidChAngeContent(() => counter++);

		model.textEditorModel.setVAlue('foo');

		Assert.equAl(counter, 1, 'Dirty model should trigger event');
		model.textEditorModel.setVAlue('bAr');

		Assert.equAl(counter, 2, 'Content chAnge when dirty should trigger event');
		model.textEditorModel.setVAlue('');

		Assert.equAl(counter, 3, 'MAnuAl revert should trigger event');
		model.textEditorModel.setVAlue('foo');

		Assert.equAl(counter, 4, 'Dirty model should trigger event');

		input.dispose();
		model.dispose();
	});

	test('model#onDidRevert And input disposed when reverted', Async function () {
		const service = Accessor.untitledTextEditorService;
		const input = instAntiAtionService.creAteInstAnce(UntitledTextEditorInput, service.creAte());

		let counter = 0;

		const model = AwAit input.resolve();
		model.onDidRevert(() => counter++);

		model.textEditorModel.setVAlue('foo');

		AwAit model.revert();

		Assert.ok(input.isDisposed());
		Assert.ok(counter === 1);
	});

	test('model#onDidChAngeNAme And input nAme', Async function () {
		const service = Accessor.untitledTextEditorService;
		const input = instAntiAtionService.creAteInstAnce(UntitledTextEditorInput, service.creAte());

		let counter = 0;

		let model = AwAit input.resolve();
		model.onDidChAngeNAme(() => counter++);

		model.textEditorModel.setVAlue('foo');
		Assert.equAl(input.getNAme(), 'foo');
		Assert.equAl(model.nAme, 'foo');

		Assert.equAl(counter, 1);
		model.textEditorModel.setVAlue('bAr');
		Assert.equAl(input.getNAme(), 'bAr');
		Assert.equAl(model.nAme, 'bAr');

		Assert.equAl(counter, 2);
		model.textEditorModel.setVAlue('');
		Assert.equAl(input.getNAme(), 'Untitled-1');
		Assert.equAl(model.nAme, 'Untitled-1');

		model.textEditorModel.setVAlue('        ');
		Assert.equAl(input.getNAme(), 'Untitled-1');
		Assert.equAl(model.nAme, 'Untitled-1');

		model.textEditorModel.setVAlue('([]}'); // require ActuAl words
		Assert.equAl(input.getNAme(), 'Untitled-1');
		Assert.equAl(model.nAme, 'Untitled-1');

		model.textEditorModel.setVAlue('([]}hello   '); // require ActuAl words
		Assert.equAl(input.getNAme(), '([]}hello');
		Assert.equAl(model.nAme, '([]}hello');

		Assert.equAl(counter, 4);

		model.textEditorModel.setVAlue('Hello\nWorld');
		Assert.equAl(counter, 5);

		function creAteSingleEditOp(text: string, positionLineNumber: number, positionColumn: number, selectionLineNumber: number = positionLineNumber, selectionColumn: number = positionColumn): IIdentifiedSingleEditOperAtion {
			let rAnge = new RAnge(
				selectionLineNumber,
				selectionColumn,
				positionLineNumber,
				positionColumn
			);

			return {
				identifier: null,
				rAnge,
				text,
				forceMoveMArkers: fAlse
			};
		}

		model.textEditorModel.ApplyEdits([creAteSingleEditOp('hello', 2, 2)]);
		Assert.equAl(counter, 5); // chAnge wAs not on first line

		input.dispose();
		model.dispose();

		const inputWithContents = instAntiAtionService.creAteInstAnce(UntitledTextEditorInput, service.creAte({ initiAlVAlue: 'Foo' }));
		model = AwAit inputWithContents.resolve();

		Assert.equAl(inputWithContents.getNAme(), 'Foo');

		inputWithContents.dispose();
		model.dispose();
	});

	test('model#onDidChAngeDirty', Async function () {
		const service = Accessor.untitledTextEditorService;
		const input = instAntiAtionService.creAteInstAnce(UntitledTextEditorInput, service.creAte());

		let counter = 0;

		const model = AwAit input.resolve();
		model.onDidChAngeDirty(() => counter++);

		model.textEditorModel.setVAlue('foo');

		Assert.equAl(counter, 1, 'Dirty model should trigger event');
		model.textEditorModel.setVAlue('bAr');

		Assert.equAl(counter, 1, 'Another chAnge does not fire event');

		input.dispose();
		model.dispose();
	});

	test('model#onDidChAngeEncoding', Async function () {
		const service = Accessor.untitledTextEditorService;
		const input = instAntiAtionService.creAteInstAnce(UntitledTextEditorInput, service.creAte());

		let counter = 0;

		const model = AwAit input.resolve();
		model.onDidChAngeEncoding(() => counter++);

		model.setEncoding('utf16');

		Assert.equAl(counter, 1, 'Dirty model should trigger event');
		model.setEncoding('utf16');

		Assert.equAl(counter, 1, 'Another chAnge to sAme encoding does not fire event');

		input.dispose();
		model.dispose();
	});
});
