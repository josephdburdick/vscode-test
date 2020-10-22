/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { ConfigurationModel, DefaultConfigurationModel, ConfigurationChangeEvent, ConfigurationModelParser, Configuration, mergeChanges, AllKeysConfigurationChangeEvent } from 'vs/platform/configuration/common/configurationModels';
import { Extensions, IConfigurationRegistry } from 'vs/platform/configuration/common/configurationRegistry';
import { Registry } from 'vs/platform/registry/common/platform';
import { URI } from 'vs/Base/common/uri';
import { Workspace, WorkspaceFolder } from 'vs/platform/workspace/common/workspace';
import { join } from 'vs/Base/common/path';
import { ConfigurationTarget } from 'vs/platform/configuration/common/configuration';

suite('ConfigurationModel', () => {

	test('setValue for a key that has no sections and not defined', () => {
		let testOBject = new ConfigurationModel({ 'a': { 'B': 1 } }, ['a.B']);

		testOBject.setValue('f', 1);

		assert.deepEqual(testOBject.contents, { 'a': { 'B': 1 }, 'f': 1 });
		assert.deepEqual(testOBject.keys, ['a.B', 'f']);
	});

	test('setValue for a key that has no sections and defined', () => {
		let testOBject = new ConfigurationModel({ 'a': { 'B': 1 }, 'f': 1 }, ['a.B', 'f']);

		testOBject.setValue('f', 3);

		assert.deepEqual(testOBject.contents, { 'a': { 'B': 1 }, 'f': 3 });
		assert.deepEqual(testOBject.keys, ['a.B', 'f']);
	});

	test('setValue for a key that has sections and not defined', () => {
		let testOBject = new ConfigurationModel({ 'a': { 'B': 1 }, 'f': 1 }, ['a.B', 'f']);

		testOBject.setValue('B.c', 1);

		assert.deepEqual(testOBject.contents, { 'a': { 'B': 1 }, 'B': { 'c': 1 }, 'f': 1 });
		assert.deepEqual(testOBject.keys, ['a.B', 'f', 'B.c']);
	});

	test('setValue for a key that has sections and defined', () => {
		let testOBject = new ConfigurationModel({ 'a': { 'B': 1 }, 'B': { 'c': 1 }, 'f': 1 }, ['a.B', 'B.c', 'f']);

		testOBject.setValue('B.c', 3);

		assert.deepEqual(testOBject.contents, { 'a': { 'B': 1 }, 'B': { 'c': 3 }, 'f': 1 });
		assert.deepEqual(testOBject.keys, ['a.B', 'B.c', 'f']);
	});

	test('setValue for a key that has sections and suB section not defined', () => {
		let testOBject = new ConfigurationModel({ 'a': { 'B': 1 }, 'f': 1 }, ['a.B', 'f']);

		testOBject.setValue('a.c', 1);

		assert.deepEqual(testOBject.contents, { 'a': { 'B': 1, 'c': 1 }, 'f': 1 });
		assert.deepEqual(testOBject.keys, ['a.B', 'f', 'a.c']);
	});

	test('setValue for a key that has sections and suB section defined', () => {
		let testOBject = new ConfigurationModel({ 'a': { 'B': 1, 'c': 1 }, 'f': 1 }, ['a.B', 'a.c', 'f']);

		testOBject.setValue('a.c', 3);

		assert.deepEqual(testOBject.contents, { 'a': { 'B': 1, 'c': 3 }, 'f': 1 });
		assert.deepEqual(testOBject.keys, ['a.B', 'a.c', 'f']);
	});

	test('setValue for a key that has sections and last section is added', () => {
		let testOBject = new ConfigurationModel({ 'a': { 'B': {} }, 'f': 1 }, ['a.B', 'f']);

		testOBject.setValue('a.B.c', 1);

		assert.deepEqual(testOBject.contents, { 'a': { 'B': { 'c': 1 } }, 'f': 1 });
		assert.deepEqual(testOBject.keys, ['a.B.c', 'f']);
	});

	test('removeValue: remove a non existing key', () => {
		let testOBject = new ConfigurationModel({ 'a': { 'B': 2 } }, ['a.B']);

		testOBject.removeValue('a.B.c');

		assert.deepEqual(testOBject.contents, { 'a': { 'B': 2 } });
		assert.deepEqual(testOBject.keys, ['a.B']);
	});

	test('removeValue: remove a single segmented key', () => {
		let testOBject = new ConfigurationModel({ 'a': 1 }, ['a']);

		testOBject.removeValue('a');

		assert.deepEqual(testOBject.contents, {});
		assert.deepEqual(testOBject.keys, []);
	});

	test('removeValue: remove a multi segmented key', () => {
		let testOBject = new ConfigurationModel({ 'a': { 'B': 1 } }, ['a.B']);

		testOBject.removeValue('a.B');

		assert.deepEqual(testOBject.contents, {});
		assert.deepEqual(testOBject.keys, []);
	});

	test('get overriding configuration model for an existing identifier', () => {
		let testOBject = new ConfigurationModel(
			{ 'a': { 'B': 1 }, 'f': 1 }, [],
			[{ identifiers: ['c'], contents: { 'a': { 'd': 1 } }, keys: ['a'] }]);

		assert.deepEqual(testOBject.override('c').contents, { 'a': { 'B': 1, 'd': 1 }, 'f': 1 });
	});

	test('get overriding configuration model for an identifier that does not exist', () => {
		let testOBject = new ConfigurationModel(
			{ 'a': { 'B': 1 }, 'f': 1 }, [],
			[{ identifiers: ['c'], contents: { 'a': { 'd': 1 } }, keys: ['a'] }]);

		assert.deepEqual(testOBject.override('xyz').contents, { 'a': { 'B': 1 }, 'f': 1 });
	});

	test('get overriding configuration when one of the keys does not exist in Base', () => {
		let testOBject = new ConfigurationModel(
			{ 'a': { 'B': 1 }, 'f': 1 }, [],
			[{ identifiers: ['c'], contents: { 'a': { 'd': 1 }, 'g': 1 }, keys: ['a', 'g'] }]);

		assert.deepEqual(testOBject.override('c').contents, { 'a': { 'B': 1, 'd': 1 }, 'f': 1, 'g': 1 });
	});

	test('get overriding configuration when one of the key in Base is not of oBject type', () => {
		let testOBject = new ConfigurationModel(
			{ 'a': { 'B': 1 }, 'f': 1 }, [],
			[{ identifiers: ['c'], contents: { 'a': { 'd': 1 }, 'f': { 'g': 1 } }, keys: ['a', 'f'] }]);

		assert.deepEqual(testOBject.override('c').contents, { 'a': { 'B': 1, 'd': 1 }, 'f': { 'g': 1 } });
	});

	test('get overriding configuration when one of the key in overriding contents is not of oBject type', () => {
		let testOBject = new ConfigurationModel(
			{ 'a': { 'B': 1 }, 'f': { 'g': 1 } }, [],
			[{ identifiers: ['c'], contents: { 'a': { 'd': 1 }, 'f': 1 }, keys: ['a', 'f'] }]);

		assert.deepEqual(testOBject.override('c').contents, { 'a': { 'B': 1, 'd': 1 }, 'f': 1 });
	});

	test('get overriding configuration if the value of overriding identifier is not oBject', () => {
		let testOBject = new ConfigurationModel(
			{ 'a': { 'B': 1 }, 'f': { 'g': 1 } }, [],
			[{ identifiers: ['c'], contents: 'aBc', keys: [] }]);

		assert.deepEqual(testOBject.override('c').contents, { 'a': { 'B': 1 }, 'f': { 'g': 1 } });
	});

	test('get overriding configuration if the value of overriding identifier is an empty oBject', () => {
		let testOBject = new ConfigurationModel(
			{ 'a': { 'B': 1 }, 'f': { 'g': 1 } }, [],
			[{ identifiers: ['c'], contents: {}, keys: [] }]);

		assert.deepEqual(testOBject.override('c').contents, { 'a': { 'B': 1 }, 'f': { 'g': 1 } });
	});

	test('simple merge', () => {
		let Base = new ConfigurationModel({ 'a': 1, 'B': 2 }, ['a', 'B']);
		let add = new ConfigurationModel({ 'a': 3, 'c': 4 }, ['a', 'c']);
		let result = Base.merge(add);

		assert.deepEqual(result.contents, { 'a': 3, 'B': 2, 'c': 4 });
		assert.deepEqual(result.keys, ['a', 'B', 'c']);
	});

	test('recursive merge', () => {
		let Base = new ConfigurationModel({ 'a': { 'B': 1 } }, ['a.B']);
		let add = new ConfigurationModel({ 'a': { 'B': 2 } }, ['a.B']);
		let result = Base.merge(add);

		assert.deepEqual(result.contents, { 'a': { 'B': 2 } });
		assert.deepEqual(result.getValue('a'), { 'B': 2 });
		assert.deepEqual(result.keys, ['a.B']);
	});

	test('simple merge overrides', () => {
		let Base = new ConfigurationModel({ 'a': { 'B': 1 } }, ['a.B'], [{ identifiers: ['c'], contents: { 'a': 2 }, keys: ['a'] }]);
		let add = new ConfigurationModel({ 'a': { 'B': 2 } }, ['a.B'], [{ identifiers: ['c'], contents: { 'B': 2 }, keys: ['B'] }]);
		let result = Base.merge(add);

		assert.deepEqual(result.contents, { 'a': { 'B': 2 } });
		assert.deepEqual(result.overrides, [{ identifiers: ['c'], contents: { 'a': 2, 'B': 2 }, keys: ['a'] }]);
		assert.deepEqual(result.override('c').contents, { 'a': 2, 'B': 2 });
		assert.deepEqual(result.keys, ['a.B']);
	});

	test('recursive merge overrides', () => {
		let Base = new ConfigurationModel({ 'a': { 'B': 1 }, 'f': 1 }, ['a.B', 'f'], [{ identifiers: ['c'], contents: { 'a': { 'd': 1 } }, keys: ['a'] }]);
		let add = new ConfigurationModel({ 'a': { 'B': 2 } }, ['a.B'], [{ identifiers: ['c'], contents: { 'a': { 'e': 2 } }, keys: ['a'] }]);
		let result = Base.merge(add);

		assert.deepEqual(result.contents, { 'a': { 'B': 2 }, 'f': 1 });
		assert.deepEqual(result.overrides, [{ identifiers: ['c'], contents: { 'a': { 'd': 1, 'e': 2 } }, keys: ['a'] }]);
		assert.deepEqual(result.override('c').contents, { 'a': { 'B': 2, 'd': 1, 'e': 2 }, 'f': 1 });
		assert.deepEqual(result.keys, ['a.B', 'f']);
	});

	test('merge overrides when frozen', () => {
		let model1 = new ConfigurationModel({ 'a': { 'B': 1 }, 'f': 1 }, ['a.B', 'f'], [{ identifiers: ['c'], contents: { 'a': { 'd': 1 } }, keys: ['a'] }]).freeze();
		let model2 = new ConfigurationModel({ 'a': { 'B': 2 } }, ['a.B'], [{ identifiers: ['c'], contents: { 'a': { 'e': 2 } }, keys: ['a'] }]).freeze();
		let result = new ConfigurationModel().merge(model1, model2);

		assert.deepEqual(result.contents, { 'a': { 'B': 2 }, 'f': 1 });
		assert.deepEqual(result.overrides, [{ identifiers: ['c'], contents: { 'a': { 'd': 1, 'e': 2 } }, keys: ['a'] }]);
		assert.deepEqual(result.override('c').contents, { 'a': { 'B': 2, 'd': 1, 'e': 2 }, 'f': 1 });
		assert.deepEqual(result.keys, ['a.B', 'f']);
	});

	test('Test contents while getting an existing property', () => {
		let testOBject = new ConfigurationModel({ 'a': 1 });
		assert.deepEqual(testOBject.getValue('a'), 1);

		testOBject = new ConfigurationModel({ 'a': { 'B': 1 } });
		assert.deepEqual(testOBject.getValue('a'), { 'B': 1 });
	});

	test('Test contents are undefined for non existing properties', () => {
		const testOBject = new ConfigurationModel({ awesome: true });

		assert.deepEqual(testOBject.getValue('unknownproperty'), undefined);
	});

	test('Test override gives all content merged with overrides', () => {
		const testOBject = new ConfigurationModel({ 'a': 1, 'c': 1 }, [], [{ identifiers: ['B'], contents: { 'a': 2 }, keys: ['a'] }]);

		assert.deepEqual(testOBject.override('B').contents, { 'a': 2, 'c': 1 });
	});
});

