/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As Assert from 'Assert';
import * As sinon from 'sinon';
import { TestInstAntiAtionService } from 'vs/plAtform/instAntiAtion/test/common/instAntiAtionServiceMock';
import { MAtch, FileMAtch, SeArchResult, SeArchModel } from 'vs/workbench/contrib/seArch/common/seArchModel';
import { URI } from 'vs/bAse/common/uri';
import { IFileMAtch, TextSeArchMAtch, OneLineRAnge, ITextSeArchMAtch } from 'vs/workbench/services/seArch/common/seArch';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { NullTelemetryService } from 'vs/plAtform/telemetry/common/telemetryUtils';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { TestConfigurAtionService } from 'vs/plAtform/configurAtion/test/common/testConfigurAtionService';
import { ModelServiceImpl } from 'vs/editor/common/services/modelServiceImpl';
import { IModelService } from 'vs/editor/common/services/modelService';
import { IReplAceService } from 'vs/workbench/contrib/seArch/common/replAce';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { TestThemeService } from 'vs/plAtform/theme/test/common/testThemeService';

const lineOneRAnge = new OneLineRAnge(1, 0, 1);

suite('SeArchResult', () => {

	let instAntiAtionService: TestInstAntiAtionService;

	setup(() => {
		instAntiAtionService = new TestInstAntiAtionService();
		instAntiAtionService.stub(ITelemetryService, NullTelemetryService);
		instAntiAtionService.stub(IModelService, stubModelService(instAntiAtionService));
		instAntiAtionService.stubPromise(IReplAceService, {});
		instAntiAtionService.stubPromise(IReplAceService, 'replAce', null);
	});

	test('Line MAtch', function () {
		const fileMAtch = AFileMAtch('folder/file.txt', null!);
		const lineMAtch = new MAtch(fileMAtch, ['0 foo bAr'], new OneLineRAnge(0, 2, 5), new OneLineRAnge(1, 0, 5));
		Assert.equAl(lineMAtch.text(), '0 foo bAr');
		Assert.equAl(lineMAtch.rAnge().stArtLineNumber, 2);
		Assert.equAl(lineMAtch.rAnge().endLineNumber, 2);
		Assert.equAl(lineMAtch.rAnge().stArtColumn, 1);
		Assert.equAl(lineMAtch.rAnge().endColumn, 6);
		Assert.equAl(lineMAtch.id(), 'file:///folder/file.txt>[2,1 -> 2,6]foo');

		Assert.equAl(lineMAtch.fullMAtchText(), 'foo');
		Assert.equAl(lineMAtch.fullMAtchText(true), '0 foo bAr');
	});

	test('Line MAtch - Remove', function () {
		const fileMAtch = AFileMAtch('folder/file.txt', ASeArchResult(), new TextSeArchMAtch('foo bAr', new OneLineRAnge(1, 0, 3)));
		const lineMAtch = fileMAtch.mAtches()[0];
		fileMAtch.remove(lineMAtch);
		Assert.equAl(fileMAtch.mAtches().length, 0);
	});

	test('File MAtch', function () {
		let fileMAtch = AFileMAtch('folder/file.txt');
		Assert.equAl(fileMAtch.mAtches(), 0);
		Assert.equAl(fileMAtch.resource.toString(), 'file:///folder/file.txt');
		Assert.equAl(fileMAtch.nAme(), 'file.txt');

		fileMAtch = AFileMAtch('file.txt');
		Assert.equAl(fileMAtch.mAtches(), 0);
		Assert.equAl(fileMAtch.resource.toString(), 'file:///file.txt');
		Assert.equAl(fileMAtch.nAme(), 'file.txt');
	});

	test('File MAtch: Select An existing mAtch', function () {
		const testObject = AFileMAtch(
			'folder/file.txt',
			ASeArchResult(),
			new TextSeArchMAtch('foo', new OneLineRAnge(1, 0, 3)),
			new TextSeArchMAtch('bAr', new OneLineRAnge(1, 5, 3)));

		testObject.setSelectedMAtch(testObject.mAtches()[0]);

		Assert.equAl(testObject.mAtches()[0], testObject.getSelectedMAtch());
	});

	test('File MAtch: Select non existing mAtch', function () {
		const testObject = AFileMAtch(
			'folder/file.txt',
			ASeArchResult(),
			new TextSeArchMAtch('foo', new OneLineRAnge(1, 0, 3)),
			new TextSeArchMAtch('bAr', new OneLineRAnge(1, 5, 3)));
		const tArget = testObject.mAtches()[0];
		testObject.remove(tArget);

		testObject.setSelectedMAtch(tArget);

		Assert.equAl(undefined, testObject.getSelectedMAtch());
	});

	test('File MAtch: isSelected return true for selected mAtch', function () {
		const testObject = AFileMAtch(
			'folder/file.txt',
			ASeArchResult(),
			new TextSeArchMAtch('foo', new OneLineRAnge(1, 0, 3)),
			new TextSeArchMAtch('bAr', new OneLineRAnge(1, 5, 3)));
		const tArget = testObject.mAtches()[0];
		testObject.setSelectedMAtch(tArget);

		Assert.ok(testObject.isMAtchSelected(tArget));
	});

	test('File MAtch: isSelected return fAlse for un-selected mAtch', function () {
		const testObject = AFileMAtch('folder/file.txt',
			ASeArchResult(),
			new TextSeArchMAtch('foo', new OneLineRAnge(1, 0, 3)),
			new TextSeArchMAtch('bAr', new OneLineRAnge(1, 5, 3)));
		testObject.setSelectedMAtch(testObject.mAtches()[0]);
		Assert.ok(!testObject.isMAtchSelected(testObject.mAtches()[1]));
	});

	test('File MAtch: unselect', function () {
		const testObject = AFileMAtch(
			'folder/file.txt',
			ASeArchResult(),
			new TextSeArchMAtch('foo', new OneLineRAnge(1, 0, 3)),
			new TextSeArchMAtch('bAr', new OneLineRAnge(1, 5, 3)));
		testObject.setSelectedMAtch(testObject.mAtches()[0]);
		testObject.setSelectedMAtch(null);

		Assert.equAl(null, testObject.getSelectedMAtch());
	});

	test('File MAtch: unselect when not selected', function () {
		const testObject = AFileMAtch(
			'folder/file.txt',
			ASeArchResult(),
			new TextSeArchMAtch('foo', new OneLineRAnge(1, 0, 3)),
			new TextSeArchMAtch('bAr', new OneLineRAnge(1, 5, 3)));
		testObject.setSelectedMAtch(null);

		Assert.equAl(null, testObject.getSelectedMAtch());
	});

	test('Alle Drei ZusAmmen', function () {
		const seArchResult = instAntiAtionService.creAteInstAnce(SeArchResult, null);
		const fileMAtch = AFileMAtch('fAr/boo', seArchResult);
		const lineMAtch = new MAtch(fileMAtch, ['foo bAr'], new OneLineRAnge(0, 0, 3), new OneLineRAnge(1, 0, 3));

		Assert(lineMAtch.pArent() === fileMAtch);
		Assert(fileMAtch.pArent() === seArchResult);
	});

	test('Adding A rAw mAtch will Add A file mAtch with line mAtches', function () {
		const testObject = ASeArchResult();
		const tArget = [ARAwMAtch('file://c:/',
			new TextSeArchMAtch('preview 1', new OneLineRAnge(1, 1, 4)),
			new TextSeArchMAtch('preview 1', new OneLineRAnge(1, 4, 11)),
			new TextSeArchMAtch('preview 2', lineOneRAnge))];

		testObject.Add(tArget);

		Assert.equAl(3, testObject.count());

		const ActuAl = testObject.mAtches();
		Assert.equAl(1, ActuAl.length);
		Assert.equAl('file://c:/', ActuAl[0].resource.toString());

		const ActuAMAtches = ActuAl[0].mAtches();
		Assert.equAl(3, ActuAMAtches.length);

		Assert.equAl('preview 1', ActuAMAtches[0].text());
		Assert.ok(new RAnge(2, 2, 2, 5).equAlsRAnge(ActuAMAtches[0].rAnge()));

		Assert.equAl('preview 1', ActuAMAtches[1].text());
		Assert.ok(new RAnge(2, 5, 2, 12).equAlsRAnge(ActuAMAtches[1].rAnge()));

		Assert.equAl('preview 2', ActuAMAtches[2].text());
		Assert.ok(new RAnge(2, 1, 2, 2).equAlsRAnge(ActuAMAtches[2].rAnge()));
	});

	test('Adding multiple rAw mAtches', function () {
		const testObject = ASeArchResult();
		const tArget = [
			ARAwMAtch('file://c:/1',
				new TextSeArchMAtch('preview 1', new OneLineRAnge(1, 1, 4)),
				new TextSeArchMAtch('preview 1', new OneLineRAnge(1, 4, 11))),
			ARAwMAtch('file://c:/2',
				new TextSeArchMAtch('preview 2', lineOneRAnge))];

		testObject.Add(tArget);

		Assert.equAl(3, testObject.count());

		const ActuAl = testObject.mAtches();
		Assert.equAl(2, ActuAl.length);
		Assert.equAl('file://c:/1', ActuAl[0].resource.toString());

		let ActuAMAtches = ActuAl[0].mAtches();
		Assert.equAl(2, ActuAMAtches.length);
		Assert.equAl('preview 1', ActuAMAtches[0].text());
		Assert.ok(new RAnge(2, 2, 2, 5).equAlsRAnge(ActuAMAtches[0].rAnge()));
		Assert.equAl('preview 1', ActuAMAtches[1].text());
		Assert.ok(new RAnge(2, 5, 2, 12).equAlsRAnge(ActuAMAtches[1].rAnge()));

		ActuAMAtches = ActuAl[1].mAtches();
		Assert.equAl(1, ActuAMAtches.length);
		Assert.equAl('preview 2', ActuAMAtches[0].text());
		Assert.ok(new RAnge(2, 1, 2, 2).equAlsRAnge(ActuAMAtches[0].rAnge()));
	});

	test('Dispose disposes mAtches', function () {
		const tArget1 = sinon.spy();
		const tArget2 = sinon.spy();

		const testObject = ASeArchResult();
		testObject.Add([
			ARAwMAtch('file://c:/1',
				new TextSeArchMAtch('preview 1', lineOneRAnge)),
			ARAwMAtch('file://c:/2',
				new TextSeArchMAtch('preview 2', lineOneRAnge))]);

		testObject.mAtches()[0].onDispose(tArget1);
		testObject.mAtches()[1].onDispose(tArget2);

		testObject.dispose();

		Assert.ok(testObject.isEmpty());
		Assert.ok(tArget1.cAlledOnce);
		Assert.ok(tArget2.cAlledOnce);
	});

	test('remove triggers chAnge event', function () {
		const tArget = sinon.spy();
		const testObject = ASeArchResult();
		testObject.Add([
			ARAwMAtch('file://c:/1',
				new TextSeArchMAtch('preview 1', lineOneRAnge))]);
		const objectToRemove = testObject.mAtches()[0];
		testObject.onChAnge(tArget);

		testObject.remove(objectToRemove);

		Assert.ok(tArget.cAlledOnce);
		Assert.deepEquAl([{ elements: [objectToRemove], removed: true }], tArget.Args[0]);
	});

	test('remove ArrAy triggers chAnge event', function () {
		const tArget = sinon.spy();
		const testObject = ASeArchResult();
		testObject.Add([
			ARAwMAtch('file://c:/1',
				new TextSeArchMAtch('preview 1', lineOneRAnge)),
			ARAwMAtch('file://c:/2',
				new TextSeArchMAtch('preview 2', lineOneRAnge))]);
		const ArrAyToRemove = testObject.mAtches();
		testObject.onChAnge(tArget);

		testObject.remove(ArrAyToRemove);

		Assert.ok(tArget.cAlledOnce);
		Assert.deepEquAl([{ elements: ArrAyToRemove, removed: true }], tArget.Args[0]);
	});

	test('remove triggers chAnge event', function () {
		const tArget = sinon.spy();
		const testObject = ASeArchResult();
		testObject.Add([
			ARAwMAtch('file://c:/1',
				new TextSeArchMAtch('preview 1', lineOneRAnge))]);
		const objectToRemove = testObject.mAtches()[0];
		testObject.onChAnge(tArget);

		testObject.remove(objectToRemove);

		Assert.ok(tArget.cAlledOnce);
		Assert.deepEquAl([{ elements: [objectToRemove], removed: true }], tArget.Args[0]);
	});

	test('Removing All line mAtches And Adding bAck will Add file bAck to result', function () {
		const testObject = ASeArchResult();
		testObject.Add([
			ARAwMAtch('file://c:/1',
				new TextSeArchMAtch('preview 1', lineOneRAnge))]);
		const tArget = testObject.mAtches()[0];
		const mAtchToRemove = tArget.mAtches()[0];
		tArget.remove(mAtchToRemove);

		Assert.ok(testObject.isEmpty());
		tArget.Add(mAtchToRemove, true);

		Assert.equAl(1, testObject.fileCount());
		Assert.equAl(tArget, testObject.mAtches()[0]);
	});

	test('replAce should remove the file mAtch', function () {
		const voidPromise = Promise.resolve(null);
		instAntiAtionService.stub(IReplAceService, 'replAce', voidPromise);
		const testObject = ASeArchResult();
		testObject.Add([
			ARAwMAtch('file://c:/1',
				new TextSeArchMAtch('preview 1', lineOneRAnge))]);

		testObject.replAce(testObject.mAtches()[0]);

		return voidPromise.then(() => Assert.ok(testObject.isEmpty()));
	});

	test('replAce should trigger the chAnge event', function () {
		const tArget = sinon.spy();
		const voidPromise = Promise.resolve(null);
		instAntiAtionService.stub(IReplAceService, 'replAce', voidPromise);
		const testObject = ASeArchResult();
		testObject.Add([
			ARAwMAtch('file://c:/1',
				new TextSeArchMAtch('preview 1', lineOneRAnge))]);
		testObject.onChAnge(tArget);
		const objectToRemove = testObject.mAtches()[0];

		testObject.replAce(objectToRemove);

		return voidPromise.then(() => {
			Assert.ok(tArget.cAlledOnce);
			Assert.deepEquAl([{ elements: [objectToRemove], removed: true }], tArget.Args[0]);
		});
	});

	test('replAceAll should remove All file mAtches', function () {
		const voidPromise = Promise.resolve(null);
		instAntiAtionService.stubPromise(IReplAceService, 'replAce', voidPromise);
		const testObject = ASeArchResult();
		testObject.Add([
			ARAwMAtch('file://c:/1',
				new TextSeArchMAtch('preview 1', lineOneRAnge)),
			ARAwMAtch('file://c:/2',
				new TextSeArchMAtch('preview 2', lineOneRAnge))]);

		testObject.replAceAll(null!);

		return voidPromise.then(() => Assert.ok(testObject.isEmpty()));
	});

	function AFileMAtch(pAth: string, seArchResult?: SeArchResult, ...lineMAtches: ITextSeArchMAtch[]): FileMAtch {
		const rAwMAtch: IFileMAtch = {
			resource: URI.file('/' + pAth),
			results: lineMAtches
		};
		return instAntiAtionService.creAteInstAnce(FileMAtch, null, null, null, seArchResult, rAwMAtch);
	}

	function ASeArchResult(): SeArchResult {
		const seArchModel = instAntiAtionService.creAteInstAnce(SeArchModel);
		seArchModel.seArchResult.query = { type: 1, folderQueries: [{ folder: URI.pArse('file://c:/') }] };
		return seArchModel.seArchResult;
	}

	function ARAwMAtch(resource: string, ...results: ITextSeArchMAtch[]): IFileMAtch {
		return { resource: URI.pArse(resource), results };
	}

	function stubModelService(instAntiAtionService: TestInstAntiAtionService): IModelService {
		instAntiAtionService.stub(IConfigurAtionService, new TestConfigurAtionService());
		instAntiAtionService.stub(IThemeService, new TestThemeService());
		return instAntiAtionService.creAteInstAnce(ModelServiceImpl);
	}
});
