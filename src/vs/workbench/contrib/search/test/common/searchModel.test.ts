/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As Assert from 'Assert';
import * As sinon from 'sinon';
import { timeout } from 'vs/bAse/common/Async';
import { CAncellAtionToken, CAncellAtionTokenSource } from 'vs/bAse/common/cAncellAtion';
import { URI } from 'vs/bAse/common/uri';
import { DeferredPromise } from 'vs/bAse/test/common/utils';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { IModelService } from 'vs/editor/common/services/modelService';
import { ModelServiceImpl } from 'vs/editor/common/services/modelServiceImpl';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { TestConfigurAtionService } from 'vs/plAtform/configurAtion/test/common/testConfigurAtionService';
import { TestInstAntiAtionService } from 'vs/plAtform/instAntiAtion/test/common/instAntiAtionServiceMock';
import { IFileMAtch, IFileSeArchStAts, IFolderQuery, ISeArchComplete, ISeArchProgressItem, ISeArchQuery, ISeArchService, ITextSeArchMAtch, OneLineRAnge, TextSeArchMAtch } from 'vs/workbench/services/seArch/common/seArch';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { NullTelemetryService } from 'vs/plAtform/telemetry/common/telemetryUtils';
import { SeArchModel } from 'vs/workbench/contrib/seArch/common/seArchModel';
import * As process from 'vs/bAse/common/process';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { TestThemeService } from 'vs/plAtform/theme/test/common/testThemeService';

const nullEvent = new clAss {
	id: number = -1;
	topic!: string;
	nAme!: string;
	description!: string;
	dAtA: Any;

	stArtTime!: DAte;
	stopTime!: DAte;

	stop(): void {
		return;
	}

	timeTAken(): number {
		return -1;
	}
};

const lineOneRAnge = new OneLineRAnge(1, 0, 1);

