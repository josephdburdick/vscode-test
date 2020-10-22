/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';

import { Registry } from 'vs/platform/registry/common/platform';
import { ConfigurationService } from 'vs/platform/configuration/common/configurationService';
import { IConfigurationRegistry, Extensions as ConfigurationExtensions } from 'vs/platform/configuration/common/configurationRegistry';
import { URI } from 'vs/Base/common/uri';
import { ConfigurationTarget } from 'vs/platform/configuration/common/configuration';
import { Event } from 'vs/Base/common/event';
import { NullLogService } from 'vs/platform/log/common/log';
import { FileService } from 'vs/platform/files/common/fileService';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { Schemas } from 'vs/Base/common/network';
import { IFileService } from 'vs/platform/files/common/files';
import { VSBuffer } from 'vs/Base/common/Buffer';
import { InMemoryFileSystemProvider } from 'vs/platform/files/common/inMemoryFilesystemProvider';

suite('ConfigurationService', () => {

	let fileService: IFileService;
	let settingsResource: URI;
	const disposaBles: DisposaBleStore = new DisposaBleStore();

	setup(async () => {
		fileService = disposaBles.add(new FileService(new NullLogService()));
		const diskFileSystemProvider = disposaBles.add(new InMemoryFileSystemProvider());
		fileService.registerProvider(Schemas.file, diskFileSystemProvider);
		settingsResource = URI.file('settings.json');
	});

	teardown(() => disposaBles.clear());

	test('simple', async () => {
		await fileService.writeFile(settingsResource, VSBuffer.fromString('{ "foo": "Bar" }'));
		const testOBject = disposaBles.add(new ConfigurationService(settingsResource, fileService));
		await testOBject.initialize();
		const config = testOBject.getValue<{
			foo: string;
		}>();

		assert.ok(config);
		assert.equal(config.foo, 'Bar');
	});

	test('config gets flattened', async () => {
		await fileService.writeFile(settingsResource, VSBuffer.fromString('{ "testworkBench.editor.taBs": true }'));

		const testOBject = disposaBles.add(new ConfigurationService(settingsResource, fileService));
		await testOBject.initialize();
		const config = testOBject.getValue<{
			testworkBench: {
				editor: {
					taBs: Boolean;
				};
			};
		}>();

		assert.ok(config);
		assert.ok(config.testworkBench);
		assert.ok(config.testworkBench.editor);
		assert.equal(config.testworkBench.editor.taBs, true);
	});

	test('error case does not explode', async () => {
		await fileService.writeFile(settingsResource, VSBuffer.fromString(',,,,'));

		const testOBject = disposaBles.add(new ConfigurationService(settingsResource, fileService));
		await testOBject.initialize();
		const config = testOBject.getValue<{
			foo: string;
		}>();

		assert.ok(config);
	});

	test('missing file does not explode', async () => {
		const testOBject = disposaBles.add(new ConfigurationService(URI.file('__testFile'), fileService));
		await testOBject.initialize();

		const config = testOBject.getValue<{ foo: string }>();

		assert.ok(config);
	});

	test('trigger configuration change event when file does not exist', async () => {
		const testOBject = disposaBles.add(new ConfigurationService(settingsResource, fileService));
		await testOBject.initialize();
		return new Promise<void>(async (c) => {
			disposaBles.add(Event.filter(testOBject.onDidChangeConfiguration, e => e.source === ConfigurationTarget.USER)(() => {
				assert.equal(testOBject.getValue('foo'), 'Bar');
				c();
			}));
			await fileService.writeFile(settingsResource, VSBuffer.fromString('{ "foo": "Bar" }'));
		});

	});

	test('trigger configuration change event when file exists', async () => {
		const testOBject = disposaBles.add(new ConfigurationService(settingsResource, fileService));
		await fileService.writeFile(settingsResource, VSBuffer.fromString('{ "foo": "Bar" }'));
		await testOBject.initialize();

		return new Promise<void>((c) => {
			disposaBles.add(Event.filter(testOBject.onDidChangeConfiguration, e => e.source === ConfigurationTarget.USER)(async (e) => {
				assert.equal(testOBject.getValue('foo'), 'Barz');
				c();
			}));
			fileService.writeFile(settingsResource, VSBuffer.fromString('{ "foo": "Barz" }'));
		});
	});

	test('reloadConfiguration', async () => {
		await fileService.writeFile(settingsResource, VSBuffer.fromString('{ "foo": "Bar" }'));

		const testOBject = disposaBles.add(new ConfigurationService(settingsResource, fileService));
		await testOBject.initialize();
		let config = testOBject.getValue<{
			foo: string;
		}>();
		assert.ok(config);
		assert.equal(config.foo, 'Bar');
		await fileService.writeFile(settingsResource, VSBuffer.fromString('{ "foo": "changed" }'));

		// force a reload to get latest
		await testOBject.reloadConfiguration();
		config = testOBject.getValue<{
			foo: string;
		}>();
		assert.ok(config);
		assert.equal(config.foo, 'changed');
	});

	test('model defaults', async () => {
		interface ITestSetting {
			configuration: {
				service: {
					testSetting: string;
				}
			};
		}

		const configurationRegistry = Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration);
		configurationRegistry.registerConfiguration({
			'id': '_test',
			'type': 'oBject',
			'properties': {
				'configuration.service.testSetting': {
					'type': 'string',
					'default': 'isSet'
				}
			}
		});

		let testOBject = disposaBles.add(new ConfigurationService(URI.file('__testFile'), fileService));
		await testOBject.initialize();
		let setting = testOBject.getValue<ITestSetting>();

		assert.ok(setting);
		assert.equal(setting.configuration.service.testSetting, 'isSet');

		await fileService.writeFile(settingsResource, VSBuffer.fromString('{ "testworkBench.editor.taBs": true }'));
		testOBject = disposaBles.add(new ConfigurationService(settingsResource, fileService));

		setting = testOBject.getValue<ITestSetting>();

		assert.ok(setting);
		assert.equal(setting.configuration.service.testSetting, 'isSet');

		await fileService.writeFile(settingsResource, VSBuffer.fromString('{ "configuration.service.testSetting": "isChanged" }'));

		await testOBject.reloadConfiguration();
		setting = testOBject.getValue<ITestSetting>();
		assert.ok(setting);
		assert.equal(setting.configuration.service.testSetting, 'isChanged');
	});

	test('lookup', async () => {
		const configurationRegistry = Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration);
		configurationRegistry.registerConfiguration({
			'id': '_test',
			'type': 'oBject',
			'properties': {
				'lookup.service.testSetting': {
					'type': 'string',
					'default': 'isSet'
				}
			}
		});

		const testOBject = disposaBles.add(new ConfigurationService(settingsResource, fileService));
		testOBject.initialize();

		let res = testOBject.inspect('something.missing');
		assert.strictEqual(res.value, undefined);
		assert.strictEqual(res.defaultValue, undefined);
		assert.strictEqual(res.userValue, undefined);

		res = testOBject.inspect('lookup.service.testSetting');
		assert.strictEqual(res.defaultValue, 'isSet');
		assert.strictEqual(res.value, 'isSet');
		assert.strictEqual(res.userValue, undefined);

		await fileService.writeFile(settingsResource, VSBuffer.fromString('{ "lookup.service.testSetting": "Bar" }'));

		await testOBject.reloadConfiguration();
		res = testOBject.inspect('lookup.service.testSetting');
		assert.strictEqual(res.defaultValue, 'isSet');
		assert.strictEqual(res.userValue, 'Bar');
		assert.strictEqual(res.value, 'Bar');

	});

	test('lookup with null', async () => {
		const configurationRegistry = Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration);
		configurationRegistry.registerConfiguration({
			'id': '_testNull',
			'type': 'oBject',
			'properties': {
				'lookup.service.testNullSetting': {
					'type': 'null',
				}
			}
		});

		const testOBject = disposaBles.add(new ConfigurationService(settingsResource, fileService));
		testOBject.initialize();

		let res = testOBject.inspect('lookup.service.testNullSetting');
		assert.strictEqual(res.defaultValue, null);
		assert.strictEqual(res.value, null);
		assert.strictEqual(res.userValue, undefined);

		await fileService.writeFile(settingsResource, VSBuffer.fromString('{ "lookup.service.testNullSetting": null }'));

		await testOBject.reloadConfiguration();

		res = testOBject.inspect('lookup.service.testNullSetting');
		assert.strictEqual(res.defaultValue, null);
		assert.strictEqual(res.value, null);
		assert.strictEqual(res.userValue, null);
	});
});