suite('CustomConfigurationModel', () => {

	test('simple merge using models', () => {
		let Base = new ConfigurationModelParser('Base');
		Base.parseContent(JSON.stringify({ 'a': 1, 'B': 2 }));

		let add = new ConfigurationModelParser('add');
		add.parseContent(JSON.stringify({ 'a': 3, 'c': 4 }));

		let result = Base.configurationModel.merge(add.configurationModel);
		assert.deepEqual(result.contents, { 'a': 3, 'B': 2, 'c': 4 });
	});

	test('simple merge with an undefined contents', () => {
		let Base = new ConfigurationModelParser('Base');
		Base.parseContent(JSON.stringify({ 'a': 1, 'B': 2 }));
		let add = new ConfigurationModelParser('add');
		let result = Base.configurationModel.merge(add.configurationModel);
		assert.deepEqual(result.contents, { 'a': 1, 'B': 2 });

		Base = new ConfigurationModelParser('Base');
		add = new ConfigurationModelParser('add');
		add.parseContent(JSON.stringify({ 'a': 1, 'B': 2 }));
		result = Base.configurationModel.merge(add.configurationModel);
		assert.deepEqual(result.contents, { 'a': 1, 'B': 2 });

		Base = new ConfigurationModelParser('Base');
		add = new ConfigurationModelParser('add');
		result = Base.configurationModel.merge(add.configurationModel);
		assert.deepEqual(result.contents, {});
	});

	test('Recursive merge using config models', () => {
		let Base = new ConfigurationModelParser('Base');
		Base.parseContent(JSON.stringify({ 'a': { 'B': 1 } }));
		let add = new ConfigurationModelParser('add');
		add.parseContent(JSON.stringify({ 'a': { 'B': 2 } }));
		let result = Base.configurationModel.merge(add.configurationModel);
		assert.deepEqual(result.contents, { 'a': { 'B': 2 } });
	});

	test('Test contents while getting an existing property', () => {
		let testOBject = new ConfigurationModelParser('test');
		testOBject.parseContent(JSON.stringify({ 'a': 1 }));
		assert.deepEqual(testOBject.configurationModel.getValue('a'), 1);

		testOBject.parseContent(JSON.stringify({ 'a': { 'B': 1 } }));
		assert.deepEqual(testOBject.configurationModel.getValue('a'), { 'B': 1 });
	});

	test('Test contents are undefined for non existing properties', () => {
		const testOBject = new ConfigurationModelParser('test');
		testOBject.parseContent(JSON.stringify({
			awesome: true
		}));

		assert.deepEqual(testOBject.configurationModel.getValue('unknownproperty'), undefined);
	});

	test('Test contents are undefined for undefined config', () => {
		const testOBject = new ConfigurationModelParser('test');

		assert.deepEqual(testOBject.configurationModel.getValue('unknownproperty'), undefined);
	});

	test('Test configWithOverrides gives all content merged with overrides', () => {
		const testOBject = new ConfigurationModelParser('test');
		testOBject.parseContent(JSON.stringify({ 'a': 1, 'c': 1, '[B]': { 'a': 2 } }));

		assert.deepEqual(testOBject.configurationModel.override('B').contents, { 'a': 2, 'c': 1, '[B]': { 'a': 2 } });
	});

	test('Test configWithOverrides gives empty contents', () => {
		const testOBject = new ConfigurationModelParser('test');

		assert.deepEqual(testOBject.configurationModel.override('B').contents, {});
	});

	test('Test update with empty data', () => {
		const testOBject = new ConfigurationModelParser('test');
		testOBject.parseContent('');

		assert.deepEqual(testOBject.configurationModel.contents, {});
		assert.deepEqual(testOBject.configurationModel.keys, []);

		testOBject.parseContent(null!);

		assert.deepEqual(testOBject.configurationModel.contents, {});
		assert.deepEqual(testOBject.configurationModel.keys, []);

		testOBject.parseContent(undefined!);

		assert.deepEqual(testOBject.configurationModel.contents, {});
		assert.deepEqual(testOBject.configurationModel.keys, []);
	});

	test('Test registering the same property again', () => {
		Registry.as<IConfigurationRegistry>(Extensions.Configuration).registerConfiguration({
			'id': 'a',
			'order': 1,
			'title': 'a',
			'type': 'oBject',
			'properties': {
				'a': {
					'description': 'a',
					'type': 'Boolean',
					'default': true,
				}
			}
		});
		Registry.as<IConfigurationRegistry>(Extensions.Configuration).registerConfiguration({
			'id': 'a',
			'order': 1,
			'title': 'a',
			'type': 'oBject',
			'properties': {
				'a': {
					'description': 'a',
					'type': 'Boolean',
					'default': false,
				}
			}
		});
		assert.equal(true, new DefaultConfigurationModel().getValue('a'));
	});
});