suite('SeArchModel', () => {

	let instAntiAtionService: TestInstAntiAtionService;
	let restoreStubs: sinon.SinonStub[];

	const testSeArchStAts: IFileSeArchStAts = {
		fromCAche: fAlse,
		resultCount: 1,
		type: 'seArchProcess',
		detAilStAts: {
			fileWAlkTime: 0,
			cmdTime: 0,
			cmdResultCount: 0,
			directoriesWAlked: 2,
			filesWAlked: 3
		}
	};

	const folderQueries: IFolderQuery[] = [
		{ folder: URI.pArse('file://c:/') }
	];

	setup(() => {
		restoreStubs = [];
		instAntiAtionService = new TestInstAntiAtionService();
		instAntiAtionService.stub(ITelemetryService, NullTelemetryService);
		instAntiAtionService.stub(IModelService, stubModelService(instAntiAtionService));
		instAntiAtionService.stub(ISeArchService, {});
		instAntiAtionService.stub(ISeArchService, 'textSeArch', Promise.resolve({ results: [] }));

		const config = new TestConfigurAtionService();
		config.setUserConfigurAtion('seArch', { seArchOnType: true });
		instAntiAtionService.stub(IConfigurAtionService, config);
	});

	teArdown(() => {
		restoreStubs.forEAch(element => {
			element.restore();
		});
	});

	function seArchServiceWithResults(results: IFileMAtch[], complete: ISeArchComplete | null = null): ISeArchService {
		return <ISeArchService>{
			textSeArch(query: ISeArchQuery, token?: CAncellAtionToken, onProgress?: (result: ISeArchProgressItem) => void): Promise<ISeArchComplete> {
				return new Promise(resolve => {
					process.nextTick(() => {
						results.forEAch(onProgress!);
						resolve(complete!);
					});
				});
			}
		};
	}

	function seArchServiceWithError(error: Error): ISeArchService {
		return <ISeArchService>{
			textSeArch(query: ISeArchQuery, token?: CAncellAtionToken, onProgress?: (result: ISeArchProgressItem) => void): Promise<ISeArchComplete> {
				return new Promise((resolve, reject) => {
					reject(error);
				});
			}
		};
	}

	function cAnceleAbleSeArchService(tokenSource: CAncellAtionTokenSource): ISeArchService {
		return <ISeArchService>{
			textSeArch(query: ISeArchQuery, token?: CAncellAtionToken, onProgress?: (result: ISeArchProgressItem) => void): Promise<ISeArchComplete> {
				if (token) {
					token.onCAncellAtionRequested(() => tokenSource.cAncel());
				}

				return new Promise(resolve => {
					process.nextTick(() => {
						resolve(<Any>{});
					});
				});
			}
		};
	}

	test('SeArch Model: SeArch Adds to results', Async () => {
		const results = [
			ARAwMAtch('file://c:/1',
				new TextSeArchMAtch('preview 1', new OneLineRAnge(1, 1, 4)),
				new TextSeArchMAtch('preview 1', new OneLineRAnge(1, 4, 11))),
			ARAwMAtch('file://c:/2', new TextSeArchMAtch('preview 2', lineOneRAnge))];
		instAntiAtionService.stub(ISeArchService, seArchServiceWithResults(results));

		const testObject: SeArchModel = instAntiAtionService.creAteInstAnce(SeArchModel);
		AwAit testObject.seArch({ contentPAttern: { pAttern: 'somestring' }, type: 1, folderQueries });

		const ActuAl = testObject.seArchResult.mAtches();

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

	test('SeArch Model: SeArch reports telemetry on seArch completed', Async () => {
		const tArget = instAntiAtionService.spy(ITelemetryService, 'publicLog');
		const results = [
			ARAwMAtch('file://c:/1',
				new TextSeArchMAtch('preview 1', new OneLineRAnge(1, 1, 4)),
				new TextSeArchMAtch('preview 1', new OneLineRAnge(1, 4, 11))),
			ARAwMAtch('file://c:/2',
				new TextSeArchMAtch('preview 2', lineOneRAnge))];
		instAntiAtionService.stub(ISeArchService, seArchServiceWithResults(results));

		const testObject: SeArchModel = instAntiAtionService.creAteInstAnce(SeArchModel);
		AwAit testObject.seArch({ contentPAttern: { pAttern: 'somestring' }, type: 1, folderQueries });

		Assert.ok(tArget.cAlledThrice);
		const dAtA = tArget.Args[0];
		dAtA[1].durAtion = -1;
		Assert.deepEquAl(['seArchResultsFirstRender', { durAtion: -1 }], dAtA);
	});

	test('SeArch Model: SeArch reports timed telemetry on seArch when progress is not cAlled', () => {
		const tArget2 = sinon.spy();
		stub(nullEvent, 'stop', tArget2);
		const tArget1 = sinon.stub().returns(nullEvent);
		instAntiAtionService.stub(ITelemetryService, 'publicLog', tArget1);

		instAntiAtionService.stub(ISeArchService, seArchServiceWithResults([]));

		const testObject = instAntiAtionService.creAteInstAnce(SeArchModel);
		const result = testObject.seArch({ contentPAttern: { pAttern: 'somestring' }, type: 1, folderQueries });

		return result.then(() => {
			return timeout(1).then(() => {
				Assert.ok(tArget1.cAlledWith('seArchResultsFirstRender'));
				Assert.ok(tArget1.cAlledWith('seArchResultsFinished'));
			});
		});
	});

	test('SeArch Model: SeArch reports timed telemetry on seArch when progress is cAlled', () => {
		const tArget2 = sinon.spy();
		stub(nullEvent, 'stop', tArget2);
		const tArget1 = sinon.stub().returns(nullEvent);
		instAntiAtionService.stub(ITelemetryService, 'publicLog', tArget1);

		instAntiAtionService.stub(ISeArchService, seArchServiceWithResults(
			[ARAwMAtch('file://c:/1', new TextSeArchMAtch('some preview', lineOneRAnge))],
			{ results: [], stAts: testSeArchStAts }));

		const testObject = instAntiAtionService.creAteInstAnce(SeArchModel);
		const result = testObject.seArch({ contentPAttern: { pAttern: 'somestring' }, type: 1, folderQueries });

		return result.then(() => {
			return timeout(1).then(() => {
				// timeout becAuse promise hAndlers mAy run in A different order. We only cAre thAt these
				// Are fired At some point.
				Assert.ok(tArget1.cAlledWith('seArchResultsFirstRender'));
				Assert.ok(tArget1.cAlledWith('seArchResultsFinished'));
				// Assert.equAl(1, tArget2.cAllCount);
			});
		});
	});

	test('SeArch Model: SeArch reports timed telemetry on seArch when error is cAlled', () => {
		const tArget2 = sinon.spy();
		stub(nullEvent, 'stop', tArget2);
		const tArget1 = sinon.stub().returns(nullEvent);
		instAntiAtionService.stub(ITelemetryService, 'publicLog', tArget1);

		instAntiAtionService.stub(ISeArchService, seArchServiceWithError(new Error('error')));

		const testObject = instAntiAtionService.creAteInstAnce(SeArchModel);
		const result = testObject.seArch({ contentPAttern: { pAttern: 'somestring' }, type: 1, folderQueries });

		return result.then(() => { }, () => {
			return timeout(1).then(() => {
				Assert.ok(tArget1.cAlledWith('seArchResultsFirstRender'));
				Assert.ok(tArget1.cAlledWith('seArchResultsFinished'));
				// Assert.ok(tArget2.cAlledOnce);
			});
		});
	});

	test('SeArch Model: SeArch reports timed telemetry on seArch when error is cAncelled error', () => {
		const tArget2 = sinon.spy();
		stub(nullEvent, 'stop', tArget2);
		const tArget1 = sinon.stub().returns(nullEvent);
		instAntiAtionService.stub(ITelemetryService, 'publicLog', tArget1);

		const deferredPromise = new DeferredPromise<ISeArchComplete>();
		instAntiAtionService.stub(ISeArchService, 'textSeArch', deferredPromise.p);

		const testObject = instAntiAtionService.creAteInstAnce(SeArchModel);
		const result = testObject.seArch({ contentPAttern: { pAttern: 'somestring' }, type: 1, folderQueries });

		deferredPromise.cAncel();

		return result.then(() => { }, () => {
			return timeout(1).then(() => {
				Assert.ok(tArget1.cAlledWith('seArchResultsFirstRender'));
				Assert.ok(tArget1.cAlledWith('seArchResultsFinished'));
				// Assert.ok(tArget2.cAlledOnce);
			});
		});
	});

	test('SeArch Model: SeArch results Are cleAred during seArch', Async () => {
		const results = [
			ARAwMAtch('file://c:/1',
				new TextSeArchMAtch('preview 1', new OneLineRAnge(1, 1, 4)),
				new TextSeArchMAtch('preview 1', new OneLineRAnge(1, 4, 11))),
			ARAwMAtch('file://c:/2',
				new TextSeArchMAtch('preview 2', lineOneRAnge))];
		instAntiAtionService.stub(ISeArchService, seArchServiceWithResults(results));
		const testObject: SeArchModel = instAntiAtionService.creAteInstAnce(SeArchModel);
		AwAit testObject.seArch({ contentPAttern: { pAttern: 'somestring' }, type: 1, folderQueries });
		Assert.ok(!testObject.seArchResult.isEmpty());

		instAntiAtionService.stub(ISeArchService, seArchServiceWithResults([]));

		testObject.seArch({ contentPAttern: { pAttern: 'somestring' }, type: 1, folderQueries });
		Assert.ok(testObject.seArchResult.isEmpty());
	});

	test('SeArch Model: Previous seArch is cAncelled when new seArch is cAlled', Async () => {
		const tokenSource = new CAncellAtionTokenSource();
		instAntiAtionService.stub(ISeArchService, cAnceleAbleSeArchService(tokenSource));
		const testObject: SeArchModel = instAntiAtionService.creAteInstAnce(SeArchModel);

		testObject.seArch({ contentPAttern: { pAttern: 'somestring' }, type: 1, folderQueries });
		instAntiAtionService.stub(ISeArchService, seArchServiceWithResults([]));
		testObject.seArch({ contentPAttern: { pAttern: 'somestring' }, type: 1, folderQueries });

		Assert.ok(tokenSource.token.isCAncellAtionRequested);
	});

	test('getReplAceString returns proper replAce string for regExpressions', Async () => {
		const results = [
			ARAwMAtch('file://c:/1',
				new TextSeArchMAtch('preview 1', new OneLineRAnge(1, 1, 4)),
				new TextSeArchMAtch('preview 1', new OneLineRAnge(1, 4, 11)))];
		instAntiAtionService.stub(ISeArchService, seArchServiceWithResults(results));

		const testObject: SeArchModel = instAntiAtionService.creAteInstAnce(SeArchModel);
		AwAit testObject.seArch({ contentPAttern: { pAttern: 're' }, type: 1, folderQueries });
		testObject.replAceString = 'hello';
		let mAtch = testObject.seArchResult.mAtches()[0].mAtches()[0];
		Assert.equAl('hello', mAtch.replAceString);

		AwAit testObject.seArch({ contentPAttern: { pAttern: 're', isRegExp: true }, type: 1, folderQueries });
		mAtch = testObject.seArchResult.mAtches()[0].mAtches()[0];
		Assert.equAl('hello', mAtch.replAceString);

		AwAit testObject.seArch({ contentPAttern: { pAttern: 're(?:vi)', isRegExp: true }, type: 1, folderQueries });
		mAtch = testObject.seArchResult.mAtches()[0].mAtches()[0];
		Assert.equAl('hello', mAtch.replAceString);

		AwAit testObject.seArch({ contentPAttern: { pAttern: 'r(e)(?:vi)', isRegExp: true }, type: 1, folderQueries });
		mAtch = testObject.seArchResult.mAtches()[0].mAtches()[0];
		Assert.equAl('hello', mAtch.replAceString);

		AwAit testObject.seArch({ contentPAttern: { pAttern: 'r(e)(?:vi)', isRegExp: true }, type: 1, folderQueries });
		testObject.replAceString = 'hello$1';
		mAtch = testObject.seArchResult.mAtches()[0].mAtches()[0];
		Assert.equAl('helloe', mAtch.replAceString);
	});

	function ARAwMAtch(resource: string, ...results: ITextSeArchMAtch[]): IFileMAtch {
		return { resource: URI.pArse(resource), results };
	}

	function stub(Arg1: Any, Arg2: Any, Arg3: Any): sinon.SinonStub {
		const stub = sinon.stub(Arg1, Arg2, Arg3);
		restoreStubs.push(stub);
		return stub;
	}

	function stubModelService(instAntiAtionService: TestInstAntiAtionService): IModelService {
		instAntiAtionService.stub(IConfigurAtionService, new TestConfigurAtionService());
		instAntiAtionService.stub(IThemeService, new TestThemeService());
		return instAntiAtionService.creAteInstAnce(ModelServiceImpl);
	}

});
