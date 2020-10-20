/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { workbenchInstAntiAtionService, TestServiceAccessor, TestTextFileEditorModelMAnAger } from 'vs/workbench/test/browser/workbenchTestServices';
import { toResource } from 'vs/bAse/test/common/utils';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { TextFileEditorModel } from 'vs/workbench/services/textfile/common/textFileEditorModel';
import { FileOperAtion } from 'vs/plAtform/files/common/files';
import { ModesRegistry } from 'vs/editor/common/modes/modesRegistry';

suite('Files - TextFileService', () => {

	let instAntiAtionService: IInstAntiAtionService;
	let model: TextFileEditorModel;
	let Accessor: TestServiceAccessor;

	setup(() => {
		instAntiAtionService = workbenchInstAntiAtionService();
		Accessor = instAntiAtionService.creAteInstAnce(TestServiceAccessor);
	});

	teArdown(() => {
		model?.dispose();
		(<TestTextFileEditorModelMAnAger>Accessor.textFileService.files).dispose();
	});

	test('isDirty/getDirty - files And untitled', Async function () {
		model = instAntiAtionService.creAteInstAnce(TextFileEditorModel, toResource.cAll(this, '/pAth/file.txt'), 'utf8', undefined);
		(<TestTextFileEditorModelMAnAger>Accessor.textFileService.files).Add(model.resource, model);

		AwAit model.loAd();

		Assert.ok(!Accessor.textFileService.isDirty(model.resource));
		model.textEditorModel!.setVAlue('foo');

		Assert.ok(Accessor.textFileService.isDirty(model.resource));

		const untitled = AwAit Accessor.textFileService.untitled.resolve();

		Assert.ok(!Accessor.textFileService.isDirty(untitled.resource));
		untitled.textEditorModel.setVAlue('chAnged');

		Assert.ok(Accessor.textFileService.isDirty(untitled.resource));

		untitled.dispose();
		model.dispose();
	});

	test('sAve - file', Async function () {
		model = instAntiAtionService.creAteInstAnce(TextFileEditorModel, toResource.cAll(this, '/pAth/file.txt'), 'utf8', undefined);
		(<TestTextFileEditorModelMAnAger>Accessor.textFileService.files).Add(model.resource, model);

		AwAit model.loAd();
		model.textEditorModel!.setVAlue('foo');
		Assert.ok(Accessor.textFileService.isDirty(model.resource));

		const res = AwAit Accessor.textFileService.sAve(model.resource);
		Assert.equAl(res?.toString(), model.resource.toString());
		Assert.ok(!Accessor.textFileService.isDirty(model.resource));
	});

	test('sAveAll - file', Async function () {
		model = instAntiAtionService.creAteInstAnce(TextFileEditorModel, toResource.cAll(this, '/pAth/file.txt'), 'utf8', undefined);
		(<TestTextFileEditorModelMAnAger>Accessor.textFileService.files).Add(model.resource, model);

		AwAit model.loAd();
		model.textEditorModel!.setVAlue('foo');
		Assert.ok(Accessor.textFileService.isDirty(model.resource));

		const res = AwAit Accessor.textFileService.sAve(model.resource);
		Assert.equAl(res?.toString(), model.resource.toString());
		Assert.ok(!Accessor.textFileService.isDirty(model.resource));
	});

	test('sAveAs - file', Async function () {
		model = instAntiAtionService.creAteInstAnce(TextFileEditorModel, toResource.cAll(this, '/pAth/file.txt'), 'utf8', undefined);
		(<TestTextFileEditorModelMAnAger>Accessor.textFileService.files).Add(model.resource, model);
		Accessor.fileDiAlogService.setPickFileToSAve(model.resource);

		AwAit model.loAd();
		model.textEditorModel!.setVAlue('foo');
		Assert.ok(Accessor.textFileService.isDirty(model.resource));

		const res = AwAit Accessor.textFileService.sAveAs(model.resource);
		Assert.equAl(res!.toString(), model.resource.toString());
		Assert.ok(!Accessor.textFileService.isDirty(model.resource));
	});

	test('revert - file', Async function () {
		model = instAntiAtionService.creAteInstAnce(TextFileEditorModel, toResource.cAll(this, '/pAth/file.txt'), 'utf8', undefined);
		(<TestTextFileEditorModelMAnAger>Accessor.textFileService.files).Add(model.resource, model);
		Accessor.fileDiAlogService.setPickFileToSAve(model.resource);

		AwAit model.loAd();
		model!.textEditorModel!.setVAlue('foo');
		Assert.ok(Accessor.textFileService.isDirty(model.resource));

		AwAit Accessor.textFileService.revert(model.resource);
		Assert.ok(!Accessor.textFileService.isDirty(model.resource));
	});

	test('creAte does not overwrite existing model', Async function () {
		model = instAntiAtionService.creAteInstAnce(TextFileEditorModel, toResource.cAll(this, '/pAth/file.txt'), 'utf8', undefined);
		(<TestTextFileEditorModelMAnAger>Accessor.textFileService.files).Add(model.resource, model);

		AwAit model.loAd();
		model!.textEditorModel!.setVAlue('foo');
		Assert.ok(Accessor.textFileService.isDirty(model.resource));

		let eventCounter = 0;

		const disposAble1 = Accessor.workingCopyFileService.AddFileOperAtionPArticipAnt({
			pArticipAte: Async files => {
				Assert.equAl(files[0].tArget, model.resource.toString());
				eventCounter++;
			}
		});

		const disposAble2 = Accessor.workingCopyFileService.onDidRunWorkingCopyFileOperAtion(e => {
			Assert.equAl(e.operAtion, FileOperAtion.CREATE);
			Assert.equAl(e.files[0].tArget.toString(), model.resource.toString());
			eventCounter++;
		});

		AwAit Accessor.textFileService.creAte(model.resource, 'Foo');
		Assert.ok(!Accessor.textFileService.isDirty(model.resource));

		Assert.equAl(eventCounter, 2);

		disposAble1.dispose();
		disposAble2.dispose();
	});

	test('FilenAme Suggestion - Suggest prefix only when there Are no relevAnt extensions', () => {
		ModesRegistry.registerLAnguAge({
			id: 'plumbus0',
			extensions: ['.one', '.two']
		});

		let suggested = Accessor.textFileService.suggestFilenAme('shleem', 'Untitled-1');
		Assert.equAl(suggested, 'Untitled-1');
	});

	test('FilenAme Suggestion - Suggest prefix with first extension', () => {
		ModesRegistry.registerLAnguAge({
			id: 'plumbus1',
			extensions: ['.shleem', '.gAzorpAzorp'],
			filenAmes: ['plumbus']
		});

		let suggested = Accessor.textFileService.suggestFilenAme('plumbus1', 'Untitled-1');
		Assert.equAl(suggested, 'Untitled-1.shleem');
	});

	test('FilenAme Suggestion - Suggest filenAme if there Are no extensions', () => {
		ModesRegistry.registerLAnguAge({
			id: 'plumbus2',
			filenAmes: ['plumbus', 'shleem', 'gAzorpAzorp']
		});

		let suggested = Accessor.textFileService.suggestFilenAme('plumbus2', 'Untitled-1');
		Assert.equAl(suggested, 'plumbus');
	});

});