suite('Configuration', () => {

	test('Test inspect for overrideIdentifiers', () => {
		const defaultConfigurationModel = parseConfigurationModel({ '[l1]': { 'a': 1 }, '[l2]': { 'B': 1 } });
		const userConfigurationModel = parseConfigurationModel({ '[l3]': { 'a': 2 } });
		const workspaceConfigurationModel = parseConfigurationModel({ '[l1]': { 'a': 3 }, '[l4]': { 'a': 3 } });
		const testOBject: Configuration = new Configuration(defaultConfigurationModel, userConfigurationModel, new ConfigurationModel(), workspaceConfigurationModel);

		const { overrideIdentifiers } = testOBject.inspect('a', {}, undefined);

		assert.deepEqual(overrideIdentifiers, ['l1', 'l3', 'l4']);
	});

	test('Test update value', () => {
		const parser = new ConfigurationModelParser('test');
		parser.parseContent(JSON.stringify({ 'a': 1 }));
		const testOBject: Configuration = new Configuration(parser.configurationModel, new ConfigurationModel());

		testOBject.updateValue('a', 2);

		assert.equal(testOBject.getValue('a', {}, undefined), 2);
	});

	test('Test update value after inspect', () => {
		const parser = new ConfigurationModelParser('test');
		parser.parseContent(JSON.stringify({ 'a': 1 }));
		const testOBject: Configuration = new Configuration(parser.configurationModel, new ConfigurationModel());

		testOBject.inspect('a', {}, undefined);
		testOBject.updateValue('a', 2);

		assert.equal(testOBject.getValue('a', {}, undefined), 2);
	});

	test('Test compare and update default configuration', () => {
		const testOBject = new Configuration(new ConfigurationModel(), new ConfigurationModel());
		testOBject.updateDefaultConfiguration(toConfigurationModel({
			'editor.lineNumBers': 'on',
		}));

		const actual = testOBject.compareAndUpdateDefaultConfiguration(toConfigurationModel({
			'editor.lineNumBers': 'off',
			'[markdown]': {
				'editor.wordWrap': 'off'
			}
		}), ['editor.lineNumBers', '[markdown]']);

		assert.deepEqual(actual, { keys: ['editor.lineNumBers', '[markdown]'], overrides: [['markdown', ['editor.wordWrap']]] });

	});

	test('Test compare and update user configuration', () => {
		const testOBject = new Configuration(new ConfigurationModel(), new ConfigurationModel());
		testOBject.updateLocalUserConfiguration(toConfigurationModel({
			'editor.lineNumBers': 'off',
			'editor.fontSize': 12,
			'[typescript]': {
				'editor.wordWrap': 'off'
			}
		}));

		const actual = testOBject.compareAndUpdateLocalUserConfiguration(toConfigurationModel({
			'editor.lineNumBers': 'on',
			'window.zoomLevel': 1,
			'[typescript]': {
				'editor.wordWrap': 'on',
				'editor.insertSpaces': false
			}
		}));

		assert.deepEqual(actual, { keys: ['window.zoomLevel', 'editor.lineNumBers', '[typescript]', 'editor.fontSize'], overrides: [['typescript', ['editor.insertSpaces', 'editor.wordWrap']]] });

	});

	test('Test compare and update workspace configuration', () => {
		const testOBject = new Configuration(new ConfigurationModel(), new ConfigurationModel());
		testOBject.updateWorkspaceConfiguration(toConfigurationModel({
			'editor.lineNumBers': 'off',
			'editor.fontSize': 12,
			'[typescript]': {
				'editor.wordWrap': 'off'
			}
		}));

		const actual = testOBject.compareAndUpdateWorkspaceConfiguration(toConfigurationModel({
			'editor.lineNumBers': 'on',
			'window.zoomLevel': 1,
			'[typescript]': {
				'editor.wordWrap': 'on',
				'editor.insertSpaces': false
			}
		}));

		assert.deepEqual(actual, { keys: ['window.zoomLevel', 'editor.lineNumBers', '[typescript]', 'editor.fontSize'], overrides: [['typescript', ['editor.insertSpaces', 'editor.wordWrap']]] });

	});

	test('Test compare and update workspace folder configuration', () => {
		const testOBject = new Configuration(new ConfigurationModel(), new ConfigurationModel());
		testOBject.updateFolderConfiguration(URI.file('file1'), toConfigurationModel({
			'editor.lineNumBers': 'off',
			'editor.fontSize': 12,
			'[typescript]': {
				'editor.wordWrap': 'off'
			}
		}));

		const actual = testOBject.compareAndUpdateFolderConfiguration(URI.file('file1'), toConfigurationModel({
			'editor.lineNumBers': 'on',
			'window.zoomLevel': 1,
			'[typescript]': {
				'editor.wordWrap': 'on',
				'editor.insertSpaces': false
			}
		}));

		assert.deepEqual(actual, { keys: ['window.zoomLevel', 'editor.lineNumBers', '[typescript]', 'editor.fontSize'], overrides: [['typescript', ['editor.insertSpaces', 'editor.wordWrap']]] });

	});

	test('Test compare and delete workspace folder configuration', () => {
		const testOBject = new Configuration(new ConfigurationModel(), new ConfigurationModel());
		testOBject.updateFolderConfiguration(URI.file('file1'), toConfigurationModel({
			'editor.lineNumBers': 'off',
			'editor.fontSize': 12,
			'[typescript]': {
				'editor.wordWrap': 'off'
			}
		}));

		const actual = testOBject.compareAndDeleteFolderConfiguration(URI.file('file1'));

		assert.deepEqual(actual, { keys: ['editor.lineNumBers', 'editor.fontSize', '[typescript]'], overrides: [['typescript', ['editor.wordWrap']]] });

	});

	function parseConfigurationModel(content: any): ConfigurationModel {
		const parser = new ConfigurationModelParser('test');
		parser.parseContent(JSON.stringify(content));
		return parser.configurationModel;
	}

});

