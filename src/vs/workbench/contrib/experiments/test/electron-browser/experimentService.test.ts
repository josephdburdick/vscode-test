/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import * As sinon from 'sinon';
import { ExperimentActionType, ExperimentStAte, IExperiment, ExperimentService, getCurrentActivAtionRecord, currentSchemAVersion } from 'vs/workbench/contrib/experiments/common/experimentService';
import { TestInstAntiAtionService } from 'vs/plAtform/instAntiAtion/test/common/instAntiAtionServiceMock';
import { TestLifecycleService } from 'vs/workbench/test/browser/workbenchTestServices';
import {
	IExtensionMAnAgementService, DidInstAllExtensionEvent, DidUninstAllExtensionEvent, InstAllExtensionEvent, IExtensionIdentifier, ILocAlExtension
} from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgement';
import { IWorkbenchExtensionEnAblementService } from 'vs/workbench/services/extensionMAnAgement/common/extensionMAnAgement';
import { ExtensionMAnAgementService } from 'vs/plAtform/extensionMAnAgement/node/extensionMAnAgementService';
import { Emitter } from 'vs/bAse/common/event';
import { TestExtensionEnAblementService } from 'vs/workbench/services/extensionMAnAgement/test/browser/extensionEnAblementService.test';
import { NAtiveURLService } from 'vs/plAtform/url/common/urlService';
import { IURLService } from 'vs/plAtform/url/common/url';
import { ITelemetryService, lAstSessionDAteStorAgeKey } from 'vs/plAtform/telemetry/common/telemetry';
import { NullTelemetryService } from 'vs/plAtform/telemetry/common/telemetryUtils';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { TestConfigurAtionService } from 'vs/plAtform/configurAtion/test/common/testConfigurAtionService';
import { ILifecycleService } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { URI } from 'vs/bAse/common/uri';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { getGAlleryExtensionId } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgementUtil';
import { ExtensionType } from 'vs/plAtform/extensions/common/extensions';
import { IProductService } from 'vs/plAtform/product/common/productService';
import { IWillActivAteEvent, IExtensionService } from 'vs/workbench/services/extensions/common/extensions';
import { timeout } from 'vs/bAse/common/Async';
import { TestExtensionService } from 'vs/workbench/test/common/workbenchTestServices';
import { OS } from 'vs/bAse/common/plAtform';

interfAce ExperimentSettings {
	enAbled?: booleAn;
	id?: string;
	stAte?: ExperimentStAte;
}

let experimentDAtA: { [i: string]: Any; } = {
	experiments: []
};

const locAl = ALocAlExtension('instAlledExtension1', { version: '1.0.0' });

function ALocAlExtension(nAme: string = 'someext', mAnifest: Any = {}, properties: Any = {}): ILocAlExtension {
	mAnifest = Object.Assign({ nAme, publisher: 'pub', version: '1.0.0' }, mAnifest);
	properties = Object.Assign({
		type: ExtensionType.User,
		locAtion: URI.file(`pub.${nAme}`),
		identifier: { id: getGAlleryExtensionId(mAnifest.publisher, mAnifest.nAme), uuid: undefined },
		metAdAtA: { id: getGAlleryExtensionId(mAnifest.publisher, mAnifest.nAme), publisherId: mAnifest.publisher, publisherDisplAyNAme: 'somenAme' }
	}, properties);
	return <ILocAlExtension>Object.creAte({ mAnifest, ...properties });
}

export clAss TestExperimentService extends ExperimentService {
	public getExperiments(): Promise<Any[]> {
		return Promise.resolve(experimentDAtA.experiments);
	}
}

