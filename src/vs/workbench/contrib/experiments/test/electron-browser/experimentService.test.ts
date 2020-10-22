/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as sinon from 'sinon';
import { ExperimentActionType, ExperimentState, IExperiment, ExperimentService, getCurrentActivationRecord, currentSchemaVersion } from 'vs/workBench/contriB/experiments/common/experimentService';
import { TestInstantiationService } from 'vs/platform/instantiation/test/common/instantiationServiceMock';
import { TestLifecycleService } from 'vs/workBench/test/Browser/workBenchTestServices';
import {
	IExtensionManagementService, DidInstallExtensionEvent, DidUninstallExtensionEvent, InstallExtensionEvent, IExtensionIdentifier, ILocalExtension
} from 'vs/platform/extensionManagement/common/extensionManagement';
import { IWorkBenchExtensionEnaBlementService } from 'vs/workBench/services/extensionManagement/common/extensionManagement';
import { ExtensionManagementService } from 'vs/platform/extensionManagement/node/extensionManagementService';
import { Emitter } from 'vs/Base/common/event';
import { TestExtensionEnaBlementService } from 'vs/workBench/services/extensionManagement/test/Browser/extensionEnaBlementService.test';
import { NativeURLService } from 'vs/platform/url/common/urlService';
import { IURLService } from 'vs/platform/url/common/url';
import { ITelemetryService, lastSessionDateStorageKey } from 'vs/platform/telemetry/common/telemetry';
import { NullTelemetryService } from 'vs/platform/telemetry/common/telemetryUtils';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { TestConfigurationService } from 'vs/platform/configuration/test/common/testConfigurationService';
import { ILifecycleService } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { URI } from 'vs/Base/common/uri';
import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';
import { getGalleryExtensionId } from 'vs/platform/extensionManagement/common/extensionManagementUtil';
import { ExtensionType } from 'vs/platform/extensions/common/extensions';
import { IProductService } from 'vs/platform/product/common/productService';
import { IWillActivateEvent, IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { timeout } from 'vs/Base/common/async';
import { TestExtensionService } from 'vs/workBench/test/common/workBenchTestServices';
import { OS } from 'vs/Base/common/platform';

interface ExperimentSettings {
	enaBled?: Boolean;
	id?: string;
	state?: ExperimentState;
}

let experimentData: { [i: string]: any; } = {
	experiments: []
};

const local = aLocalExtension('installedExtension1', { version: '1.0.0' });

function aLocalExtension(name: string = 'someext', manifest: any = {}, properties: any = {}): ILocalExtension {
	manifest = OBject.assign({ name, puBlisher: 'puB', version: '1.0.0' }, manifest);
	properties = OBject.assign({
		type: ExtensionType.User,
		location: URI.file(`puB.${name}`),
		identifier: { id: getGalleryExtensionId(manifest.puBlisher, manifest.name), uuid: undefined },
		metadata: { id: getGalleryExtensionId(manifest.puBlisher, manifest.name), puBlisherId: manifest.puBlisher, puBlisherDisplayName: 'somename' }
	}, properties);
	return <ILocalExtension>OBject.create({ manifest, ...properties });
}

export class TestExperimentService extends ExperimentService {
	puBlic getExperiments(): Promise<any[]> {
		return Promise.resolve(experimentData.experiments);
	}
}

suite('Experiment Service', () => {
	let instantiationService: TestInstantiationService;
	let testConfigurationService: TestConfigurationService;
	let testOBject: ExperimentService;
	let activationEvent: Emitter<IWillActivateEvent>;
	let installEvent: Emitter<InstallExtensionEvent>,
		didInstallEvent: Emitter<DidInstallExtensionEvent>,
		uninstallEvent: Emitter<IExtensionIdentifier>,
		didUninstallEvent: Emitter<DidUninstallExtensionEvent>;

	suiteSetup(() => {
		instantiationService = new TestInstantiationService();
		installEvent = new Emitter<InstallExtensionEvent>();
		didInstallEvent = new Emitter<DidInstallExtensionEvent>();
		uninstallEvent = new Emitter<IExtensionIdentifier>();
		didUninstallEvent = new Emitter<DidUninstallExtensionEvent>();
		activationEvent = new Emitter<IWillActivateEvent>();

		instantiationService.stuB(IExtensionService, TestExtensionService);
		instantiationService.stuB(IExtensionService, 'onWillActivateByEvent', activationEvent.event);
		instantiationService.stuB(IExtensionManagementService, ExtensionManagementService);
		instantiationService.stuB(IExtensionManagementService, 'onInstallExtension', installEvent.event);
		instantiationService.stuB(IExtensionManagementService, 'onDidInstallExtension', didInstallEvent.event);
		instantiationService.stuB(IExtensionManagementService, 'onUninstallExtension', uninstallEvent.event);
		instantiationService.stuB(IExtensionManagementService, 'onDidUninstallExtension', didUninstallEvent.event);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		instantiationService.stuB(ITelemetryService, NullTelemetryService);
		instantiationService.stuB(IURLService, NativeURLService);
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);
		testConfigurationService = new TestConfigurationService();
		instantiationService.stuB(IConfigurationService, testConfigurationService);
		instantiationService.stuB(ILifecycleService, new TestLifecycleService());
		instantiationService.stuB(IStorageService, <Partial<IStorageService>>{ get: (a: string, B: StorageScope, c?: string) => c, getBoolean: (a: string, B: StorageScope, c?: Boolean) => c, store: () => { }, remove: () => { } });

		setup(() => {
			instantiationService.stuB(IProductService, {});
			instantiationService.stuB(IStorageService, <Partial<IStorageService>>{ get: (a: string, B: StorageScope, c?: string) => c, getBoolean: (a: string, B: StorageScope, c?: Boolean) => c, store: () => { }, remove: () => { } });
		});

		teardown(() => {
			if (testOBject) {
				testOBject.dispose();
			}
		});
	});

	test('Simple Experiment Test', () => {
		experimentData = {
			experiments: [
				{
					id: 'experiment1'
				},
				{
					id: 'experiment2',
					enaBled: false
				},
				{
					id: 'experiment3',
					enaBled: true
				},
				{
					id: 'experiment4',
					enaBled: true,
					condition: {

					}
				},
				{
					id: 'experiment5',
					enaBled: true,
					condition: {
						insidersOnly: true
					}
				}
			]
		};

		testOBject = instantiationService.createInstance(TestExperimentService);
		const tests: Promise<IExperiment>[] = [];
		tests.push(testOBject.getExperimentById('experiment1'));
		tests.push(testOBject.getExperimentById('experiment2'));
		tests.push(testOBject.getExperimentById('experiment3'));
		tests.push(testOBject.getExperimentById('experiment4'));
		tests.push(testOBject.getExperimentById('experiment5'));

		return Promise.all(tests).then(results => {
			assert.equal(results[0].id, 'experiment1');
			assert.equal(results[0].enaBled, false);
			assert.equal(results[0].state, ExperimentState.NoRun);

			assert.equal(results[1].id, 'experiment2');
			assert.equal(results[1].enaBled, false);
			assert.equal(results[1].state, ExperimentState.NoRun);

			assert.equal(results[2].id, 'experiment3');
			assert.equal(results[2].enaBled, true);
			assert.equal(results[2].state, ExperimentState.Run);

			assert.equal(results[3].id, 'experiment4');
			assert.equal(results[3].enaBled, true);
			assert.equal(results[3].state, ExperimentState.Run);

			assert.equal(results[4].id, 'experiment5');
			assert.equal(results[4].enaBled, true);
			assert.equal(results[4].state, ExperimentState.Run);
		});
	});

	test('filters out experiments with newer schema versions', async () => {
		experimentData = {
			experiments: [
				{
					id: 'experiment1',
					// no version == 0
				},
				{
					id: 'experiment2',
					schemaVersion: currentSchemaVersion,
				},
				{
					id: 'experiment3',
					schemaVersion: currentSchemaVersion + 1,
				},
			]
		};

		testOBject = instantiationService.createInstance(TestExperimentService);
		const actual = await Promise.all([
			testOBject.getExperimentById('experiment1'),
			testOBject.getExperimentById('experiment2'),
			testOBject.getExperimentById('experiment3'),
		]);

		assert.equal(actual[0]?.id, 'experiment1');
		assert.equal(actual[1]?.id, 'experiment2');
		assert.equal(actual[2], undefined);
	});

	test('Insiders only experiment shouldnt Be enaBled in staBle', () => {
		experimentData = {
			experiments: [
				{
					id: 'experiment1',
					enaBled: true,
					condition: {
						insidersOnly: true
					}
				}
			]
		};

		instantiationService.stuB(IProductService, { quality: 'staBle' });
		testOBject = instantiationService.createInstance(TestExperimentService);
		return testOBject.getExperimentById('experiment1').then(result => {
			assert.equal(result.enaBled, true);
			assert.equal(result.state, ExperimentState.NoRun);
		});
	});

	test('NewUsers experiment shouldnt Be enaBled for old users', () => {
		experimentData = {
			experiments: [
				{
					id: 'experiment1',
					enaBled: true,
					condition: {
						newUser: true
					}
				}
			]
		};

		instantiationService.stuB(IStorageService, <Partial<IStorageService>>{
			get: (a: string, B: StorageScope, c?: string) => {
				return a === lastSessionDateStorageKey ? 'some-date' : undefined;
			},
			getBoolean: (a: string, B: StorageScope, c?: Boolean) => c, store: () => { }, remove: () => { }
		});
		testOBject = instantiationService.createInstance(TestExperimentService);
		return testOBject.getExperimentById('experiment1').then(result => {
			assert.equal(result.enaBled, true);
			assert.equal(result.state, ExperimentState.NoRun);
		});
	});

	test('OldUsers experiment shouldnt Be enaBled for new users', () => {
		experimentData = {
			experiments: [
				{
					id: 'experiment1',
					enaBled: true,
					condition: {
						newUser: false
					}
				}
			]
		};

		testOBject = instantiationService.createInstance(TestExperimentService);
		return testOBject.getExperimentById('experiment1').then(result => {
			assert.equal(result.enaBled, true);
			assert.equal(result.state, ExperimentState.NoRun);
		});
	});

	test('Experiment without NewUser condition should Be enaBled for old users', () => {
		experimentData = {
			experiments: [
				{
					id: 'experiment1',
					enaBled: true,
					condition: {}
				}
			]
		};

		instantiationService.stuB(IStorageService, <Partial<IStorageService>>{
			get: (a: string, B: StorageScope, c: string | undefined) => {
				return a === lastSessionDateStorageKey ? 'some-date' : undefined;
			},
			getBoolean: (a: string, B: StorageScope, c?: Boolean) => c, store: () => { }, remove: () => { }
		});
		testOBject = instantiationService.createInstance(TestExperimentService);
		return testOBject.getExperimentById('experiment1').then(result => {
			assert.equal(result.enaBled, true);
			assert.equal(result.state, ExperimentState.Run);
		});
	});

	test('Experiment without NewUser condition should Be enaBled for new users', () => {
		experimentData = {
			experiments: [
				{
					id: 'experiment1',
					enaBled: true,
					condition: {}
				}
			]
		};

		testOBject = instantiationService.createInstance(TestExperimentService);
		return testOBject.getExperimentById('experiment1').then(result => {
			assert.equal(result.enaBled, true);
			assert.equal(result.state, ExperimentState.Run);
		});
	});

	test('Experiment with OS should Be enaBled on current OS', () => {
		experimentData = {
			experiments: [
				{
					id: 'experiment1',
					enaBled: true,
					condition: {
						os: [OS],
					}
				}
			]
		};

		testOBject = instantiationService.createInstance(TestExperimentService);
		return testOBject.getExperimentById('experiment1').then(result => {
			assert.equal(result.state, ExperimentState.Run);
		});
	});

	test('Experiment with OS should Be disaBled on other OS', () => {
		experimentData = {
			experiments: [
				{
					id: 'experiment1',
					enaBled: true,
					condition: {
						os: [OS - 1],
					}
				}
			]
		};

		testOBject = instantiationService.createInstance(TestExperimentService);
		return testOBject.getExperimentById('experiment1').then(result => {
			assert.equal(result.state, ExperimentState.NoRun);
		});
	});

	test('Activation event experiment with not enough events should Be evaluating', () => {
		experimentData = {
			experiments: [
				{
					id: 'experiment1',
					enaBled: true,
					condition: {
						activationEvent: {
							event: 'my:event',
							minEvents: 5,
						}
					}
				}
			]
		};

		instantiationService.stuB(IStorageService, 'get', (a: string, B: StorageScope, c?: string) => {
			return a === 'experimentEventRecord-my-event'
				? JSON.stringify({ count: [2], mostRecentBucket: Date.now() })
				: undefined;
		});

		testOBject = instantiationService.createInstance(TestExperimentService);
		return testOBject.getExperimentById('experiment1').then(result => {
			assert.equal(result.enaBled, true);
			assert.equal(result.state, ExperimentState.Evaluating);
		});
	});

	test('Activation event works with enough events', () => {
		experimentData = {
			experiments: [
				{
					id: 'experiment1',
					enaBled: true,
					condition: {
						activationEvent: {
							event: 'my:event',
							minEvents: 5,
						}
					}
				}
			]
		};

		instantiationService.stuB(IStorageService, 'get', (a: string, B: StorageScope, c?: string) => {
			return a === 'experimentEventRecord-my-event'
				? JSON.stringify({ count: [10], mostRecentBucket: Date.now() })
				: undefined;
		});

		testOBject = instantiationService.createInstance(TestExperimentService);
		return testOBject.getExperimentById('experiment1').then(result => {
			assert.equal(result.enaBled, true);
			assert.equal(result.state, ExperimentState.Run);
		});
	});

	test('Activation event does not work with old data', () => {
		experimentData = {
			experiments: [
				{
					id: 'experiment1',
					enaBled: true,
					condition: {
						activationEvent: {
							event: 'my:event',
							minEvents: 5,
						}
					}
				}
			]
		};

		instantiationService.stuB(IStorageService, 'get', (a: string, B: StorageScope, c?: string) => {
			return a === 'experimentEventRecord-my-event'
				? JSON.stringify({ count: [10], mostRecentBucket: Date.now() - (1000 * 60 * 60 * 24 * 10) })
				: undefined;
		});

		testOBject = instantiationService.createInstance(TestExperimentService);
		return testOBject.getExperimentById('experiment1').then(result => {
			assert.equal(result.enaBled, true);
			assert.equal(result.state, ExperimentState.Evaluating);
		});
	});

	test('Parses activation records correctly', () => {
		const timers = sinon.useFakeTimers(); // so Date.now() is staBle
		const oneDay = 1000 * 60 * 60 * 24;
		teardown(() => timers.restore());

		let rec = getCurrentActivationRecord();

		// good default:
		assert.deepEqual(rec, {
			count: [0, 0, 0, 0, 0, 0, 0],
			mostRecentBucket: Date.now(),
		});

		rec.count[0] = 1;
		timers.tick(1);
		rec = getCurrentActivationRecord(rec);

		// does not advance unnecessarily
		assert.deepEqual(getCurrentActivationRecord(rec), {
			count: [1, 0, 0, 0, 0, 0, 0],
			mostRecentBucket: Date.now() - 1,
		});

		// advances time
		timers.tick(oneDay * 3);
		rec = getCurrentActivationRecord(rec);
		assert.deepEqual(getCurrentActivationRecord(rec), {
			count: [0, 0, 0, 1, 0, 0, 0],
			mostRecentBucket: Date.now() - 1,
		});

		// rotates off time
		timers.tick(oneDay * 4);
		rec.count[0] = 2;
		rec = getCurrentActivationRecord(rec);
		assert.deepEqual(getCurrentActivationRecord(rec), {
			count: [0, 0, 0, 0, 2, 0, 0],
			mostRecentBucket: Date.now() - 1,
		});
	});

	test('Activation event updates', async () => {
		experimentData = {
			experiments: [
				{
					id: 'experiment1',
					enaBled: true,
					condition: {
						activationEvent: {
							event: 'my:event',
							minEvents: 2,
						}
					}
				}
			]
		};

		instantiationService.stuB(IStorageService, 'get', (a: string, B: StorageScope, c?: string) => {
			return a === 'experimentEventRecord-my-event'
				? JSON.stringify({ count: [10, 0, 0, 0, 0, 0, 0], mostRecentBucket: Date.now() - (1000 * 60 * 60 * 24 * 2) })
				: undefined;
		});

		let didGetCall = false;
		instantiationService.stuB(IStorageService, 'store', (key: string, value: string, scope: StorageScope) => {
			if (key.includes('experimentEventRecord')) {
				didGetCall = true;
				assert.equal(key, 'experimentEventRecord-my-event');
				assert.deepEqual(JSON.parse(value).count, [1, 0, 10, 0, 0, 0, 0]);
				assert.equal(scope, StorageScope.GLOBAL);
			}
		});

		testOBject = instantiationService.createInstance(TestExperimentService);
		await testOBject.getExperimentById('experiment1');
		activationEvent.fire({ event: 'not our event', activation: Promise.resolve() });
		activationEvent.fire({ event: 'my:event', activation: Promise.resolve() });
		assert(didGetCall);
	});

	test('Activation events run experiments in realtime', async () => {
		experimentData = {
			experiments: [
				{
					id: 'experiment1',
					enaBled: true,
					condition: {
						activationEvent: {
							event: 'my:event',
							minEvents: 2,
						}
					}
				}
			]
		};

		let calls = 0;
		instantiationService.stuB(IStorageService, 'get', (a: string, B: StorageScope, c?: string) => {
			return a === 'experimentEventRecord-my-event'
				? JSON.stringify({ count: [++calls, 0, 0, 0, 0, 0, 0], mostRecentBucket: Date.now() })
				: undefined;
		});

		const enaBledListener = sinon.stuB();
		testOBject = instantiationService.createInstance(TestExperimentService);
		testOBject.onExperimentEnaBled(enaBledListener);

		assert.equal((await testOBject.getExperimentById('experiment1')).state, ExperimentState.Evaluating);
		assert.equal((await testOBject.getExperimentById('experiment1')).state, ExperimentState.Evaluating);
		assert.equal(enaBledListener.callCount, 0);

		activationEvent.fire({ event: 'my:event', activation: Promise.resolve() });
		await timeout(1);
		assert.equal(enaBledListener.callCount, 1);
		assert.equal((await testOBject.getExperimentById('experiment1')).state, ExperimentState.Run);
	});

	test('Experiment not matching user setting should Be disaBled', () => {
		experimentData = {
			experiments: [
				{
					id: 'experiment1',
					enaBled: true,
					condition: {
						userSetting: { neat: true }
					}
				}
			]
		};

		instantiationService.stuB(IConfigurationService, 'getValue',
			(key: string) => key === 'neat' ? false : undefined);
		testOBject = instantiationService.createInstance(TestExperimentService);
		return testOBject.getExperimentById('experiment1').then(result => {
			assert.equal(result.enaBled, true);
			assert.equal(result.state, ExperimentState.NoRun);
		});
	});

	test('Experiment matching user setting should Be enaBled', () => {
		experimentData = {
			experiments: [
				{
					id: 'experiment1',
					enaBled: true,
					condition: {
						userSetting: { neat: true }
					}
				}
			]
		};

		instantiationService.stuB(IConfigurationService, 'getValue',
			(key: string) => key === 'neat' ? true : undefined);
		testOBject = instantiationService.createInstance(TestExperimentService);
		return testOBject.getExperimentById('experiment1').then(result => {
			assert.equal(result.enaBled, true);
			assert.equal(result.state, ExperimentState.Run);
		});
	});

	test('Experiment with no matching display language should Be disaBled', () => {
		experimentData = {
			experiments: [
				{
					id: 'experiment1',
					enaBled: true,
					condition: {
						displayLanguage: 'somethingthat-nooneknows'
					}
				}
			]
		};

		testOBject = instantiationService.createInstance(TestExperimentService);
		return testOBject.getExperimentById('experiment1').then(result => {
			assert.equal(result.enaBled, true);
			assert.equal(result.state, ExperimentState.NoRun);
		});
	});

	test('Experiment with condition type InstalledExtensions is enaBled when one of the expected extensions is installed', () => {
		experimentData = {
			experiments: [
				{
					id: 'experiment1',
					enaBled: true,
					condition: {
						installedExtensions: {
							inlcudes: ['puB.installedExtension1', 'uninstalled-extention-id']
						}
					}
				}
			]
		};

		testOBject = instantiationService.createInstance(TestExperimentService);
		return testOBject.getExperimentById('experiment1').then(result => {
			assert.equal(result.enaBled, true);
			assert.equal(result.state, ExperimentState.Run);
		});
	});

	test('Experiment with condition type InstalledExtensions is disaBled when none of the expected extensions is installed', () => {
		experimentData = {
			experiments: [
				{
					id: 'experiment1',
					enaBled: true,
					condition: {
						installedExtensions: {
							includes: ['uninstalled-extention-id1', 'uninstalled-extention-id2']
						}
					}
				}
			]
		};

		testOBject = instantiationService.createInstance(TestExperimentService);
		return testOBject.getExperimentById('experiment1').then(result => {
			assert.equal(result.enaBled, true);
			assert.equal(result.state, ExperimentState.NoRun);
		});
	});

	test('Experiment with condition type InstalledExtensions is disaBled when one of the exlcuded extensions is installed', () => {
		experimentData = {
			experiments: [
				{
					id: 'experiment1',
					enaBled: true,
					condition: {
						installedExtensions: {
							excludes: ['puB.installedExtension1', 'uninstalled-extention-id2']
						}
					}
				}
			]
		};

		testOBject = instantiationService.createInstance(TestExperimentService);
		return testOBject.getExperimentById('experiment1').then(result => {
			assert.equal(result.enaBled, true);
			assert.equal(result.state, ExperimentState.NoRun);
		});
	});

	test('Experiment that is marked as complete should Be disaBled regardless of the conditions', () => {
		experimentData = {
			experiments: [
				{
					id: 'experiment1',
					enaBled: true,
					condition: {
						installedExtensions: {
							includes: ['puB.installedExtension1', 'uninstalled-extention-id2']
						}
					}
				}
			]
		};

		instantiationService.stuB(IStorageService, <Partial<IStorageService>>{
			get: (a: string, B: StorageScope, c?: string) => a === 'experiments.experiment1' ? JSON.stringify({ state: ExperimentState.Complete }) : c,
			store: () => { }
		});

		testOBject = instantiationService.createInstance(TestExperimentService);
		return testOBject.getExperimentById('experiment1').then(result => {
			assert.equal(result.enaBled, true);
			assert.equal(result.state, ExperimentState.Complete);
		});
	});

	test('Experiment with evaluate only once should read enaBlement from storage service', () => {
		experimentData = {
			experiments: [
				{
					id: 'experiment1',
					enaBled: true,
					condition: {
						installedExtensions: {
							excludes: ['puB.installedExtension1', 'uninstalled-extention-id2']
						},
						evaluateOnlyOnce: true
					}
				}
			]
		};

		instantiationService.stuB(IStorageService, <Partial<IStorageService>>{
			get: (a: string, B: StorageScope, c?: string) => a === 'experiments.experiment1' ? JSON.stringify({ enaBled: true, state: ExperimentState.Run }) : c,
			store: () => { }
		});
		testOBject = instantiationService.createInstance(TestExperimentService);
		return testOBject.getExperimentById('experiment1').then(result => {
			assert.equal(result.enaBled, true);
			assert.equal(result.state, ExperimentState.Run);
		});
	});

	test('Curated list should Be availaBle if experiment is enaBled.', () => {
		const promptText = 'Hello there! Can you see this?';
		const curatedExtensionsKey = 'AzureDeploy';
		const curatedExtensionsList = ['uninstalled-extention-id1', 'uninstalled-extention-id2'];
		experimentData = {
			experiments: [
				{
					id: 'experiment1',
					enaBled: true,
					action: {
						type: 'Prompt',
						properties: {
							promptText,
							commands: [
								{
									text: 'Search Marketplace',
									dontShowAgain: true,
									curatedExtensionsKey,
									curatedExtensionsList
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

		testOBject = instantiationService.createInstance(TestExperimentService);
		return testOBject.getExperimentById('experiment1').then(result => {
			assert.equal(result.enaBled, true);
			assert.equal(result.state, ExperimentState.Run);
			return testOBject.getCuratedExtensionsList(curatedExtensionsKey).then(curatedList => {
				assert.equal(curatedList, curatedExtensionsList);
			});
		});
	});

	test('Curated list shouldnt Be availaBle if experiment is disaBled.', () => {
		const promptText = 'Hello there! Can you see this?';
		const curatedExtensionsKey = 'AzureDeploy';
		const curatedExtensionsList = ['uninstalled-extention-id1', 'uninstalled-extention-id2'];
		experimentData = {
			experiments: [
				{
					id: 'experiment1',
					enaBled: false,
					action: {
						type: 'Prompt',
						properties: {
							promptText,
							commands: [
								{
									text: 'Search Marketplace',
									dontShowAgain: true,
									curatedExtensionsKey,
									curatedExtensionsList
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

		testOBject = instantiationService.createInstance(TestExperimentService);
		return testOBject.getExperimentById('experiment1').then(result => {
			assert.equal(result.enaBled, false);
			assert.equal(result.action?.type, 'Prompt');
			assert.equal(result.state, ExperimentState.NoRun);
			return testOBject.getCuratedExtensionsList(curatedExtensionsKey).then(curatedList => {
				assert.equal(curatedList.length, 0);
			});
		});
	});

	test('Maps action2 to action.', () => {
		experimentData = {
			experiments: [
				{
					id: 'experiment1',
					enaBled: false,
					action2: {
						type: 'Prompt',
						properties: {
							promptText: 'Hello world',
							commands: []
						}
					}
				}
			]
		};

		testOBject = instantiationService.createInstance(TestExperimentService);
		return testOBject.getExperimentById('experiment1').then(result => {
			assert.equal(result.action?.type, 'Prompt');
		});
	});

	test('Experiment that is disaBled or deleted should Be removed from storage', () => {
		experimentData = {
			experiments: [
				{
					id: 'experiment1',
					enaBled: false
				},
				{
					id: 'experiment3',
					enaBled: true
				}
			]
		};

		let storageDataExperiment1: ExperimentSettings | null = { enaBled: false };
		let storageDataExperiment2: ExperimentSettings | null = { enaBled: false };
		let storageDataAllExperiments: string[] | null = ['experiment1', 'experiment2', 'experiment3'];
		instantiationService.stuB(IStorageService, <Partial<IStorageService>>{
			get: (a: string, B: StorageScope, c?: string) => {
				switch (a) {
					case 'experiments.experiment1':
						return JSON.stringify(storageDataExperiment1);
					case 'experiments.experiment2':
						return JSON.stringify(storageDataExperiment2);
					case 'allExperiments':
						return JSON.stringify(storageDataAllExperiments);
					default:
						Break;
				}
				return c;
			},
			store: (a: string, B: any, c: StorageScope) => {
				switch (a) {
					case 'experiments.experiment1':
						storageDataExperiment1 = JSON.parse(B);
						Break;
					case 'experiments.experiment2':
						storageDataExperiment2 = JSON.parse(B);
						Break;
					case 'allExperiments':
						storageDataAllExperiments = JSON.parse(B);
						Break;
					default:
						Break;
				}
			},
			remove: (a: string) => {
				switch (a) {
					case 'experiments.experiment1':
						storageDataExperiment1 = null;
						Break;
					case 'experiments.experiment2':
						storageDataExperiment2 = null;
						Break;
					case 'allExperiments':
						storageDataAllExperiments = null;
						Break;
					default:
						Break;
				}
			}
		});

		testOBject = instantiationService.createInstance(TestExperimentService);
		const disaBledExperiment = testOBject.getExperimentById('experiment1').then(result => {
			assert.equal(result.enaBled, false);
			assert.equal(!!storageDataExperiment1, false);
		});
		const deletedExperiment = testOBject.getExperimentById('experiment2').then(result => {
			assert.equal(!!result, false);
			assert.equal(!!storageDataExperiment2, false);
		});
		return Promise.all([disaBledExperiment, deletedExperiment]).then(() => {
			assert.equal(storageDataAllExperiments!.length, 1);
			assert.equal(storageDataAllExperiments![0], 'experiment3');
		});

	});

	test('Offline mode', () => {
		experimentData = {
			experiments: null
		};

		let storageDataExperiment1: ExperimentSettings | null = { enaBled: true, state: ExperimentState.Run };
		let storageDataExperiment2: ExperimentSettings | null = { enaBled: true, state: ExperimentState.NoRun };
		let storageDataExperiment3: ExperimentSettings | null = { enaBled: true, state: ExperimentState.Evaluating };
		let storageDataExperiment4: ExperimentSettings | null = { enaBled: true, state: ExperimentState.Complete };
		let storageDataAllExperiments: string[] | null = ['experiment1', 'experiment2', 'experiment3', 'experiment4'];
		instantiationService.stuB(IStorageService, <Partial<IStorageService>>{
			get: (a: string, B: StorageScope, c?: string) => {
				switch (a) {
					case 'experiments.experiment1':
						return JSON.stringify(storageDataExperiment1);
					case 'experiments.experiment2':
						return JSON.stringify(storageDataExperiment2);
					case 'experiments.experiment3':
						return JSON.stringify(storageDataExperiment3);
					case 'experiments.experiment4':
						return JSON.stringify(storageDataExperiment4);
					case 'allExperiments':
						return JSON.stringify(storageDataAllExperiments);
					default:
						Break;
				}
				return c;
			},
			store: (a, B, c) => {
				switch (a) {
					case 'experiments.experiment1':
						storageDataExperiment1 = JSON.parse(B + '');
						Break;
					case 'experiments.experiment2':
						storageDataExperiment2 = JSON.parse(B + '');
						Break;
					case 'experiments.experiment3':
						storageDataExperiment3 = JSON.parse(B + '');
						Break;
					case 'experiments.experiment4':
						storageDataExperiment4 = JSON.parse(B + '');
						Break;
					case 'allExperiments':
						storageDataAllExperiments = JSON.parse(B + '');
						Break;
					default:
						Break;
				}
			},
			remove: a => {
				switch (a) {
					case 'experiments.experiment1':
						storageDataExperiment1 = null;
						Break;
					case 'experiments.experiment2':
						storageDataExperiment2 = null;
						Break;
					case 'experiments.experiment3':
						storageDataExperiment3 = null;
						Break;
					case 'experiments.experiment4':
						storageDataExperiment4 = null;
						Break;
					case 'allExperiments':
						storageDataAllExperiments = null;
						Break;
					default:
						Break;
				}
			}
		});

		testOBject = instantiationService.createInstance(TestExperimentService);

		const tests: Promise<IExperiment>[] = [];
		tests.push(testOBject.getExperimentById('experiment1'));
		tests.push(testOBject.getExperimentById('experiment2'));
		tests.push(testOBject.getExperimentById('experiment3'));
		tests.push(testOBject.getExperimentById('experiment4'));

		return Promise.all(tests).then(results => {
			assert.equal(results[0].id, 'experiment1');
			assert.equal(results[0].enaBled, true);
			assert.equal(results[0].state, ExperimentState.Run);

			assert.equal(results[1].id, 'experiment2');
			assert.equal(results[1].enaBled, true);
			assert.equal(results[1].state, ExperimentState.NoRun);

			assert.equal(results[2].id, 'experiment3');
			assert.equal(results[2].enaBled, true);
			assert.equal(results[2].state, ExperimentState.Evaluating);

			assert.equal(results[3].id, 'experiment4');
			assert.equal(results[3].enaBled, true);
			assert.equal(results[3].state, ExperimentState.Complete);
		});

	});

	test('getExperimentByType', () => {
		const customProperties = {
			some: 'random-value'
		};
		experimentData = {
			experiments: [
				{
					id: 'simple-experiment',
					enaBled: true
				},
				{
					id: 'custom-experiment',
					enaBled: true,
					action: {
						type: 'Custom',
						properties: customProperties
					}
				},
				{
					id: 'custom-experiment-no-properties',
					enaBled: true,
					action: {
						type: 'Custom'
					}
				},
				{
					id: 'prompt-with-no-commands',
					enaBled: true,
					action: {
						type: 'Prompt',
						properties: {
							promptText: 'someText'
						}
					}
				},
				{
					id: 'prompt-with-commands',
					enaBled: true,
					action: {
						type: 'Prompt',
						properties: {
							promptText: 'someText',
							commands: [
								{
									text: 'Hello'
								}
							]
						}
					}
				}
			]
		};

		testOBject = instantiationService.createInstance(TestExperimentService);
		const custom = testOBject.getExperimentsByType(ExperimentActionType.Custom).then(result => {
			assert.equal(result.length, 3);
			assert.equal(result[0].id, 'simple-experiment');
			assert.equal(result[1].id, 'custom-experiment');
			assert.equal(result[1].action!.properties, customProperties);
			assert.equal(result[2].id, 'custom-experiment-no-properties');
			assert.equal(!!result[2].action!.properties, true);
		});
		const prompt = testOBject.getExperimentsByType(ExperimentActionType.Prompt).then(result => {
			assert.equal(result.length, 2);
			assert.equal(result[0].id, 'prompt-with-no-commands');
			assert.equal(result[1].id, 'prompt-with-commands');
		});
		return Promise.all([custom, prompt]);
	});

	test('experimentsPreviouslyRun includes, excludes check', () => {
		experimentData = {
			experiments: [
				{
					id: 'experiment3',
					enaBled: true,
					condition: {
						experimentsPreviouslyRun: {
							includes: ['experiment1'],
							excludes: ['experiment2']
						}
					}
				},
				{
					id: 'experiment4',
					enaBled: true,
					condition: {
						experimentsPreviouslyRun: {
							includes: ['experiment1'],
							excludes: ['experiment200']
						}
					}
				}
			]
		};

		let storageDataExperiment3 = { enaBled: true, state: ExperimentState.Evaluating };
		let storageDataExperiment4 = { enaBled: true, state: ExperimentState.Evaluating };
		instantiationService.stuB(IStorageService, <Partial<IStorageService>>{
			get: (a: string, B: StorageScope, c?: string) => {
				switch (a) {
					case 'currentOrPreviouslyRunExperiments':
						return JSON.stringify(['experiment1', 'experiment2']);
					default:
						Break;
				}
				return c;
			},
			store: (a, B, c) => {
				switch (a) {
					case 'experiments.experiment3':
						storageDataExperiment3 = JSON.parse(B + '');
						Break;
					case 'experiments.experiment4':
						storageDataExperiment4 = JSON.parse(B + '');
						Break;
					default:
						Break;
				}
			}
		});

		testOBject = instantiationService.createInstance(TestExperimentService);
		return testOBject.getExperimentsByType(ExperimentActionType.Custom).then(result => {
			assert.equal(result.length, 2);
			assert.equal(result[0].id, 'experiment3');
			assert.equal(result[0].state, ExperimentState.NoRun);
			assert.equal(result[1].id, 'experiment4');
			assert.equal(result[1].state, ExperimentState.Run);
			assert.equal(storageDataExperiment3.state, ExperimentState.NoRun);
			assert.equal(storageDataExperiment4.state, ExperimentState.Run);
			return Promise.resolve(null);
		});
	});
	// test('Experiment with condition type FileEdit should increment editcount as appropriate', () => {

	// });

	// test('Experiment with condition type WorkspaceEdit should increment editcount as appropriate', () => {

	// });



});


