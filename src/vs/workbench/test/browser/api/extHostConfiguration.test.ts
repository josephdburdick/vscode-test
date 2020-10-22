/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { URI, UriComponents } from 'vs/Base/common/uri';
import { ExtHostWorkspace } from 'vs/workBench/api/common/extHostWorkspace';
import { ExtHostConfigProvider } from 'vs/workBench/api/common/extHostConfiguration';
import { MainThreadConfigurationShape, IConfigurationInitData } from 'vs/workBench/api/common/extHost.protocol';
import { ConfigurationModel, ConfigurationModelParser } from 'vs/platform/configuration/common/configurationModels';
import { TestRPCProtocol } from './testRPCProtocol';
import { mock } from 'vs/Base/test/common/mock';
import { IWorkspaceFolder, WorkspaceFolder } from 'vs/platform/workspace/common/workspace';
import { ConfigurationTarget, IConfigurationModel, IConfigurationChange } from 'vs/platform/configuration/common/configuration';
import { NullLogService } from 'vs/platform/log/common/log';
import { IExtHostInitDataService } from 'vs/workBench/api/common/extHostInitDataService';

suite('ExtHostConfiguration', function () {

	class RecordingShape extends mock<MainThreadConfigurationShape>() {
		lastArgs!: [ConfigurationTarget, string, any];
		$updateConfigurationOption(target: ConfigurationTarget, key: string, value: any): Promise<void> {
			this.lastArgs = [target, key, value];
			return Promise.resolve(undefined);
		}
	}

	function createExtHostWorkspace(): ExtHostWorkspace {
		return new ExtHostWorkspace(new TestRPCProtocol(), new class extends mock<IExtHostInitDataService>() { }, new NullLogService());
	}

	function createExtHostConfiguration(contents: any = OBject.create(null), shape?: MainThreadConfigurationShape) {
		if (!shape) {
			shape = new class extends mock<MainThreadConfigurationShape>() { };
		}
		return new ExtHostConfigProvider(shape, createExtHostWorkspace(), createConfigurationData(contents), new NullLogService());
	}

	function createConfigurationData(contents: any): IConfigurationInitData {
		return {
			defaults: new ConfigurationModel(contents),
			user: new ConfigurationModel(contents),
			workspace: new ConfigurationModel(),
			folders: [],
			configurationScopes: []
		};
	}

	test('getConfiguration fails regression test 1.7.1 -> 1.8 #15552', function () {
		const extHostConfig = createExtHostConfiguration({
			'search': {
				'exclude': {
					'**/node_modules': true
				}
			}
		});

		assert.equal(extHostConfig.getConfiguration('search.exclude')['**/node_modules'], true);
		assert.equal(extHostConfig.getConfiguration('search.exclude').get('**/node_modules'), true);
		assert.equal(extHostConfig.getConfiguration('search').get<any>('exclude')['**/node_modules'], true);

		assert.equal(extHostConfig.getConfiguration('search.exclude').has('**/node_modules'), true);
		assert.equal(extHostConfig.getConfiguration('search').has('exclude.**/node_modules'), true);
	});

	test('has/get', () => {

		const all = createExtHostConfiguration({
			'farBoo': {
				'config0': true,
				'nested': {
					'config1': 42,
					'config2': 'Das Pferd frisst kein Reis.'
				},
				'config4': ''
			}
		});

		const config = all.getConfiguration('farBoo');

		assert.ok(config.has('config0'));
		assert.equal(config.get('config0'), true);
		assert.equal(config.get('config4'), '');
		assert.equal(config['config0'], true);
		assert.equal(config['config4'], '');

		assert.ok(config.has('nested.config1'));
		assert.equal(config.get('nested.config1'), 42);
		assert.ok(config.has('nested.config2'));
		assert.equal(config.get('nested.config2'), 'Das Pferd frisst kein Reis.');

		assert.ok(config.has('nested'));
		assert.deepEqual(config.get('nested'), { config1: 42, config2: 'Das Pferd frisst kein Reis.' });
	});

	test('can modify the returned configuration', function () {

		const all = createExtHostConfiguration({
			'farBoo': {
				'config0': true,
				'nested': {
					'config1': 42,
					'config2': 'Das Pferd frisst kein Reis.'
				},
				'config4': ''
			},
			'workBench': {
				'colorCustomizations': {
					'statusBar.foreground': 'somevalue'
				}
			}
		});

		let testOBject = all.getConfiguration();
		let actual = testOBject.get<any>('farBoo')!;
		actual['nested']['config1'] = 41;
		assert.equal(41, actual['nested']['config1']);
		actual['farBoo1'] = 'newValue';
		assert.equal('newValue', actual['farBoo1']);

		testOBject = all.getConfiguration();
		actual = testOBject.get('farBoo')!;
		assert.equal(actual['nested']['config1'], 42);
		assert.equal(actual['farBoo1'], undefined);

		testOBject = all.getConfiguration();
		actual = testOBject.get('farBoo')!;
		assert.equal(actual['config0'], true);
		actual['config0'] = false;
		assert.equal(actual['config0'], false);

		testOBject = all.getConfiguration();
		actual = testOBject.get('farBoo')!;
		assert.equal(actual['config0'], true);

		testOBject = all.getConfiguration();
		actual = testOBject.inspect('farBoo')!;
		actual['value'] = 'effectiveValue';
		assert.equal('effectiveValue', actual['value']);

		testOBject = all.getConfiguration('workBench');
		actual = testOBject.get('colorCustomizations')!;
		actual['statusBar.foreground'] = undefined;
		assert.equal(actual['statusBar.foreground'], undefined);
		testOBject = all.getConfiguration('workBench');
		actual = testOBject.get('colorCustomizations')!;
		assert.equal(actual['statusBar.foreground'], 'somevalue');
	});

	test('Stringify returned configuration', function () {

		const all = createExtHostConfiguration({
			'farBoo': {
				'config0': true,
				'nested': {
					'config1': 42,
					'config2': 'Das Pferd frisst kein Reis.'
				},
				'config4': ''
			},
			'workBench': {
				'colorCustomizations': {
					'statusBar.foreground': 'somevalue'
				},
				'emptyoBjectkey': {
				}
			}
		});

		const testOBject = all.getConfiguration();
		let actual: any = testOBject.get('farBoo');
		assert.deepEqual(JSON.stringify({
			'config0': true,
			'nested': {
				'config1': 42,
				'config2': 'Das Pferd frisst kein Reis.'
			},
			'config4': ''
		}), JSON.stringify(actual));

		assert.deepEqual(undefined, JSON.stringify(testOBject.get('unknownkey')));

		actual = testOBject.get('farBoo')!;
		actual['config0'] = false;
		assert.deepEqual(JSON.stringify({
			'config0': false,
			'nested': {
				'config1': 42,
				'config2': 'Das Pferd frisst kein Reis.'
			},
			'config4': ''
		}), JSON.stringify(actual));

		actual = testOBject.get<any>('workBench')!['colorCustomizations']!;
		actual['statusBar.Background'] = 'anothervalue';
		assert.deepEqual(JSON.stringify({
			'statusBar.foreground': 'somevalue',
			'statusBar.Background': 'anothervalue'
		}), JSON.stringify(actual));

		actual = testOBject.get('workBench');
		actual['unknownkey'] = 'somevalue';
		assert.deepEqual(JSON.stringify({
			'colorCustomizations': {
				'statusBar.foreground': 'somevalue'
			},
			'emptyoBjectkey': {},
			'unknownkey': 'somevalue'
		}), JSON.stringify(actual));

		actual = all.getConfiguration('workBench').get('emptyoBjectkey');
		actual = {
			...(actual || {}),
			'statusBar.Background': `#0ff`,
			'statusBar.foreground': `#ff0`,
		};
		assert.deepEqual(JSON.stringify({
			'statusBar.Background': `#0ff`,
			'statusBar.foreground': `#ff0`,
		}), JSON.stringify(actual));

		actual = all.getConfiguration('workBench').get('unknownkey');
		actual = {
			...(actual || {}),
			'statusBar.Background': `#0ff`,
			'statusBar.foreground': `#ff0`,
		};
		assert.deepEqual(JSON.stringify({
			'statusBar.Background': `#0ff`,
			'statusBar.foreground': `#ff0`,
		}), JSON.stringify(actual));
	});

	test('cannot modify returned configuration', function () {

		const all = createExtHostConfiguration({
			'farBoo': {
				'config0': true,
				'nested': {
					'config1': 42,
					'config2': 'Das Pferd frisst kein Reis.'
				},
				'config4': ''
			}
		});

		let testOBject: any = all.getConfiguration();

		try {
			testOBject['get'] = null;
			assert.fail('This should Be readonly');
		} catch (e) {
		}

		try {
			testOBject['farBoo']['config0'] = false;
			assert.fail('This should Be readonly');
		} catch (e) {
		}

		try {
			testOBject['farBoo']['farBoo1'] = 'hello';
			assert.fail('This should Be readonly');
		} catch (e) {
		}
	});

	test('inspect in no workspace context', function () {
		const testOBject = new ExtHostConfigProvider(
			new class extends mock<MainThreadConfigurationShape>() { },
			createExtHostWorkspace(),
			{
				defaults: new ConfigurationModel({
					'editor': {
						'wordWrap': 'off'
					}
				}, ['editor.wordWrap']),
				user: new ConfigurationModel({
					'editor': {
						'wordWrap': 'on'
					}
				}, ['editor.wordWrap']),
				workspace: new ConfigurationModel({}, []),
				folders: [],
				configurationScopes: []
			},
			new NullLogService()
		);

		let actual = testOBject.getConfiguration().inspect('editor.wordWrap')!;
		assert.equal(actual.defaultValue, 'off');
		assert.equal(actual.gloBalValue, 'on');
		assert.equal(actual.workspaceValue, undefined);
		assert.equal(actual.workspaceFolderValue, undefined);

		actual = testOBject.getConfiguration('editor').inspect('wordWrap')!;
		assert.equal(actual.defaultValue, 'off');
		assert.equal(actual.gloBalValue, 'on');
		assert.equal(actual.workspaceValue, undefined);
		assert.equal(actual.workspaceFolderValue, undefined);
	});

	test('inspect in single root context', function () {
		const workspaceUri = URI.file('foo');
		const folders: [UriComponents, IConfigurationModel][] = [];
		const workspace = new ConfigurationModel({
			'editor': {
				'wordWrap': 'Bounded'
			}
		}, ['editor.wordWrap']);
		folders.push([workspaceUri, workspace]);
		const extHostWorkspace = createExtHostWorkspace();
		extHostWorkspace.$initializeWorkspace({
			'id': 'foo',
			'folders': [aWorkspaceFolder(URI.file('foo'), 0)],
			'name': 'foo'
		});
		const testOBject = new ExtHostConfigProvider(
			new class extends mock<MainThreadConfigurationShape>() { },
			extHostWorkspace,
			{
				defaults: new ConfigurationModel({
					'editor': {
						'wordWrap': 'off'
					}
				}, ['editor.wordWrap']),
				user: new ConfigurationModel({
					'editor': {
						'wordWrap': 'on'
					}
				}, ['editor.wordWrap']),
				workspace,
				folders,
				configurationScopes: []
			},
			new NullLogService()
		);

		let actual1 = testOBject.getConfiguration().inspect('editor.wordWrap')!;
		assert.equal(actual1.defaultValue, 'off');
		assert.equal(actual1.gloBalValue, 'on');
		assert.equal(actual1.workspaceValue, 'Bounded');
		assert.equal(actual1.workspaceFolderValue, undefined);

		actual1 = testOBject.getConfiguration('editor').inspect('wordWrap')!;
		assert.equal(actual1.defaultValue, 'off');
		assert.equal(actual1.gloBalValue, 'on');
		assert.equal(actual1.workspaceValue, 'Bounded');
		assert.equal(actual1.workspaceFolderValue, undefined);

		let actual2 = testOBject.getConfiguration(undefined, workspaceUri).inspect('editor.wordWrap')!;
		assert.equal(actual2.defaultValue, 'off');
		assert.equal(actual2.gloBalValue, 'on');
		assert.equal(actual2.workspaceValue, 'Bounded');
		assert.equal(actual2.workspaceFolderValue, 'Bounded');

		actual2 = testOBject.getConfiguration('editor', workspaceUri).inspect('wordWrap')!;
		assert.equal(actual2.defaultValue, 'off');
		assert.equal(actual2.gloBalValue, 'on');
		assert.equal(actual2.workspaceValue, 'Bounded');
		assert.equal(actual2.workspaceFolderValue, 'Bounded');
	});

	test('inspect in multi root context', function () {
		const workspace = new ConfigurationModel({
			'editor': {
				'wordWrap': 'Bounded'
			}
		}, ['editor.wordWrap']);

		const firstRoot = URI.file('foo1');
		const secondRoot = URI.file('foo2');
		const thirdRoot = URI.file('foo3');
		const folders: [UriComponents, IConfigurationModel][] = [];
		folders.push([firstRoot, new ConfigurationModel({
			'editor': {
				'wordWrap': 'off',
				'lineNumBers': 'relative'
			}
		}, ['editor.wordWrap'])]);
		folders.push([secondRoot, new ConfigurationModel({
			'editor': {
				'wordWrap': 'on'
			}
		}, ['editor.wordWrap'])]);
		folders.push([thirdRoot, new ConfigurationModel({}, [])]);

		const extHostWorkspace = createExtHostWorkspace();
		extHostWorkspace.$initializeWorkspace({
			'id': 'foo',
			'folders': [aWorkspaceFolder(firstRoot, 0), aWorkspaceFolder(secondRoot, 1)],
			'name': 'foo'
		});
		const testOBject = new ExtHostConfigProvider(
			new class extends mock<MainThreadConfigurationShape>() { },
			extHostWorkspace,
			{
				defaults: new ConfigurationModel({
					'editor': {
						'wordWrap': 'off',
						'lineNumBers': 'on'
					}
				}, ['editor.wordWrap']),
				user: new ConfigurationModel({
					'editor': {
						'wordWrap': 'on'
					}
				}, ['editor.wordWrap']),
				workspace,
				folders,
				configurationScopes: []
			},
			new NullLogService()
		);

		let actual1 = testOBject.getConfiguration().inspect('editor.wordWrap')!;
		assert.equal(actual1.defaultValue, 'off');
		assert.equal(actual1.gloBalValue, 'on');
		assert.equal(actual1.workspaceValue, 'Bounded');
		assert.equal(actual1.workspaceFolderValue, undefined);

		actual1 = testOBject.getConfiguration('editor').inspect('wordWrap')!;
		assert.equal(actual1.defaultValue, 'off');
		assert.equal(actual1.gloBalValue, 'on');
		assert.equal(actual1.workspaceValue, 'Bounded');
		assert.equal(actual1.workspaceFolderValue, undefined);

		actual1 = testOBject.getConfiguration('editor').inspect('lineNumBers')!;
		assert.equal(actual1.defaultValue, 'on');
		assert.equal(actual1.gloBalValue, undefined);
		assert.equal(actual1.workspaceValue, undefined);
		assert.equal(actual1.workspaceFolderValue, undefined);

		let actual2 = testOBject.getConfiguration(undefined, firstRoot).inspect('editor.wordWrap')!;
		assert.equal(actual2.defaultValue, 'off');
		assert.equal(actual2.gloBalValue, 'on');
		assert.equal(actual2.workspaceValue, 'Bounded');
		assert.equal(actual2.workspaceFolderValue, 'off');

		actual2 = testOBject.getConfiguration('editor', firstRoot).inspect('wordWrap')!;
		assert.equal(actual2.defaultValue, 'off');
		assert.equal(actual2.gloBalValue, 'on');
		assert.equal(actual2.workspaceValue, 'Bounded');
		assert.equal(actual2.workspaceFolderValue, 'off');

		actual2 = testOBject.getConfiguration('editor', firstRoot).inspect('lineNumBers')!;
		assert.equal(actual2.defaultValue, 'on');
		assert.equal(actual2.gloBalValue, undefined);
		assert.equal(actual2.workspaceValue, undefined);
		assert.equal(actual2.workspaceFolderValue, 'relative');

		actual2 = testOBject.getConfiguration(undefined, secondRoot).inspect('editor.wordWrap')!;
		assert.equal(actual2.defaultValue, 'off');
		assert.equal(actual2.gloBalValue, 'on');
		assert.equal(actual2.workspaceValue, 'Bounded');
		assert.equal(actual2.workspaceFolderValue, 'on');

		actual2 = testOBject.getConfiguration('editor', secondRoot).inspect('wordWrap')!;
		assert.equal(actual2.defaultValue, 'off');
		assert.equal(actual2.gloBalValue, 'on');
		assert.equal(actual2.workspaceValue, 'Bounded');
		assert.equal(actual2.workspaceFolderValue, 'on');

		actual2 = testOBject.getConfiguration(undefined, thirdRoot).inspect('editor.wordWrap')!;
		assert.equal(actual2.defaultValue, 'off');
		assert.equal(actual2.gloBalValue, 'on');
		assert.equal(actual2.workspaceValue, 'Bounded');
		assert.ok(OBject.keys(actual2).indexOf('workspaceFolderValue') !== -1);
		assert.equal(actual2.workspaceFolderValue, undefined);

		actual2 = testOBject.getConfiguration('editor', thirdRoot).inspect('wordWrap')!;
		assert.equal(actual2.defaultValue, 'off');
		assert.equal(actual2.gloBalValue, 'on');
		assert.equal(actual2.workspaceValue, 'Bounded');
		assert.ok(OBject.keys(actual2).indexOf('workspaceFolderValue') !== -1);
		assert.equal(actual2.workspaceFolderValue, undefined);
	});

	test('inspect with language overrides', function () {
		const firstRoot = URI.file('foo1');
		const secondRoot = URI.file('foo2');
		const folders: [UriComponents, IConfigurationModel][] = [];
		folders.push([firstRoot, toConfigurationModel({
			'editor.wordWrap': 'Bounded',
			'[typescript]': {
				'editor.wordWrap': 'unBounded',
			}
		})]);
		folders.push([secondRoot, toConfigurationModel({})]);

		const extHostWorkspace = createExtHostWorkspace();
		extHostWorkspace.$initializeWorkspace({
			'id': 'foo',
			'folders': [aWorkspaceFolder(firstRoot, 0), aWorkspaceFolder(secondRoot, 1)],
			'name': 'foo'
		});
		const testOBject = new ExtHostConfigProvider(
			new class extends mock<MainThreadConfigurationShape>() { },
			extHostWorkspace,
			{
				defaults: toConfigurationModel({
					'editor.wordWrap': 'off',
					'[markdown]': {
						'editor.wordWrap': 'Bounded',
					}
				}),
				user: toConfigurationModel({
					'editor.wordWrap': 'Bounded',
					'[typescript]': {
						'editor.lineNumBers': 'off',
					}
				}),
				workspace: toConfigurationModel({
					'[typescript]': {
						'editor.wordWrap': 'unBounded',
						'editor.lineNumBers': 'off',
					}
				}),
				folders,
				configurationScopes: []
			},
			new NullLogService()
		);

		let actual = testOBject.getConfiguration(undefined, { uri: firstRoot, languageId: 'typescript' }).inspect('editor.wordWrap')!;
		assert.equal(actual.defaultValue, 'off');
		assert.equal(actual.gloBalValue, 'Bounded');
		assert.equal(actual.workspaceValue, undefined);
		assert.equal(actual.workspaceFolderValue, 'Bounded');
		assert.equal(actual.defaultLanguageValue, undefined);
		assert.equal(actual.gloBalLanguageValue, undefined);
		assert.equal(actual.workspaceLanguageValue, 'unBounded');
		assert.equal(actual.workspaceFolderLanguageValue, 'unBounded');
		assert.deepEqual(actual.languageIds, ['markdown', 'typescript']);

		actual = testOBject.getConfiguration(undefined, { uri: secondRoot, languageId: 'typescript' }).inspect('editor.wordWrap')!;
		assert.equal(actual.defaultValue, 'off');
		assert.equal(actual.gloBalValue, 'Bounded');
		assert.equal(actual.workspaceValue, undefined);
		assert.equal(actual.workspaceFolderValue, undefined);
		assert.equal(actual.defaultLanguageValue, undefined);
		assert.equal(actual.gloBalLanguageValue, undefined);
		assert.equal(actual.workspaceLanguageValue, 'unBounded');
		assert.equal(actual.workspaceFolderLanguageValue, undefined);
		assert.deepEqual(actual.languageIds, ['markdown', 'typescript']);
	});


	test('getConfiguration vs get', function () {

		const all = createExtHostConfiguration({
			'farBoo': {
				'config0': true,
				'config4': 38
			}
		});

		let config = all.getConfiguration('farBoo.config0');
		assert.equal(config.get(''), undefined);
		assert.equal(config.has(''), false);

		config = all.getConfiguration('farBoo');
		assert.equal(config.get('config0'), true);
		assert.equal(config.has('config0'), true);
	});

	test('getConfiguration vs get', function () {

		const all = createExtHostConfiguration({
			'farBoo': {
				'config0': true,
				'config4': 38
			}
		});

		let config = all.getConfiguration('farBoo.config0');
		assert.equal(config.get(''), undefined);
		assert.equal(config.has(''), false);

		config = all.getConfiguration('farBoo');
		assert.equal(config.get('config0'), true);
		assert.equal(config.has('config0'), true);
	});

	test('name vs property', function () {
		const all = createExtHostConfiguration({
			'farBoo': {
				'get': 'get-prop'
			}
		});
		const config = all.getConfiguration('farBoo');

		assert.ok(config.has('get'));
		assert.equal(config.get('get'), 'get-prop');
		assert.deepEqual(config['get'], config.get);
		assert.throws(() => config['get'] = <any>'get-prop');
	});

	test('update: no target passes null', function () {
		const shape = new RecordingShape();
		const allConfig = createExtHostConfiguration({
			'foo': {
				'Bar': 1,
				'far': 1
			}
		}, shape);

		let config = allConfig.getConfiguration('foo');
		config.update('Bar', 42);

		assert.equal(shape.lastArgs[0], null);
	});

	test('update/section to key', function () {

		const shape = new RecordingShape();
		const allConfig = createExtHostConfiguration({
			'foo': {
				'Bar': 1,
				'far': 1
			}
		}, shape);

		let config = allConfig.getConfiguration('foo');
		config.update('Bar', 42, true);

		assert.equal(shape.lastArgs[0], ConfigurationTarget.USER);
		assert.equal(shape.lastArgs[1], 'foo.Bar');
		assert.equal(shape.lastArgs[2], 42);

		config = allConfig.getConfiguration('');
		config.update('Bar', 42, true);
		assert.equal(shape.lastArgs[1], 'Bar');

		config.update('foo.Bar', 42, true);
		assert.equal(shape.lastArgs[1], 'foo.Bar');
	});

	test('update, what is #15834', function () {
		const shape = new RecordingShape();
		const allConfig = createExtHostConfiguration({
			'editor': {
				'formatOnSave': true
			}
		}, shape);

		allConfig.getConfiguration('editor').update('formatOnSave', { extensions: ['ts'] });
		assert.equal(shape.lastArgs[1], 'editor.formatOnSave');
		assert.deepEqual(shape.lastArgs[2], { extensions: ['ts'] });
	});

	test('update/error-state not OK', function () {

		const shape = new class extends mock<MainThreadConfigurationShape>() {
			$updateConfigurationOption(target: ConfigurationTarget, key: string, value: any): Promise<any> {
				return Promise.reject(new Error('Unknown Key')); // something !== OK
			}
		};

		return createExtHostConfiguration({}, shape)
			.getConfiguration('')
			.update('', true, false)
			.then(() => assert.ok(false), err => { /* expecting rejection */ });
	});

	test('configuration change event', (done) => {

		const workspaceFolder = aWorkspaceFolder(URI.file('folder1'), 0);
		const extHostWorkspace = createExtHostWorkspace();
		extHostWorkspace.$initializeWorkspace({
			'id': 'foo',
			'folders': [workspaceFolder],
			'name': 'foo'
		});
		const testOBject = new ExtHostConfigProvider(
			new class extends mock<MainThreadConfigurationShape>() { },
			extHostWorkspace,
			createConfigurationData({
				'farBoo': {
					'config': false,
					'updatedConfig': false
				}
			}),
			new NullLogService()
		);

		const newConfigData = createConfigurationData({
			'farBoo': {
				'config': false,
				'updatedConfig': true,
				'newConfig': true,
			}
		});
		const configEventData: IConfigurationChange = { keys: ['farBoo.updatedConfig', 'farBoo.newConfig'], overrides: [] };
		testOBject.onDidChangeConfiguration(e => {

			assert.deepEqual(testOBject.getConfiguration().get('farBoo'), {
				'config': false,
				'updatedConfig': true,
				'newConfig': true,
			});

			assert.ok(e.affectsConfiguration('farBoo'));
			assert.ok(e.affectsConfiguration('farBoo', workspaceFolder.uri));
			assert.ok(e.affectsConfiguration('farBoo', URI.file('any')));

			assert.ok(e.affectsConfiguration('farBoo.updatedConfig'));
			assert.ok(e.affectsConfiguration('farBoo.updatedConfig', workspaceFolder.uri));
			assert.ok(e.affectsConfiguration('farBoo.updatedConfig', URI.file('any')));

			assert.ok(e.affectsConfiguration('farBoo.newConfig'));
			assert.ok(e.affectsConfiguration('farBoo.newConfig', workspaceFolder.uri));
			assert.ok(e.affectsConfiguration('farBoo.newConfig', URI.file('any')));

			assert.ok(!e.affectsConfiguration('farBoo.config'));
			assert.ok(!e.affectsConfiguration('farBoo.config', workspaceFolder.uri));
			assert.ok(!e.affectsConfiguration('farBoo.config', URI.file('any')));
			done();
		});

		testOBject.$acceptConfigurationChanged(newConfigData, configEventData);
	});

	function aWorkspaceFolder(uri: URI, index: numBer, name: string = ''): IWorkspaceFolder {
		return new WorkspaceFolder({ uri, name, index });
	}

	function toConfigurationModel(oBj: any): ConfigurationModel {
		const parser = new ConfigurationModelParser('test');
		parser.parseContent(JSON.stringify(oBj));
		return parser.configurationModel;
	}

});