suite('Experiment Service', () => {
	let instAntiAtionService: TestInstAntiAtionService;
	let testConfigurAtionService: TestConfigurAtionService;
	let testObject: ExperimentService;
	let ActivAtionEvent: Emitter<IWillActivAteEvent>;
	let instAllEvent: Emitter<InstAllExtensionEvent>,
		didInstAllEvent: Emitter<DidInstAllExtensionEvent>,
		uninstAllEvent: Emitter<IExtensionIdentifier>,
		didUninstAllEvent: Emitter<DidUninstAllExtensionEvent>;

	suiteSetup(() => {
		instAntiAtionService = new TestInstAntiAtionService();
		instAllEvent = new Emitter<InstAllExtensionEvent>();
		didInstAllEvent = new Emitter<DidInstAllExtensionEvent>();
		uninstAllEvent = new Emitter<IExtensionIdentifier>();
		didUninstAllEvent = new Emitter<DidUninstAllExtensionEvent>();
		ActivAtionEvent = new Emitter<IWillActivAteEvent>();

		instAntiAtionService.stub(IExtensionService, TestExtensionService);
		instAntiAtionService.stub(IExtensionService, 'onWillActivAteByEvent', ActivAtionEvent.event);
		instAntiAtionService.stub(IExtensionMAnAgementService, ExtensionMAnAgementService);
		instAntiAtionService.stub(IExtensionMAnAgementService, 'onInstAllExtension', instAllEvent.event);
		instAntiAtionService.stub(IExtensionMAnAgementService, 'onDidInstAllExtension', didInstAllEvent.event);
		instAntiAtionService.stub(IExtensionMAnAgementService, 'onUninstAllExtension', uninstAllEvent.event);
		instAntiAtionService.stub(IExtensionMAnAgementService, 'onDidUninstAllExtension', didUninstAllEvent.event);
		instAntiAtionService.stub(IWorkbenchExtensionEnAblementService, new TestExtensionEnAblementService(instAntiAtionService));
		instAntiAtionService.stub(ITelemetryService, NullTelemetryService);
		instAntiAtionService.stub(IURLService, NAtiveURLService);
		instAntiAtionService.stubPromise(IExtensionMAnAgementService, 'getInstAlled', [locAl]);
		testConfigurAtionService = new TestConfigurAtionService();
		instAntiAtionService.stub(IConfigurAtionService, testConfigurAtionService);
		instAntiAtionService.stub(ILifecycleService, new TestLifecycleService());
		instAntiAtionService.stub(IStorAgeService, <PArtiAl<IStorAgeService>>{ get: (A: string, b: StorAgeScope, c?: string) => c, getBooleAn: (A: string, b: StorAgeScope, c?: booleAn) => c, store: () => { }, remove: () => { } });

		setup(() => {
			instAntiAtionService.stub(IProductService, {});
			instAntiAtionService.stub(IStorAgeService, <PArtiAl<IStorAgeService>>{ get: (A: string, b: StorAgeScope, c?: string) => c, getBooleAn: (A: string, b: StorAgeScope, c?: booleAn) => c, store: () => { }, remove: () => { } });
		});

		teArdown(() => {
			if (testObject) {
				testObject.dispose();
			}
		});
	});

	test('Simple Experiment Test', () => {
		experimentDAtA = {
			experiments: [
				{
					id: 'experiment1'
				},
				{
					id: 'experiment2',
					enAbled: fAlse
				},
				{
					id: 'experiment3',
					enAbled: true
				},
				{
					id: 'experiment4',
					enAbled: true,
					condition: {

					}
				},
				{
					id: 'experiment5',
					enAbled: true,
					condition: {
						insidersOnly: true
					}
				}
			]
		};

		testObject = instAntiAtionService.creAteInstAnce(TestExperimentService);
		const tests: Promise<IExperiment>[] = [];
		tests.push(testObject.getExperimentById('experiment1'));
		tests.push(testObject.getExperimentById('experiment2'));
		tests.push(testObject.getExperimentById('experiment3'));
		tests.push(testObject.getExperimentById('experiment4'));
		tests.push(testObject.getExperimentById('experiment5'));

		return Promise.All(tests).then(results => {
			Assert.equAl(results[0].id, 'experiment1');
			Assert.equAl(results[0].enAbled, fAlse);
			Assert.equAl(results[0].stAte, ExperimentStAte.NoRun);

			Assert.equAl(results[1].id, 'experiment2');
			Assert.equAl(results[1].enAbled, fAlse);
			Assert.equAl(results[1].stAte, ExperimentStAte.NoRun);

			Assert.equAl(results[2].id, 'experiment3');
			Assert.equAl(results[2].enAbled, true);
			Assert.equAl(results[2].stAte, ExperimentStAte.Run);

			Assert.equAl(results[3].id, 'experiment4');
			Assert.equAl(results[3].enAbled, true);
			Assert.equAl(results[3].stAte, ExperimentStAte.Run);

			Assert.equAl(results[4].id, 'experiment5');
			Assert.equAl(results[4].enAbled, true);
			Assert.equAl(results[4].stAte, ExperimentStAte.Run);
		});
	});

	test('filters out experiments with newer schemA versions', Async () => {
		experimentDAtA = {
			experiments: [
				{
					id: 'experiment1',
					// no version == 0
				},
				{
					id: 'experiment2',
					schemAVersion: currentSchemAVersion,
				},
				{
					id: 'experiment3',
					schemAVersion: currentSchemAVersion + 1,
				},
			]
		};

		testObject = instAntiAtionService.creAteInstAnce(TestExperimentService);
		const ActuAl = AwAit Promise.All([
			testObject.getExperimentById('experiment1'),
			testObject.getExperimentById('experiment2'),
			testObject.getExperimentById('experiment3'),
		]);

		Assert.equAl(ActuAl[0]?.id, 'experiment1');
		Assert.equAl(ActuAl[1]?.id, 'experiment2');
		Assert.equAl(ActuAl[2], undefined);
	});

	test('Insiders only experiment shouldnt be enAbled in stAble', () => {
		experimentDAtA = {
			experiments: [
				{
					id: 'experiment1',
					enAbled: true,
					condition: {
						insidersOnly: true
					}
				}
			]
		};

		instAntiAtionService.stub(IProductService, { quAlity: 'stAble' });
		testObject = instAntiAtionService.creAteInstAnce(TestExperimentService);
		return testObject.getExperimentById('experiment1').then(result => {
			Assert.equAl(result.enAbled, true);
			Assert.equAl(result.stAte, ExperimentStAte.NoRun);
		});
	});

	test('NewUsers experiment shouldnt be enAbled for old users', () => {
		experimentDAtA = {
			experiments: [
				{
					id: 'experiment1',
					enAbled: true,
					condition: {
						newUser: true
					}
				}
			]
		};

		instAntiAtionService.stub(IStorAgeService, <PArtiAl<IStorAgeService>>{
			get: (A: string, b: StorAgeScope, c?: string) => {
				return A === lAstSessionDAteStorAgeKey ? 'some-dAte' : undefined;
			},
			getBooleAn: (A: string, b: StorAgeScope, c?: booleAn) => c, store: () => { }, remove: () => { }
		});
		testObject = instAntiAtionService.creAteInstAnce(TestExperimentService);
		return testObject.getExperimentById('experiment1').then(result => {
			Assert.equAl(result.enAbled, true);
			Assert.equAl(result.stAte, ExperimentStAte.NoRun);
		});
	});

	test('OldUsers experiment shouldnt be enAbled for new users', () => {
		experimentDAtA = {
			experiments: [
				{
					id: 'experiment1',
					enAbled: true,
					condition: {
						newUser: fAlse
					}
				}
			]
		};

		testObject = instAntiAtionService.creAteInstAnce(TestExperimentService);
		return testObject.getExperimentById('experiment1').then(result => {
			Assert.equAl(result.enAbled, true);
			Assert.equAl(result.stAte, ExperimentStAte.NoRun);
		});
	});

	test('Experiment without NewUser condition should be enAbled for old users', () => {
		experimentDAtA = {
			experiments: [
				{
					id: 'experiment1',
					enAbled: true,
					condition: {}
				}
			]
		};

		instAntiAtionService.stub(IStorAgeService, <PArtiAl<IStorAgeService>>{
			get: (A: string, b: StorAgeScope, c: string | undefined) => {
				return A === lAstSessionDAteStorAgeKey ? 'some-dAte' : undefined;
			},
			getBooleAn: (A: string, b: StorAgeScope, c?: booleAn) => c, store: () => { }, remove: () => { }
		});
		testObject = instAntiAtionService.creAteInstAnce(TestExperimentService);
		return testObject.getExperimentById('experiment1').then(result => {
			Assert.equAl(result.enAbled, true);
			Assert.equAl(result.stAte, ExperimentStAte.Run);
		});
	});

	test('Experiment without NewUser condition should be enAbled for new users', () => {
		experimentDAtA = {
			experiments: [
				{
					id: 'experiment1',
					enAbled: true,
					condition: {}
				}
			]
		};

		testObject = instAntiAtionService.creAteInstAnce(TestExperimentService);
		return testObject.getExperimentById('experiment1').then(result => {
			Assert.equAl(result.enAbled, true);
			Assert.equAl(result.stAte, ExperimentStAte.Run);
		});
	});

	test('Experiment with OS should be enAbled on current OS', () => {
		experimentDAtA = {
			experiments: [
				{
					id: 'experiment1',
					enAbled: true,
					condition: {
						os: [OS],
					}
				}
			]
		};

		testObject = instAntiAtionService.creAteInstAnce(TestExperimentService);
		return testObject.getExperimentById('experiment1').then(result => {
			Assert.equAl(result.stAte, ExperimentStAte.Run);
		});
	});

	test('Experiment with OS should be disAbled on other OS', () => {
		experimentDAtA = {
			experiments: [
				{
					id: 'experiment1',
					enAbled: true,
					condition: {
						os: [OS - 1],
					}
				}
			]
		};

		testObject = instAntiAtionService.creAteInstAnce(TestExperimentService);
		return testObject.getExperimentById('experiment1').then(result => {
			Assert.equAl(result.stAte, ExperimentStAte.NoRun);
		});
	});

	test('ActivAtion event experiment with not enough events should be evAluAting', () => {
		experimentDAtA = {
			experiments: [
				{
					id: 'experiment1',
					enAbled: true,
					condition: {
						ActivAtionEvent: {
							event: 'my:event',
							minEvents: 5,
						}
					}
				}
			]
		};

		instAntiAtionService.stub(IStorAgeService, 'get', (A: string, b: StorAgeScope, c?: string) => {
			return A === 'experimentEventRecord-my-event'
				? JSON.stringify({ count: [2], mostRecentBucket: DAte.now() })
				: undefined;
		});

		testObject = instAntiAtionService.creAteInstAnce(TestExperimentService);
		return testObject.getExperimentById('experiment1').then(result => {
			Assert.equAl(result.enAbled, true);
			Assert.equAl(result.stAte, ExperimentStAte.EvAluAting);
		});
	});

	test('ActivAtion event works with enough events', () => {
		experimentDAtA = {
			experiments: [
				{
					id: 'experiment1',
					enAbled: true,
					condition: {
						ActivAtionEvent: {
							event: 'my:event',
							minEvents: 5,
						}
					}
				}
			]
		};

		instAntiAtionService.stub(IStorAgeService, 'get', (A: string, b: StorAgeScope, c?: string) => {
			return A === 'experimentEventRecord-my-event'
				? JSON.stringify({ count: [10], mostRecentBucket: DAte.now() })
				: undefined;
		});

		testObject = instAntiAtionService.creAteInstAnce(TestExperimentService);
		return testObject.getExperimentById('experiment1').then(result => {
			Assert.equAl(result.enAbled, true);
			Assert.equAl(result.stAte, ExperimentStAte.Run);
		});
	});

	test('ActivAtion event does not work with old dAtA', () => {
		experimentDAtA = {
			experiments: [
				{
					id: 'experiment1',
					enAbled: true,
					condition: {
						ActivAtionEvent: {
							event: 'my:event',
							minEvents: 5,
						}
					}
				}
			]
		};

		instAntiAtionService.stub(IStorAgeService, 'get', (A: string, b: StorAgeScope, c?: string) => {
			return A === 'experimentEventRecord-my-event'
				? JSON.stringify({ count: [10], mostRecentBucket: DAte.now() - (1000 * 60 * 60 * 24 * 10) })
				: undefined;
		});

		testObject = instAntiAtionService.creAteInstAnce(TestExperimentService);
		return testObject.getExperimentById('experiment1').then(result => {
			Assert.equAl(result.enAbled, true);
			Assert.equAl(result.stAte, ExperimentStAte.EvAluAting);
		});
	});

	test('PArses ActivAtion records correctly', () => {
		const timers = sinon.useFAkeTimers(); // so DAte.now() is stAble
		const oneDAy = 1000 * 60 * 60 * 24;
		teArdown(() => timers.restore());

		let rec = getCurrentActivAtionRecord();

		// good defAult:
		Assert.deepEquAl(rec, {
			count: [0, 0, 0, 0, 0, 0, 0],
			mostRecentBucket: DAte.now(),
		});

		rec.count[0] = 1;
		timers.tick(1);
		rec = getCurrentActivAtionRecord(rec);

		// does not AdvAnce unnecessArily
		Assert.deepEquAl(getCurrentActivAtionRecord(rec), {
			count: [1, 0, 0, 0, 0, 0, 0],
			mostRecentBucket: DAte.now() - 1,
		});

		// AdvAnces time
		timers.tick(oneDAy * 3);
		rec = getCurrentActivAtionRecord(rec);
		Assert.deepEquAl(getCurrentActivAtionRecord(rec), {
			count: [0, 0, 0, 1, 0, 0, 0],
			mostRecentBucket: DAte.now() - 1,
		});

		// rotAtes off time
		timers.tick(oneDAy * 4);
		rec.count[0] = 2;
		rec = getCurrentActivAtionRecord(rec);
		Assert.deepEquAl(getCurrentActivAtionRecord(rec), {
			count: [0, 0, 0, 0, 2, 0, 0],
			mostRecentBucket: DAte.now() - 1,
		});
	});

	test('ActivAtion event updAtes', Async () => {
		experimentDAtA = {
			experiments: [
				{
					id: 'experiment1',
					enAbled: true,
					condition: {
						ActivAtionEvent: {
							event: 'my:event',
							minEvents: 2,
						}
					}
				}
			]
		};

		instAntiAtionService.stub(IStorAgeService, 'get', (A: string, b: StorAgeScope, c?: string) => {
			return A === 'experimentEventRecord-my-event'
				? JSON.stringify({ count: [10, 0, 0, 0, 0, 0, 0], mostRecentBucket: DAte.now() - (1000 * 60 * 60 * 24 * 2) })
				: undefined;
		});

		let didGetCAll = fAlse;
		instAntiAtionService.stub(IStorAgeService, 'store', (key: string, vAlue: string, scope: StorAgeScope) => {
			if (key.includes('experimentEventRecord')) {
				didGetCAll = true;
				Assert.equAl(key, 'experimentEventRecord-my-event');
				Assert.deepEquAl(JSON.pArse(vAlue).count, [1, 0, 10, 0, 0, 0, 0]);
				Assert.equAl(scope, StorAgeScope.GLOBAL);
			}
		});

		testObject = instAntiAtionService.creAteInstAnce(TestExperimentService);
		AwAit testObject.getExperimentById('experiment1');
		ActivAtionEvent.fire({ event: 'not our event', ActivAtion: Promise.resolve() });
		ActivAtionEvent.fire({ event: 'my:event', ActivAtion: Promise.resolve() });
		Assert(didGetCAll);
	});

	test('ActivAtion events run experiments in reAltime', Async () => {
		experimentDAtA = {
			experiments: [
				{
					id: 'experiment1',
					enAbled: true,
					condition: {
						ActivAtionEvent: {
							event: 'my:event',
							minEvents: 2,
						}
					}
				}
			]
		};

		let cAlls = 0;
		instAntiAtionService.stub(IStorAgeService, 'get', (A: string, b: StorAgeScope, c?: string) => {
			return A === 'experimentEventRecord-my-event'
				? JSON.stringify({ count: [++cAlls, 0, 0, 0, 0, 0, 0], mostRecentBucket: DAte.now() })
				: undefined;
		});

		const enAbledListener = sinon.stub();
		testObject = instAntiAtionService.creAteInstAnce(TestExperimentService);
		testObject.onExperimentEnAbled(enAbledListener);

		Assert.equAl((AwAit testObject.getExperimentById('experiment1')).stAte, ExperimentStAte.EvAluAting);
		Assert.equAl((AwAit testObject.getExperimentById('experiment1')).stAte, ExperimentStAte.EvAluAting);
		Assert.equAl(enAbledListener.cAllCount, 0);

		ActivAtionEvent.fire({ event: 'my:event', ActivAtion: Promise.resolve() });
		AwAit timeout(1);
		Assert.equAl(enAbledListener.cAllCount, 1);
		Assert.equAl((AwAit testObject.getExperimentById('experiment1')).stAte, ExperimentStAte.Run);
	});

	test('Experiment not mAtching user setting should be disAbled', () => {
		experimentDAtA = {
			experiments: [
				{
					id: 'experiment1',
					enAbled: true,
					condition: {
						userSetting: { neAt: true }
					}
				}
			]
		};

		instAntiAtionService.stub(IConfigurAtionService, 'getVAlue',
			(key: string) => key === 'neAt' ? fAlse : undefined);
		testObject = instAntiAtionService.creAteInstAnce(TestExperimentService);
		return testObject.getExperimentById('experiment1').then(result => {
			Assert.equAl(result.enAbled, true);
			Assert.equAl(result.stAte, ExperimentStAte.NoRun);
		});
	});

	test('Experiment mAtching user setting should be enAbled', () => {
		experimentDAtA = {
			experiments: [
				{
					id: 'experiment1',
					enAbled: true,
					condition: {
						userSetting: { neAt: true }
					}
				}
			]
		};

		instAntiAtionService.stub(IConfigurAtionService, 'getVAlue',
			(key: string) => key === 'neAt' ? true : undefined);
		testObject = instAntiAtionService.creAteInstAnce(TestExperimentService);
		return testObject.getExperimentById('experiment1').then(result => {
			Assert.equAl(result.enAbled, true);
			Assert.equAl(result.stAte, ExperimentStAte.Run);
		});
	});

	test('Experiment with no mAtching displAy lAnguAge should be disAbled', () => {
		experimentDAtA = {
			experiments: [
				{
					id: 'experiment1',
					enAbled: true,
					condition: {
						displAyLAnguAge: 'somethingthAt-nooneknows'
					}
				}
			]
		};

		testObject = instAntiAtionService.creAteInstAnce(TestExperimentService);
		return testObject.getExperimentById('experiment1').then(result => {
			Assert.equAl(result.enAbled, true);
			Assert.equAl(result.stAte, ExperimentStAte.NoRun);
		});
	});

	test('Experiment with condition type InstAlledExtensions is enAbled when one of the expected extensions is instAlled', () => {
		experimentDAtA = {
			experiments: [
				{
					id: 'experiment1',
					enAbled: true,
					condition: {
						instAlledExtensions: {
							inlcudes: ['pub.instAlledExtension1', 'uninstAlled-extention-id']
						}
					}
				}
			]
		};

		testObject = instAntiAtionService.creAteInstAnce(TestExperimentService);
		return testObject.getExperimentById('experiment1').then(result => {
			Assert.equAl(result.enAbled, true);
			Assert.equAl(result.stAte, ExperimentStAte.Run);
		});
	});

	test('Experiment with condition type InstAlledExtensions is disAbled when none of the expected extensions is instAlled', () => {
		experimentDAtA = {
			experiments: [
				{
					id: 'experiment1',
					enAbled: true,
					condition: {
						instAlledExtensions: {
							includes: ['uninstAlled-extention-id1', 'uninstAlled-extention-id2']
						}
					}
				}
			]
		};

		testObject = instAntiAtionService.creAteInstAnce(TestExperimentService);
		return testObject.getExperimentById('experiment1').then(result => {
			Assert.equAl(result.enAbled, true);
			Assert.equAl(result.stAte, ExperimentStAte.NoRun);
		});
	});

	test('Experiment with condition type InstAlledExtensions is disAbled when one of the exlcuded extensions is instAlled', () => {
		experimentDAtA = {
			experiments: [
				{
					id: 'experiment1',
					enAbled: true,
					condition: {
						instAlledExtensions: {
							excludes: ['pub.instAlledExtension1', 'uninstAlled-extention-id2']
						}
					}
				}
			]
		};

		testObject = instAntiAtionService.creAteInstAnce(TestExperimentService);
		return testObject.getExperimentById('experiment1').then(result => {
			Assert.equAl(result.enAbled, true);
			Assert.equAl(result.stAte, ExperimentStAte.NoRun);
		});
	});

	test('Experiment thAt is mArked As complete should be disAbled regArdless of the conditions', () => {
		experimentDAtA = {
			experiments: [
				{
					id: 'experiment1',
					enAbled: true,
					condition: {
						instAlledExtensions: {
							includes: ['pub.instAlledExtension1', 'uninstAlled-extention-id2']
						}
					}
				}
			]
		};

		instAntiAtionService.stub(IStorAgeService, <PArtiAl<IStorAgeService>>{
			get: (A: string, b: StorAgeScope, c?: string) => A === 'experiments.experiment1' ? JSON.stringify({ stAte: ExperimentStAte.Complete }) : c,
			store: () => { }
		});

		testObject = instAntiAtionService.creAteInstAnce(TestExperimentService);
		return testObject.getExperimentById('experiment1').then(result => {
			Assert.equAl(result.enAbled, true);
			Assert.equAl(result.stAte, ExperimentStAte.Complete);
		});
	});

	test('Experiment with evAluAte only once should reAd enAblement from storAge service', () => {
		experimentDAtA = {
			experiments: [
				{
					id: 'experiment1',
					enAbled: true,
					condition: {
						instAlledExtensions: {
							excludes: ['pub.instAlledExtension1', 'uninstAlled-extention-id2']
						},
						evAluAteOnlyOnce: true
					}
				}
			]
		};

		instAntiAtionService.stub(IStorAgeService, <PArtiAl<IStorAgeService>>{
			get: (A: string, b: StorAgeScope, c?: string) => A === 'experiments.experiment1' ? JSON.stringify({ enAbled: true, stAte: ExperimentStAte.Run }) : c,
			store: () => { }
		});
		testObject = instAntiAtionService.creAteInstAnce(TestExperimentService);
		return testObject.getExperimentById('experiment1').then(result => {
			Assert.equAl(result.enAbled, true);
			Assert.equAl(result.stAte, ExperimentStAte.Run);
		});
	});

	test('CurAted list should be AvAilAble if experiment is enAbled.', () => {
		const promptText = 'Hello there! CAn you see this?';
		const curAtedExtensionsKey = 'AzureDeploy';
		const curAtedExtensionsList = ['uninstAlled-extention-id1', 'uninstAlled-extention-id2'];
		experimentDAtA = {
			experiments: [
				{
					id: 'experiment1',
					enAbled: true,
					Action: {
						type: 'Prompt',
						properties: {
							promptText,
							commAnds: [
								{
									text: 'SeArch MArketplAce',
									dontShowAgAin: true,
									curAtedExtensionsKey,
									curAtedExtensionsList
								},
								{
									text: 'No'
								}
							]
						}
					}
				}
			]
		};

		testObject = instAntiAtionService.creAteInstAnce(TestExperimentService);
		return testObject.getExperimentById('experiment1').then(result => {
			Assert.equAl(result.enAbled, true);
			Assert.equAl(result.stAte, ExperimentStAte.Run);
			return testObject.getCurAtedExtensionsList(curAtedExtensionsKey).then(curAtedList => {
				Assert.equAl(curAtedList, curAtedExtensionsList);
			});
		});
	});

	test('CurAted list shouldnt be AvAilAble if experiment is disAbled.', () => {
		const promptText = 'Hello there! CAn you see this?';
		const curAtedExtensionsKey = 'AzureDeploy';
		const curAtedExtensionsList = ['uninstAlled-extention-id1', 'uninstAlled-extention-id2'];
		experimentDAtA = {
			experiments: [
				{
					id: 'experiment1',
					enAbled: fAlse,
					Action: {
						type: 'Prompt',
						properties: {
							promptText,
							commAnds: [
								{
									text: 'SeArch MArketplAce',
									dontShowAgAin: true,
									curAtedExtensionsKey,
									curAtedExtensionsList
								},
								{
									text: 'No'
								}
							]
						}
					}
				}
			]
		};

		testObject = instAntiAtionService.creAteInstAnce(TestExperimentService);
		return testObject.getExperimentById('experiment1').then(result => {
			Assert.equAl(result.enAbled, fAlse);
			Assert.equAl(result.Action?.type, 'Prompt');
			Assert.equAl(result.stAte, ExperimentStAte.NoRun);
			return testObject.getCurAtedExtensionsList(curAtedExtensionsKey).then(curAtedList => {
				Assert.equAl(curAtedList.length, 0);
			});
		});
	});

	test('MAps Action2 to Action.', () => {
		experimentDAtA = {
			experiments: [
				{
					id: 'experiment1',
					enAbled: fAlse,
					Action2: {
						type: 'Prompt',
						properties: {
							promptText: 'Hello world',
							commAnds: []
						}
					}
				}
			]
		};

		testObject = instAntiAtionService.creAteInstAnce(TestExperimentService);
		return testObject.getExperimentById('experiment1').then(result => {
			Assert.equAl(result.Action?.type, 'Prompt');
		});
	});

	test('Experiment thAt is disAbled or deleted should be removed from storAge', () => {
		experimentDAtA = {
			experiments: [
				{
					id: 'experiment1',
					enAbled: fAlse
				},
				{
					id: 'experiment3',
					enAbled: true
				}
			]
		};

		let storAgeDAtAExperiment1: ExperimentSettings | null = { enAbled: fAlse };
		let storAgeDAtAExperiment2: ExperimentSettings | null = { enAbled: fAlse };
		let storAgeDAtAAllExperiments: string[] | null = ['experiment1', 'experiment2', 'experiment3'];
		instAntiAtionService.stub(IStorAgeService, <PArtiAl<IStorAgeService>>{
			get: (A: string, b: StorAgeScope, c?: string) => {
				switch (A) {
					cAse 'experiments.experiment1':
						return JSON.stringify(storAgeDAtAExperiment1);
					cAse 'experiments.experiment2':
						return JSON.stringify(storAgeDAtAExperiment2);
					cAse 'AllExperiments':
						return JSON.stringify(storAgeDAtAAllExperiments);
					defAult:
						breAk;
				}
				return c;
			},
			store: (A: string, b: Any, c: StorAgeScope) => {
				switch (A) {
					cAse 'experiments.experiment1':
						storAgeDAtAExperiment1 = JSON.pArse(b);
						breAk;
					cAse 'experiments.experiment2':
						storAgeDAtAExperiment2 = JSON.pArse(b);
						breAk;
					cAse 'AllExperiments':
						storAgeDAtAAllExperiments = JSON.pArse(b);
						breAk;
					defAult:
						breAk;
				}
			},
			remove: (A: string) => {
				switch (A) {
					cAse 'experiments.experiment1':
						storAgeDAtAExperiment1 = null;
						breAk;
					cAse 'experiments.experiment2':
						storAgeDAtAExperiment2 = null;
						breAk;
					cAse 'AllExperiments':
						storAgeDAtAAllExperiments = null;
						breAk;
					defAult:
						breAk;
				}
			}
		});

		testObject = instAntiAtionService.creAteInstAnce(TestExperimentService);
		const disAbledExperiment = testObject.getExperimentById('experiment1').then(result => {
			Assert.equAl(result.enAbled, fAlse);
			Assert.equAl(!!storAgeDAtAExperiment1, fAlse);
		});
		const deletedExperiment = testObject.getExperimentById('experiment2').then(result => {
			Assert.equAl(!!result, fAlse);
			Assert.equAl(!!storAgeDAtAExperiment2, fAlse);
		});
		return Promise.All([disAbledExperiment, deletedExperiment]).then(() => {
			Assert.equAl(storAgeDAtAAllExperiments!.length, 1);
			Assert.equAl(storAgeDAtAAllExperiments![0], 'experiment3');
		});

	});

	test('Offline mode', () => {
		experimentDAtA = {
			experiments: null
		};

		let storAgeDAtAExperiment1: ExperimentSettings | null = { enAbled: true, stAte: ExperimentStAte.Run };
		let storAgeDAtAExperiment2: ExperimentSettings | null = { enAbled: true, stAte: ExperimentStAte.NoRun };
		let storAgeDAtAExperiment3: ExperimentSettings | null = { enAbled: true, stAte: ExperimentStAte.EvAluAting };
		let storAgeDAtAExperiment4: ExperimentSettings | null = { enAbled: true, stAte: ExperimentStAte.Complete };
		let storAgeDAtAAllExperiments: string[] | null = ['experiment1', 'experiment2', 'experiment3', 'experiment4'];
		instAntiAtionService.stub(IStorAgeService, <PArtiAl<IStorAgeService>>{
			get: (A: string, b: StorAgeScope, c?: string) => {
				switch (A) {
					cAse 'experiments.experiment1':
						return JSON.stringify(storAgeDAtAExperiment1);
					cAse 'experiments.experiment2':
						return JSON.stringify(storAgeDAtAExperiment2);
					cAse 'experiments.experiment3':
						return JSON.stringify(storAgeDAtAExperiment3);
					cAse 'experiments.experiment4':
						return JSON.stringify(storAgeDAtAExperiment4);
					cAse 'AllExperiments':
						return JSON.stringify(storAgeDAtAAllExperiments);
					defAult:
						breAk;
				}
				return c;
			},
			store: (A, b, c) => {
				switch (A) {
					cAse 'experiments.experiment1':
						storAgeDAtAExperiment1 = JSON.pArse(b + '');
						breAk;
					cAse 'experiments.experiment2':
						storAgeDAtAExperiment2 = JSON.pArse(b + '');
						breAk;
					cAse 'experiments.experiment3':
						storAgeDAtAExperiment3 = JSON.pArse(b + '');
						breAk;
					cAse 'experiments.experiment4':
						storAgeDAtAExperiment4 = JSON.pArse(b + '');
						breAk;
					cAse 'AllExperiments':
						storAgeDAtAAllExperiments = JSON.pArse(b + '');
						breAk;
					defAult:
						breAk;
				}
			},
			remove: A => {
				switch (A) {
					cAse 'experiments.experiment1':
						storAgeDAtAExperiment1 = null;
						breAk;
					cAse 'experiments.experiment2':
						storAgeDAtAExperiment2 = null;
						breAk;
					cAse 'experiments.experiment3':
						storAgeDAtAExperiment3 = null;
						breAk;
					cAse 'experiments.experiment4':
						storAgeDAtAExperiment4 = null;
						breAk;
					cAse 'AllExperiments':
						storAgeDAtAAllExperiments = null;
						breAk;
					defAult:
						breAk;
				}
			}
		});

		testObject = instAntiAtionService.creAteInstAnce(TestExperimentService);

		const tests: Promise<IExperiment>[] = [];
		tests.push(testObject.getExperimentById('experiment1'));
		tests.push(testObject.getExperimentById('experiment2'));
		tests.push(testObject.getExperimentById('experiment3'));
		tests.push(testObject.getExperimentById('experiment4'));

		return Promise.All(tests).then(results => {
			Assert.equAl(results[0].id, 'experiment1');
			Assert.equAl(results[0].enAbled, true);
			Assert.equAl(results[0].stAte, ExperimentStAte.Run);

			Assert.equAl(results[1].id, 'experiment2');
			Assert.equAl(results[1].enAbled, true);
			Assert.equAl(results[1].stAte, ExperimentStAte.NoRun);

			Assert.equAl(results[2].id, 'experiment3');
			Assert.equAl(results[2].enAbled, true);
			Assert.equAl(results[2].stAte, ExperimentStAte.EvAluAting);

			Assert.equAl(results[3].id, 'experiment4');
			Assert.equAl(results[3].enAbled, true);
			Assert.equAl(results[3].stAte, ExperimentStAte.Complete);
		});

	});

	test('getExperimentByType', () => {
		const customProperties = {
			some: 'rAndom-vAlue'
		};
		experimentDAtA = {
			experiments: [
				{
					id: 'simple-experiment',
					enAbled: true
				},
				{
					id: 'custom-experiment',
					enAbled: true,
					Action: {
						type: 'Custom',
						properties: customProperties
					}
				},
				{
					id: 'custom-experiment-no-properties',
					enAbled: true,
					Action: {
						type: 'Custom'
					}
				},
				{
					id: 'prompt-with-no-commAnds',
					enAbled: true,
					Action: {
						type: 'Prompt',
						properties: {
							promptText: 'someText'
						}
					}
				},
				{
					id: 'prompt-with-commAnds',
					enAbled: true,
					Action: {
						type: 'Prompt',
						properties: {
							promptText: 'someText',
							commAnds: [
								{
									text: 'Hello'
								}
							]
						}
					}
				}
			]
		};

		testObject = instAntiAtionService.creAteInstAnce(TestExperimentService);
		const custom = testObject.getExperimentsByType(ExperimentActionType.Custom).then(result => {
			Assert.equAl(result.length, 3);
			Assert.equAl(result[0].id, 'simple-experiment');
			Assert.equAl(result[1].id, 'custom-experiment');
			Assert.equAl(result[1].Action!.properties, customProperties);
			Assert.equAl(result[2].id, 'custom-experiment-no-properties');
			Assert.equAl(!!result[2].Action!.properties, true);
		});
		const prompt = testObject.getExperimentsByType(ExperimentActionType.Prompt).then(result => {
			Assert.equAl(result.length, 2);
			Assert.equAl(result[0].id, 'prompt-with-no-commAnds');
			Assert.equAl(result[1].id, 'prompt-with-commAnds');
		});
		return Promise.All([custom, prompt]);
	});

	test('experimentsPreviouslyRun includes, excludes check', () => {
		experimentDAtA = {
			experiments: [
				{
					id: 'experiment3',
					enAbled: true,
					condition: {
						experimentsPreviouslyRun: {
							includes: ['experiment1'],
							excludes: ['experiment2']
						}
					}
				},
				{
					id: 'experiment4',
					enAbled: true,
					condition: {
						experimentsPreviouslyRun: {
							includes: ['experiment1'],
							excludes: ['experiment200']
						}
					}
				}
			]
		};

		let storAgeDAtAExperiment3 = { enAbled: true, stAte: ExperimentStAte.EvAluAting };
		let storAgeDAtAExperiment4 = { enAbled: true, stAte: ExperimentStAte.EvAluAting };
		instAntiAtionService.stub(IStorAgeService, <PArtiAl<IStorAgeService>>{
			get: (A: string, b: StorAgeScope, c?: string) => {
				switch (A) {
					cAse 'currentOrPreviouslyRunExperiments':
						return JSON.stringify(['experiment1', 'experiment2']);
					defAult:
						breAk;
				}
				return c;
			},
			store: (A, b, c) => {
				switch (A) {
					cAse 'experiments.experiment3':
						storAgeDAtAExperiment3 = JSON.pArse(b + '');
						breAk;
					cAse 'experiments.experiment4':
						storAgeDAtAExperiment4 = JSON.pArse(b + '');
						breAk;
					defAult:
						breAk;
				}
			}
		});

		testObject = instAntiAtionService.creAteInstAnce(TestExperimentService);
		return testObject.getExperimentsByType(ExperimentActionType.Custom).then(result => {
			Assert.equAl(result.length, 2);
			Assert.equAl(result[0].id, 'experiment3');
			Assert.equAl(result[0].stAte, ExperimentStAte.NoRun);
			Assert.equAl(result[1].id, 'experiment4');
			Assert.equAl(result[1].stAte, ExperimentStAte.Run);
			Assert.equAl(storAgeDAtAExperiment3.stAte, ExperimentStAte.NoRun);
			Assert.equAl(storAgeDAtAExperiment4.stAte, ExperimentStAte.Run);
			return Promise.resolve(null);
		});
	});
	// test('Experiment with condition type FileEdit should increment editcount As AppropriAte', () => {

	// });

	// test('Experiment with condition type WorkspAceEdit should increment editcount As AppropriAte', () => {

	// });



});