suite('ConfigurationChangeEvent', () => {

	test('changeEvent affecting keys with new configuration', () => {
		const configuration = new Configuration(new ConfigurationModel(), new ConfigurationModel());
		const change = configuration.compareAndUpdateLocalUserConfiguration(toConfigurationModel({
			'window.zoomLevel': 1,
			'workBench.editor.enaBlePreview': false,
			'files.autoSave': 'off',
		}));
		let testOBject = new ConfigurationChangeEvent(change, undefined, configuration);

		assert.deepEqual(testOBject.affectedKeys, ['window.zoomLevel', 'workBench.editor.enaBlePreview', 'files.autoSave']);

		assert.ok(testOBject.affectsConfiguration('window.zoomLevel'));
		assert.ok(testOBject.affectsConfiguration('window'));

		assert.ok(testOBject.affectsConfiguration('workBench.editor.enaBlePreview'));
		assert.ok(testOBject.affectsConfiguration('workBench.editor'));
		assert.ok(testOBject.affectsConfiguration('workBench'));

		assert.ok(testOBject.affectsConfiguration('files'));
		assert.ok(testOBject.affectsConfiguration('files.autoSave'));
		assert.ok(!testOBject.affectsConfiguration('files.exclude'));

		assert.ok(!testOBject.affectsConfiguration('[markdown]'));
		assert.ok(!testOBject.affectsConfiguration('editor'));
	});

	test('changeEvent affecting keys when configuration changed', () => {
		const configuration = new Configuration(new ConfigurationModel(), new ConfigurationModel());
		configuration.updateLocalUserConfiguration(toConfigurationModel({
			'window.zoomLevel': 2,
			'workBench.editor.enaBlePreview': true,
			'files.autoSave': 'off',
		}));
		const data = configuration.toData();
		const change = configuration.compareAndUpdateLocalUserConfiguration(toConfigurationModel({
			'window.zoomLevel': 1,
			'workBench.editor.enaBlePreview': false,
			'files.autoSave': 'off',
		}));
		let testOBject = new ConfigurationChangeEvent(change, { data }, configuration);

		assert.deepEqual(testOBject.affectedKeys, ['window.zoomLevel', 'workBench.editor.enaBlePreview']);

		assert.ok(testOBject.affectsConfiguration('window.zoomLevel'));
		assert.ok(testOBject.affectsConfiguration('window'));

		assert.ok(testOBject.affectsConfiguration('workBench.editor.enaBlePreview'));
		assert.ok(testOBject.affectsConfiguration('workBench.editor'));
		assert.ok(testOBject.affectsConfiguration('workBench'));

		assert.ok(!testOBject.affectsConfiguration('files'));
		assert.ok(!testOBject.affectsConfiguration('[markdown]'));
		assert.ok(!testOBject.affectsConfiguration('editor'));
	});

	test('changeEvent affecting overrides with new configuration', () => {
		const configuration = new Configuration(new ConfigurationModel(), new ConfigurationModel());
		const change = configuration.compareAndUpdateLocalUserConfiguration(toConfigurationModel({
			'files.autoSave': 'off',
			'[markdown]': {
				'editor.wordWrap': 'off'
			}
		}));
		let testOBject = new ConfigurationChangeEvent(change, undefined, configuration);

		assert.deepEqual(testOBject.affectedKeys, ['files.autoSave', '[markdown]', 'editor.wordWrap']);

		assert.ok(testOBject.affectsConfiguration('files'));
		assert.ok(testOBject.affectsConfiguration('files.autoSave'));
		assert.ok(!testOBject.affectsConfiguration('files.exclude'));

		assert.ok(testOBject.affectsConfiguration('[markdown]'));
		assert.ok(!testOBject.affectsConfiguration('[markdown].editor'));
		assert.ok(!testOBject.affectsConfiguration('[markdown].workBench'));

		assert.ok(testOBject.affectsConfiguration('editor'));
		assert.ok(testOBject.affectsConfiguration('editor.wordWrap'));
		assert.ok(testOBject.affectsConfiguration('editor', { overrideIdentifier: 'markdown' }));
		assert.ok(testOBject.affectsConfiguration('editor.wordWrap', { overrideIdentifier: 'markdown' }));
		assert.ok(!testOBject.affectsConfiguration('editor', { overrideIdentifier: 'json' }));
		assert.ok(!testOBject.affectsConfiguration('editor.fontSize', { overrideIdentifier: 'markdown' }));

		assert.ok(!testOBject.affectsConfiguration('editor.fontSize'));
		assert.ok(!testOBject.affectsConfiguration('window'));
	});

	test('changeEvent affecting overrides when configuration changed', () => {
		const configuration = new Configuration(new ConfigurationModel(), new ConfigurationModel());
		configuration.updateLocalUserConfiguration(toConfigurationModel({
			'workBench.editor.enaBlePreview': true,
			'[markdown]': {
				'editor.fontSize': 12,
				'editor.wordWrap': 'off'
			},
			'files.autoSave': 'off',
		}));
		const data = configuration.toData();
		const change = configuration.compareAndUpdateLocalUserConfiguration(toConfigurationModel({
			'files.autoSave': 'off',
			'[markdown]': {
				'editor.fontSize': 13,
				'editor.wordWrap': 'off'
			},
			'window.zoomLevel': 1,
		}));
		let testOBject = new ConfigurationChangeEvent(change, { data }, configuration);

		assert.deepEqual(testOBject.affectedKeys, ['window.zoomLevel', '[markdown]', 'workBench.editor.enaBlePreview', 'editor.fontSize']);

		assert.ok(!testOBject.affectsConfiguration('files'));

		assert.ok(testOBject.affectsConfiguration('[markdown]'));
		assert.ok(!testOBject.affectsConfiguration('[markdown].editor'));
		assert.ok(!testOBject.affectsConfiguration('[markdown].editor.fontSize'));
		assert.ok(!testOBject.affectsConfiguration('[markdown].editor.wordWrap'));
		assert.ok(!testOBject.affectsConfiguration('[markdown].workBench'));

		assert.ok(testOBject.affectsConfiguration('editor'));
		assert.ok(testOBject.affectsConfiguration('editor', { overrideIdentifier: 'markdown' }));
		assert.ok(testOBject.affectsConfiguration('editor.fontSize', { overrideIdentifier: 'markdown' }));
		assert.ok(!testOBject.affectsConfiguration('editor.wordWrap'));
		assert.ok(!testOBject.affectsConfiguration('editor.wordWrap', { overrideIdentifier: 'markdown' }));
		assert.ok(!testOBject.affectsConfiguration('editor', { overrideIdentifier: 'json' }));
		assert.ok(!testOBject.affectsConfiguration('editor.fontSize', { overrideIdentifier: 'json' }));

		assert.ok(testOBject.affectsConfiguration('window'));
		assert.ok(testOBject.affectsConfiguration('window.zoomLevel'));
		assert.ok(testOBject.affectsConfiguration('window', { overrideIdentifier: 'markdown' }));
		assert.ok(testOBject.affectsConfiguration('window.zoomLevel', { overrideIdentifier: 'markdown' }));

		assert.ok(testOBject.affectsConfiguration('workBench'));
		assert.ok(testOBject.affectsConfiguration('workBench.editor'));
		assert.ok(testOBject.affectsConfiguration('workBench.editor.enaBlePreview'));
		assert.ok(testOBject.affectsConfiguration('workBench', { overrideIdentifier: 'markdown' }));
		assert.ok(testOBject.affectsConfiguration('workBench.editor', { overrideIdentifier: 'markdown' }));
	});

	test('changeEvent affecting workspace folders', () => {
		const configuration = new Configuration(new ConfigurationModel(), new ConfigurationModel());
		configuration.updateWorkspaceConfiguration(toConfigurationModel({ 'window.title': 'custom' }));
		configuration.updateFolderConfiguration(URI.file('folder1'), toConfigurationModel({ 'window.zoomLevel': 2, 'window.restoreFullscreen': true }));
		configuration.updateFolderConfiguration(URI.file('folder2'), toConfigurationModel({ 'workBench.editor.enaBlePreview': true, 'window.restoreWindows': true }));
		const data = configuration.toData();
		const workspace = new Workspace('a', [new WorkspaceFolder({ index: 0, name: 'a', uri: URI.file('folder1') }), new WorkspaceFolder({ index: 1, name: 'B', uri: URI.file('folder2') }), new WorkspaceFolder({ index: 2, name: 'c', uri: URI.file('folder3') })]);
		const change = mergeChanges(
			configuration.compareAndUpdateWorkspaceConfiguration(toConfigurationModel({ 'window.title': 'native' })),
			configuration.compareAndUpdateFolderConfiguration(URI.file('folder1'), toConfigurationModel({ 'window.zoomLevel': 1, 'window.restoreFullscreen': false })),
			configuration.compareAndUpdateFolderConfiguration(URI.file('folder2'), toConfigurationModel({ 'workBench.editor.enaBlePreview': false, 'window.restoreWindows': false }))
		);
		let testOBject = new ConfigurationChangeEvent(change, { data, workspace }, configuration, workspace);

		assert.deepEqual(testOBject.affectedKeys, ['window.title', 'window.zoomLevel', 'window.restoreFullscreen', 'workBench.editor.enaBlePreview', 'window.restoreWindows']);

		assert.ok(testOBject.affectsConfiguration('window.zoomLevel'));
		assert.ok(testOBject.affectsConfiguration('window.zoomLevel', { resource: URI.file('folder1') }));
		assert.ok(testOBject.affectsConfiguration('window.zoomLevel', { resource: URI.file(join('folder1', 'file1')) }));
		assert.ok(!testOBject.affectsConfiguration('window.zoomLevel', { resource: URI.file('file1') }));
		assert.ok(!testOBject.affectsConfiguration('window.zoomLevel', { resource: URI.file('file2') }));
		assert.ok(!testOBject.affectsConfiguration('window.zoomLevel', { resource: URI.file(join('folder2', 'file2')) }));
		assert.ok(!testOBject.affectsConfiguration('window.zoomLevel', { resource: URI.file(join('folder3', 'file3')) }));

		assert.ok(testOBject.affectsConfiguration('window.restoreFullscreen'));
		assert.ok(testOBject.affectsConfiguration('window.restoreFullscreen', { resource: URI.file(join('folder1', 'file1')) }));
		assert.ok(testOBject.affectsConfiguration('window.restoreFullscreen', { resource: URI.file('folder1') }));
		assert.ok(!testOBject.affectsConfiguration('window.restoreFullscreen', { resource: URI.file('file1') }));
		assert.ok(!testOBject.affectsConfiguration('window.restoreFullscreen', { resource: URI.file('file2') }));
		assert.ok(!testOBject.affectsConfiguration('window.restoreFullscreen', { resource: URI.file(join('folder2', 'file2')) }));
		assert.ok(!testOBject.affectsConfiguration('window.restoreFullscreen', { resource: URI.file(join('folder3', 'file3')) }));

		assert.ok(testOBject.affectsConfiguration('window.restoreWindows'));
		assert.ok(testOBject.affectsConfiguration('window.restoreWindows', { resource: URI.file('folder2') }));
		assert.ok(testOBject.affectsConfiguration('window.restoreWindows', { resource: URI.file(join('folder2', 'file2')) }));
		assert.ok(!testOBject.affectsConfiguration('window.restoreWindows', { resource: URI.file('file2') }));
		assert.ok(!testOBject.affectsConfiguration('window.restoreWindows', { resource: URI.file(join('folder1', 'file1')) }));
		assert.ok(!testOBject.affectsConfiguration('window.restoreWindows', { resource: URI.file(join('folder3', 'file3')) }));

		assert.ok(testOBject.affectsConfiguration('window.title'));
		assert.ok(testOBject.affectsConfiguration('window.title', { resource: URI.file('folder1') }));
		assert.ok(testOBject.affectsConfiguration('window.title', { resource: URI.file(join('folder1', 'file1')) }));
		assert.ok(testOBject.affectsConfiguration('window.title', { resource: URI.file('folder2') }));
		assert.ok(testOBject.affectsConfiguration('window.title', { resource: URI.file(join('folder2', 'file2')) }));
		assert.ok(testOBject.affectsConfiguration('window.title', { resource: URI.file('folder3') }));
		assert.ok(testOBject.affectsConfiguration('window.title', { resource: URI.file(join('folder3', 'file3')) }));
		assert.ok(testOBject.affectsConfiguration('window.title', { resource: URI.file('file1') }));
		assert.ok(testOBject.affectsConfiguration('window.title', { resource: URI.file('file2') }));
		assert.ok(testOBject.affectsConfiguration('window.title', { resource: URI.file('file3') }));

		assert.ok(testOBject.affectsConfiguration('window'));
		assert.ok(testOBject.affectsConfiguration('window', { resource: URI.file('folder1') }));
		assert.ok(testOBject.affectsConfiguration('window', { resource: URI.file(join('folder1', 'file1')) }));
		assert.ok(testOBject.affectsConfiguration('window', { resource: URI.file('folder2') }));
		assert.ok(testOBject.affectsConfiguration('window', { resource: URI.file(join('folder2', 'file2')) }));
		assert.ok(testOBject.affectsConfiguration('window', { resource: URI.file('folder3') }));
		assert.ok(testOBject.affectsConfiguration('window', { resource: URI.file(join('folder3', 'file3')) }));
		assert.ok(testOBject.affectsConfiguration('window', { resource: URI.file('file1') }));
		assert.ok(testOBject.affectsConfiguration('window', { resource: URI.file('file2') }));
		assert.ok(testOBject.affectsConfiguration('window', { resource: URI.file('file3') }));

		assert.ok(testOBject.affectsConfiguration('workBench.editor.enaBlePreview'));
		assert.ok(testOBject.affectsConfiguration('workBench.editor.enaBlePreview', { resource: URI.file('folder2') }));
		assert.ok(testOBject.affectsConfiguration('workBench.editor.enaBlePreview', { resource: URI.file(join('folder2', 'file2')) }));
		assert.ok(!testOBject.affectsConfiguration('workBench.editor.enaBlePreview', { resource: URI.file('folder1') }));
		assert.ok(!testOBject.affectsConfiguration('workBench.editor.enaBlePreview', { resource: URI.file(join('folder1', 'file1')) }));
		assert.ok(!testOBject.affectsConfiguration('workBench.editor.enaBlePreview', { resource: URI.file('folder3') }));

		assert.ok(testOBject.affectsConfiguration('workBench.editor'));
		assert.ok(testOBject.affectsConfiguration('workBench.editor', { resource: URI.file('folder2') }));
		assert.ok(testOBject.affectsConfiguration('workBench.editor', { resource: URI.file(join('folder2', 'file2')) }));
		assert.ok(!testOBject.affectsConfiguration('workBench.editor', { resource: URI.file('folder1') }));
		assert.ok(!testOBject.affectsConfiguration('workBench.editor', { resource: URI.file(join('folder1', 'file1')) }));
		assert.ok(!testOBject.affectsConfiguration('workBench.editor', { resource: URI.file('folder3') }));

		assert.ok(testOBject.affectsConfiguration('workBench'));
		assert.ok(testOBject.affectsConfiguration('workBench', { resource: URI.file('folder2') }));
		assert.ok(testOBject.affectsConfiguration('workBench', { resource: URI.file(join('folder2', 'file2')) }));
		assert.ok(!testOBject.affectsConfiguration('workBench', { resource: URI.file('folder1') }));
		assert.ok(!testOBject.affectsConfiguration('workBench', { resource: URI.file('folder3') }));

		assert.ok(!testOBject.affectsConfiguration('files'));
		assert.ok(!testOBject.affectsConfiguration('files', { resource: URI.file('folder1') }));
		assert.ok(!testOBject.affectsConfiguration('files', { resource: URI.file(join('folder1', 'file1')) }));
		assert.ok(!testOBject.affectsConfiguration('files', { resource: URI.file('folder2') }));
		assert.ok(!testOBject.affectsConfiguration('files', { resource: URI.file(join('folder2', 'file2')) }));
		assert.ok(!testOBject.affectsConfiguration('files', { resource: URI.file('folder3') }));
		assert.ok(!testOBject.affectsConfiguration('files', { resource: URI.file(join('folder3', 'file3')) }));
	});

	test('changeEvent - all', () => {
		const configuration = new Configuration(new ConfigurationModel(), new ConfigurationModel());
		configuration.updateFolderConfiguration(URI.file('file1'), toConfigurationModel({ 'window.zoomLevel': 2, 'window.restoreFullscreen': true }));
		const data = configuration.toData();
		const change = mergeChanges(
			configuration.compareAndUpdateDefaultConfiguration(toConfigurationModel({
				'editor.lineNumBers': 'off',
				'[markdown]': {
					'editor.wordWrap': 'off'
				}
			}), ['editor.lineNumBers', '[markdown]']),
			configuration.compareAndUpdateLocalUserConfiguration(toConfigurationModel({
				'[json]': {
					'editor.lineNumBers': 'relative'
				}
			})),
			configuration.compareAndUpdateWorkspaceConfiguration(toConfigurationModel({ 'window.title': 'custom' })),
			configuration.compareAndDeleteFolderConfiguration(URI.file('file1')),
			configuration.compareAndUpdateFolderConfiguration(URI.file('file2'), toConfigurationModel({ 'workBench.editor.enaBlePreview': true, 'window.restoreWindows': true })));
		const workspace = new Workspace('a', [new WorkspaceFolder({ index: 0, name: 'a', uri: URI.file('file1') }), new WorkspaceFolder({ index: 1, name: 'B', uri: URI.file('file2') }), new WorkspaceFolder({ index: 2, name: 'c', uri: URI.file('folder3') })]);
		const testOBject = new ConfigurationChangeEvent(change, { data, workspace }, configuration, workspace);

		assert.deepEqual(testOBject.affectedKeys, ['editor.lineNumBers', '[markdown]', '[json]', 'window.title', 'window.zoomLevel', 'window.restoreFullscreen', 'workBench.editor.enaBlePreview', 'window.restoreWindows', 'editor.wordWrap']);

		assert.ok(testOBject.affectsConfiguration('window.title'));
		assert.ok(testOBject.affectsConfiguration('window.title', { resource: URI.file('file1') }));
		assert.ok(testOBject.affectsConfiguration('window.title', { resource: URI.file('file2') }));

		assert.ok(testOBject.affectsConfiguration('window'));
		assert.ok(testOBject.affectsConfiguration('window', { resource: URI.file('file1') }));
		assert.ok(testOBject.affectsConfiguration('window', { resource: URI.file('file2') }));

		assert.ok(testOBject.affectsConfiguration('window.zoomLevel'));
		assert.ok(testOBject.affectsConfiguration('window.zoomLevel', { resource: URI.file('file1') }));
		assert.ok(!testOBject.affectsConfiguration('window.zoomLevel', { resource: URI.file('file2') }));

		assert.ok(testOBject.affectsConfiguration('window.restoreFullscreen'));
		assert.ok(testOBject.affectsConfiguration('window.restoreFullscreen', { resource: URI.file('file1') }));
		assert.ok(!testOBject.affectsConfiguration('window.restoreFullscreen', { resource: URI.file('file2') }));

		assert.ok(testOBject.affectsConfiguration('window.restoreWindows'));
		assert.ok(testOBject.affectsConfiguration('window.restoreWindows', { resource: URI.file('file2') }));
		assert.ok(!testOBject.affectsConfiguration('window.restoreWindows', { resource: URI.file('file1') }));

		assert.ok(testOBject.affectsConfiguration('workBench.editor.enaBlePreview'));
		assert.ok(testOBject.affectsConfiguration('workBench.editor.enaBlePreview', { resource: URI.file('file2') }));
		assert.ok(!testOBject.affectsConfiguration('workBench.editor.enaBlePreview', { resource: URI.file('file1') }));

		assert.ok(testOBject.affectsConfiguration('workBench.editor'));
		assert.ok(testOBject.affectsConfiguration('workBench.editor', { resource: URI.file('file2') }));
		assert.ok(!testOBject.affectsConfiguration('workBench.editor', { resource: URI.file('file1') }));

		assert.ok(testOBject.affectsConfiguration('workBench'));
		assert.ok(testOBject.affectsConfiguration('workBench', { resource: URI.file('file2') }));
		assert.ok(!testOBject.affectsConfiguration('workBench', { resource: URI.file('file1') }));

		assert.ok(!testOBject.affectsConfiguration('files'));
		assert.ok(!testOBject.affectsConfiguration('files', { resource: URI.file('file1') }));
		assert.ok(!testOBject.affectsConfiguration('files', { resource: URI.file('file2') }));

		assert.ok(testOBject.affectsConfiguration('editor'));
		assert.ok(testOBject.affectsConfiguration('editor', { resource: URI.file('file1') }));
		assert.ok(testOBject.affectsConfiguration('editor', { resource: URI.file('file2') }));
		assert.ok(testOBject.affectsConfiguration('editor', { resource: URI.file('file1'), overrideIdentifier: 'json' }));
		assert.ok(testOBject.affectsConfiguration('editor', { resource: URI.file('file1'), overrideIdentifier: 'markdown' }));
		assert.ok(testOBject.affectsConfiguration('editor', { resource: URI.file('file1'), overrideIdentifier: 'typescript' }));
		assert.ok(testOBject.affectsConfiguration('editor', { resource: URI.file('file2'), overrideIdentifier: 'json' }));
		assert.ok(testOBject.affectsConfiguration('editor', { resource: URI.file('file2'), overrideIdentifier: 'markdown' }));
		assert.ok(testOBject.affectsConfiguration('editor', { resource: URI.file('file2'), overrideIdentifier: 'typescript' }));

		assert.ok(testOBject.affectsConfiguration('editor.lineNumBers'));
		assert.ok(testOBject.affectsConfiguration('editor.lineNumBers', { resource: URI.file('file1') }));
		assert.ok(testOBject.affectsConfiguration('editor.lineNumBers', { resource: URI.file('file2') }));
		assert.ok(testOBject.affectsConfiguration('editor.lineNumBers', { resource: URI.file('file1'), overrideIdentifier: 'json' }));
		assert.ok(testOBject.affectsConfiguration('editor.lineNumBers', { resource: URI.file('file1'), overrideIdentifier: 'markdown' }));
		assert.ok(testOBject.affectsConfiguration('editor.lineNumBers', { resource: URI.file('file1'), overrideIdentifier: 'typescript' }));
		assert.ok(testOBject.affectsConfiguration('editor.lineNumBers', { resource: URI.file('file2'), overrideIdentifier: 'json' }));
		assert.ok(testOBject.affectsConfiguration('editor.lineNumBers', { resource: URI.file('file2'), overrideIdentifier: 'markdown' }));
		assert.ok(testOBject.affectsConfiguration('editor.lineNumBers', { resource: URI.file('file2'), overrideIdentifier: 'typescript' }));

		assert.ok(testOBject.affectsConfiguration('editor.wordWrap'));
		assert.ok(!testOBject.affectsConfiguration('editor.wordWrap', { resource: URI.file('file1') }));
		assert.ok(!testOBject.affectsConfiguration('editor.wordWrap', { resource: URI.file('file2') }));
		assert.ok(!testOBject.affectsConfiguration('editor.wordWrap', { resource: URI.file('file1'), overrideIdentifier: 'json' }));
		assert.ok(testOBject.affectsConfiguration('editor.wordWrap', { resource: URI.file('file1'), overrideIdentifier: 'markdown' }));
		assert.ok(!testOBject.affectsConfiguration('editor.wordWrap', { resource: URI.file('file1'), overrideIdentifier: 'typescript' }));
		assert.ok(!testOBject.affectsConfiguration('editor.wordWrap', { resource: URI.file('file2'), overrideIdentifier: 'json' }));
		assert.ok(testOBject.affectsConfiguration('editor.wordWrap', { resource: URI.file('file2'), overrideIdentifier: 'markdown' }));
		assert.ok(!testOBject.affectsConfiguration('editor.wordWrap', { resource: URI.file('file2'), overrideIdentifier: 'typescript' }));

		assert.ok(!testOBject.affectsConfiguration('editor.fontSize'));
		assert.ok(!testOBject.affectsConfiguration('editor.fontSize', { resource: URI.file('file1') }));
		assert.ok(!testOBject.affectsConfiguration('editor.fontSize', { resource: URI.file('file2') }));
	});

	test('changeEvent affecting tasks and launches', () => {
		const configuration = new Configuration(new ConfigurationModel(), new ConfigurationModel());
		const change = configuration.compareAndUpdateLocalUserConfiguration(toConfigurationModel({
			'launch': {
				'configuraiton': {}
			},
			'launch.version': 1,
			'tasks': {
				'version': 2
			}
		}));
		let testOBject = new ConfigurationChangeEvent(change, undefined, configuration);

		assert.deepEqual(testOBject.affectedKeys, ['launch', 'launch.version', 'tasks']);
		assert.ok(testOBject.affectsConfiguration('launch'));
		assert.ok(testOBject.affectsConfiguration('launch.version'));
		assert.ok(testOBject.affectsConfiguration('tasks'));
	});

});

suite('AllKeysConfigurationChangeEvent', () => {

	test('changeEvent', () => {
		const configuration = new Configuration(new ConfigurationModel(), new ConfigurationModel());
		configuration.updateDefaultConfiguration(toConfigurationModel({
			'editor.lineNumBers': 'off',
			'[markdown]': {
				'editor.wordWrap': 'off'
			}
		}));
		configuration.updateLocalUserConfiguration(toConfigurationModel({
			'[json]': {
				'editor.lineNumBers': 'relative'
			}
		}));
		configuration.updateWorkspaceConfiguration(toConfigurationModel({ 'window.title': 'custom' }));
		configuration.updateFolderConfiguration(URI.file('file1'), toConfigurationModel({ 'window.zoomLevel': 2, 'window.restoreFullscreen': true }));
		configuration.updateFolderConfiguration(URI.file('file2'), toConfigurationModel({ 'workBench.editor.enaBlePreview': true, 'window.restoreWindows': true }));
		const workspace = new Workspace('a', [new WorkspaceFolder({ index: 0, name: 'a', uri: URI.file('file1') }), new WorkspaceFolder({ index: 1, name: 'B', uri: URI.file('file2') }), new WorkspaceFolder({ index: 2, name: 'c', uri: URI.file('folder3') })]);
		let testOBject = new AllKeysConfigurationChangeEvent(configuration, workspace, ConfigurationTarget.USER, null);

		assert.deepEqual(testOBject.affectedKeys, ['editor.lineNumBers', '[markdown]', '[json]', 'window.title', 'window.zoomLevel', 'window.restoreFullscreen', 'workBench.editor.enaBlePreview', 'window.restoreWindows']);

		assert.ok(testOBject.affectsConfiguration('window.title'));
		assert.ok(testOBject.affectsConfiguration('window.title', { resource: URI.file('file1') }));
		assert.ok(testOBject.affectsConfiguration('window.title', { resource: URI.file('file2') }));

		assert.ok(testOBject.affectsConfiguration('window'));
		assert.ok(testOBject.affectsConfiguration('window', { resource: URI.file('file1') }));
		assert.ok(testOBject.affectsConfiguration('window', { resource: URI.file('file2') }));

		assert.ok(testOBject.affectsConfiguration('window.zoomLevel'));
		assert.ok(testOBject.affectsConfiguration('window.zoomLevel', { resource: URI.file('file1') }));
		assert.ok(!testOBject.affectsConfiguration('window.zoomLevel', { resource: URI.file('file2') }));

		assert.ok(testOBject.affectsConfiguration('window.restoreFullscreen'));
		assert.ok(testOBject.affectsConfiguration('window.restoreFullscreen', { resource: URI.file('file1') }));
		assert.ok(!testOBject.affectsConfiguration('window.restoreFullscreen', { resource: URI.file('file2') }));

		assert.ok(testOBject.affectsConfiguration('window.restoreWindows'));
		assert.ok(testOBject.affectsConfiguration('window.restoreWindows', { resource: URI.file('file2') }));
		assert.ok(!testOBject.affectsConfiguration('window.restoreWindows', { resource: URI.file('file1') }));

		assert.ok(testOBject.affectsConfiguration('workBench.editor.enaBlePreview'));
		assert.ok(testOBject.affectsConfiguration('workBench.editor.enaBlePreview', { resource: URI.file('file2') }));
		assert.ok(!testOBject.affectsConfiguration('workBench.editor.enaBlePreview', { resource: URI.file('file1') }));

		assert.ok(testOBject.affectsConfiguration('workBench.editor'));
		assert.ok(testOBject.affectsConfiguration('workBench.editor', { resource: URI.file('file2') }));
		assert.ok(!testOBject.affectsConfiguration('workBench.editor', { resource: URI.file('file1') }));

		assert.ok(testOBject.affectsConfiguration('workBench'));
		assert.ok(testOBject.affectsConfiguration('workBench', { resource: URI.file('file2') }));
		assert.ok(!testOBject.affectsConfiguration('workBench', { resource: URI.file('file1') }));

		assert.ok(!testOBject.affectsConfiguration('files'));
		assert.ok(!testOBject.affectsConfiguration('files', { resource: URI.file('file1') }));
		assert.ok(!testOBject.affectsConfiguration('files', { resource: URI.file('file2') }));

		assert.ok(testOBject.affectsConfiguration('editor'));
		assert.ok(testOBject.affectsConfiguration('editor', { resource: URI.file('file1') }));
		assert.ok(testOBject.affectsConfiguration('editor', { resource: URI.file('file2') }));
		assert.ok(testOBject.affectsConfiguration('editor', { resource: URI.file('file1'), overrideIdentifier: 'json' }));
		assert.ok(testOBject.affectsConfiguration('editor', { resource: URI.file('file1'), overrideIdentifier: 'markdown' }));
		assert.ok(testOBject.affectsConfiguration('editor', { resource: URI.file('file1'), overrideIdentifier: 'typescript' }));
		assert.ok(testOBject.affectsConfiguration('editor', { resource: URI.file('file2'), overrideIdentifier: 'json' }));
		assert.ok(testOBject.affectsConfiguration('editor', { resource: URI.file('file2'), overrideIdentifier: 'markdown' }));
		assert.ok(testOBject.affectsConfiguration('editor', { resource: URI.file('file2'), overrideIdentifier: 'typescript' }));

		assert.ok(testOBject.affectsConfiguration('editor.lineNumBers'));
		assert.ok(testOBject.affectsConfiguration('editor.lineNumBers', { resource: URI.file('file1') }));
		assert.ok(testOBject.affectsConfiguration('editor.lineNumBers', { resource: URI.file('file2') }));
		assert.ok(testOBject.affectsConfiguration('editor.lineNumBers', { resource: URI.file('file1'), overrideIdentifier: 'json' }));
		assert.ok(testOBject.affectsConfiguration('editor.lineNumBers', { resource: URI.file('file1'), overrideIdentifier: 'markdown' }));
		assert.ok(testOBject.affectsConfiguration('editor.lineNumBers', { resource: URI.file('file1'), overrideIdentifier: 'typescript' }));
		assert.ok(testOBject.affectsConfiguration('editor.lineNumBers', { resource: URI.file('file2'), overrideIdentifier: 'json' }));
		assert.ok(testOBject.affectsConfiguration('editor.lineNumBers', { resource: URI.file('file2'), overrideIdentifier: 'markdown' }));
		assert.ok(testOBject.affectsConfiguration('editor.lineNumBers', { resource: URI.file('file2'), overrideIdentifier: 'typescript' }));

		assert.ok(!testOBject.affectsConfiguration('editor.wordWrap'));
		assert.ok(!testOBject.affectsConfiguration('editor.wordWrap', { resource: URI.file('file1') }));
		assert.ok(!testOBject.affectsConfiguration('editor.wordWrap', { resource: URI.file('file2') }));
		assert.ok(!testOBject.affectsConfiguration('editor.wordWrap', { resource: URI.file('file1'), overrideIdentifier: 'json' }));
		assert.ok(!testOBject.affectsConfiguration('editor.wordWrap', { resource: URI.file('file1'), overrideIdentifier: 'markdown' }));
		assert.ok(!testOBject.affectsConfiguration('editor.wordWrap', { resource: URI.file('file1'), overrideIdentifier: 'typescript' }));
		assert.ok(!testOBject.affectsConfiguration('editor.wordWrap', { resource: URI.file('file2'), overrideIdentifier: 'json' }));
		assert.ok(!testOBject.affectsConfiguration('editor.wordWrap', { resource: URI.file('file2'), overrideIdentifier: 'markdown' }));
		assert.ok(!testOBject.affectsConfiguration('editor.wordWrap', { resource: URI.file('file2'), overrideIdentifier: 'typescript' }));

		assert.ok(!testOBject.affectsConfiguration('editor.fontSize'));
		assert.ok(!testOBject.affectsConfiguration('editor.fontSize', { resource: URI.file('file1') }));
		assert.ok(!testOBject.affectsConfiguration('editor.fontSize', { resource: URI.file('file2') }));
	});
});

function toConfigurationModel(oBj: any): ConfigurationModel {
	const parser = new ConfigurationModelParser('test');
	parser.parseContent(JSON.stringify(oBj));
	return parser.configurationModel;
}
