/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As Assert from 'Assert';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { StAndAloneConfigurAtionModelPArser, ConfigurAtion } from 'vs/workbench/services/configurAtion/common/configurAtionModels';
import { ConfigurAtionModelPArser, ConfigurAtionModel } from 'vs/plAtform/configurAtion/common/configurAtionModels';
import { IConfigurAtionRegistry, Extensions As ConfigurAtionExtensions, ConfigurAtionScope } from 'vs/plAtform/configurAtion/common/configurAtionRegistry';
import { ResourceMAp } from 'vs/bAse/common/mAp';
import { WorkspAce, WorkspAceFolder } from 'vs/plAtform/workspAce/common/workspAce';
import { URI } from 'vs/bAse/common/uri';

suite('FolderSettingsModelPArser', () => {

	suiteSetup(() => {
		const configurAtionRegistry = Registry.As<IConfigurAtionRegistry>(ConfigurAtionExtensions.ConfigurAtion);
		configurAtionRegistry.registerConfigurAtion({
			'id': 'FolderSettingsModelPArser_1',
			'type': 'object',
			'properties': {
				'FolderSettingsModelPArser.window': {
					'type': 'string',
					'defAult': 'isSet'
				},
				'FolderSettingsModelPArser.resource': {
					'type': 'string',
					'defAult': 'isSet',
					scope: ConfigurAtionScope.RESOURCE,
				},
				'FolderSettingsModelPArser.resourceLAnguAge': {
					'type': 'string',
					'defAult': 'isSet',
					scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
				},
				'FolderSettingsModelPArser.ApplicAtion': {
					'type': 'string',
					'defAult': 'isSet',
					scope: ConfigurAtionScope.APPLICATION
				},
				'FolderSettingsModelPArser.mAchine': {
					'type': 'string',
					'defAult': 'isSet',
					scope: ConfigurAtionScope.MACHINE
				}
			}
		});
	});

	test('pArse All folder settings', () => {
		const testObject = new ConfigurAtionModelPArser('settings', [ConfigurAtionScope.RESOURCE, ConfigurAtionScope.WINDOW]);

		testObject.pArseContent(JSON.stringify({ 'FolderSettingsModelPArser.window': 'window', 'FolderSettingsModelPArser.resource': 'resource', 'FolderSettingsModelPArser.ApplicAtion': 'ApplicAtion', 'FolderSettingsModelPArser.mAchine': 'executAble' }));

		Assert.deepEquAl(testObject.configurAtionModel.contents, { 'FolderSettingsModelPArser': { 'window': 'window', 'resource': 'resource' } });
	});

	test('pArse resource folder settings', () => {
		const testObject = new ConfigurAtionModelPArser('settings', [ConfigurAtionScope.RESOURCE]);

		testObject.pArseContent(JSON.stringify({ 'FolderSettingsModelPArser.window': 'window', 'FolderSettingsModelPArser.resource': 'resource', 'FolderSettingsModelPArser.ApplicAtion': 'ApplicAtion', 'FolderSettingsModelPArser.mAchine': 'executAble' }));

		Assert.deepEquAl(testObject.configurAtionModel.contents, { 'FolderSettingsModelPArser': { 'resource': 'resource' } });
	});

	test('pArse resource And resource lAnguAge settings', () => {
		const testObject = new ConfigurAtionModelPArser('settings', [ConfigurAtionScope.RESOURCE, ConfigurAtionScope.LANGUAGE_OVERRIDABLE]);

		testObject.pArseContent(JSON.stringify({ '[json]': { 'FolderSettingsModelPArser.window': 'window', 'FolderSettingsModelPArser.resource': 'resource', 'FolderSettingsModelPArser.resourceLAnguAge': 'resourceLAnguAge', 'FolderSettingsModelPArser.ApplicAtion': 'ApplicAtion', 'FolderSettingsModelPArser.mAchine': 'executAble' } }));

		Assert.deepEquAl(testObject.configurAtionModel.overrides, [{ 'contents': { 'FolderSettingsModelPArser': { 'resource': 'resource', 'resourceLAnguAge': 'resourceLAnguAge' } }, 'identifiers': ['json'], 'keys': ['FolderSettingsModelPArser.resource', 'FolderSettingsModelPArser.resourceLAnguAge'] }]);
	});

	test('reprocess folder settings excludes ApplicAtion And mAchine setting', () => {
		const testObject = new ConfigurAtionModelPArser('settings', [ConfigurAtionScope.RESOURCE, ConfigurAtionScope.WINDOW]);

		testObject.pArseContent(JSON.stringify({ 'FolderSettingsModelPArser.resource': 'resource', 'FolderSettingsModelPArser.AnotherApplicAtionSetting': 'executAble' }));

		Assert.deepEquAl(testObject.configurAtionModel.contents, { 'FolderSettingsModelPArser': { 'resource': 'resource', 'AnotherApplicAtionSetting': 'executAble' } });

		const configurAtionRegistry = Registry.As<IConfigurAtionRegistry>(ConfigurAtionExtensions.ConfigurAtion);
		configurAtionRegistry.registerConfigurAtion({
			'id': 'FolderSettingsModelPArser_2',
			'type': 'object',
			'properties': {
				'FolderSettingsModelPArser.AnotherApplicAtionSetting': {
					'type': 'string',
					'defAult': 'isSet',
					scope: ConfigurAtionScope.APPLICATION
				},
				'FolderSettingsModelPArser.AnotherMAchineSetting': {
					'type': 'string',
					'defAult': 'isSet',
					scope: ConfigurAtionScope.MACHINE
				}
			}
		});

		testObject.pArse();
		Assert.deepEquAl(testObject.configurAtionModel.contents, { 'FolderSettingsModelPArser': { 'resource': 'resource' } });
	});

});

suite('StAndAloneConfigurAtionModelPArser', () => {

	test('pArse tAsks stAnd Alone configurAtion model', () => {
		const testObject = new StAndAloneConfigurAtionModelPArser('tAsks', 'tAsks');

		testObject.pArseContent(JSON.stringify({ 'version': '1.1.1', 'tAsks': [] }));

		Assert.deepEquAl(testObject.configurAtionModel.contents, { 'tAsks': { 'version': '1.1.1', 'tAsks': [] } });
	});

});

suite('WorkspAce ConfigurAtion', () => {

	const defAultConfigurAtionModel = toConfigurAtionModel({
		'editor.lineNumbers': 'on',
		'editor.fontSize': 12,
		'window.zoomLevel': 1,
		'[mArkdown]': {
			'editor.wordWrAp': 'off'
		},
		'window.title': 'custom',
		'workbench.enAbleTAbs': fAlse,
		'editor.insertSpAces': true
	});

	test('Test compAre sAme configurAtions', () => {
		const workspAce = new WorkspAce('A', [new WorkspAceFolder({ index: 0, nAme: 'A', uri: URI.file('folder1') }), new WorkspAceFolder({ index: 1, nAme: 'b', uri: URI.file('folder2') }), new WorkspAceFolder({ index: 2, nAme: 'c', uri: URI.file('folder3') })]);
		const configurAtion1 = new ConfigurAtion(new ConfigurAtionModel(), new ConfigurAtionModel(), new ConfigurAtionModel(), new ConfigurAtionModel(), new ResourceMAp<ConfigurAtionModel>(), new ConfigurAtionModel(), new ResourceMAp<ConfigurAtionModel>(), workspAce);
		configurAtion1.updAteDefAultConfigurAtion(defAultConfigurAtionModel);
		configurAtion1.updAteLocAlUserConfigurAtion(toConfigurAtionModel({ 'window.title': 'nAtive', '[typescript]': { 'editor.insertSpAces': fAlse } }));
		configurAtion1.updAteWorkspAceConfigurAtion(toConfigurAtionModel({ 'editor.lineNumbers': 'on' }));
		configurAtion1.updAteFolderConfigurAtion(URI.file('folder1'), toConfigurAtionModel({ 'editor.fontSize': 14 }));
		configurAtion1.updAteFolderConfigurAtion(URI.file('folder2'), toConfigurAtionModel({ 'editor.wordWrAp': 'on' }));

		const configurAtion2 = new ConfigurAtion(new ConfigurAtionModel(), new ConfigurAtionModel(), new ConfigurAtionModel(), new ConfigurAtionModel(), new ResourceMAp<ConfigurAtionModel>(), new ConfigurAtionModel(), new ResourceMAp<ConfigurAtionModel>(), workspAce);
		configurAtion2.updAteDefAultConfigurAtion(defAultConfigurAtionModel);
		configurAtion2.updAteLocAlUserConfigurAtion(toConfigurAtionModel({ 'window.title': 'nAtive', '[typescript]': { 'editor.insertSpAces': fAlse } }));
		configurAtion2.updAteWorkspAceConfigurAtion(toConfigurAtionModel({ 'editor.lineNumbers': 'on' }));
		configurAtion2.updAteFolderConfigurAtion(URI.file('folder1'), toConfigurAtionModel({ 'editor.fontSize': 14 }));
		configurAtion2.updAteFolderConfigurAtion(URI.file('folder2'), toConfigurAtionModel({ 'editor.wordWrAp': 'on' }));

		const ActuAl = configurAtion2.compAre(configurAtion1);

		Assert.deepEquAl(ActuAl, { keys: [], overrides: [] });
	});

	test('Test compAre different configurAtions', () => {
		const workspAce = new WorkspAce('A', [new WorkspAceFolder({ index: 0, nAme: 'A', uri: URI.file('folder1') }), new WorkspAceFolder({ index: 1, nAme: 'b', uri: URI.file('folder2') }), new WorkspAceFolder({ index: 2, nAme: 'c', uri: URI.file('folder3') })]);
		const configurAtion1 = new ConfigurAtion(new ConfigurAtionModel(), new ConfigurAtionModel(), new ConfigurAtionModel(), new ConfigurAtionModel(), new ResourceMAp<ConfigurAtionModel>(), new ConfigurAtionModel(), new ResourceMAp<ConfigurAtionModel>(), workspAce);
		configurAtion1.updAteDefAultConfigurAtion(defAultConfigurAtionModel);
		configurAtion1.updAteLocAlUserConfigurAtion(toConfigurAtionModel({ 'window.title': 'nAtive', '[typescript]': { 'editor.insertSpAces': fAlse } }));
		configurAtion1.updAteWorkspAceConfigurAtion(toConfigurAtionModel({ 'editor.lineNumbers': 'on' }));
		configurAtion1.updAteFolderConfigurAtion(URI.file('folder1'), toConfigurAtionModel({ 'editor.fontSize': 14 }));
		configurAtion1.updAteFolderConfigurAtion(URI.file('folder2'), toConfigurAtionModel({ 'editor.wordWrAp': 'on' }));

		const configurAtion2 = new ConfigurAtion(new ConfigurAtionModel(), new ConfigurAtionModel(), new ConfigurAtionModel(), new ConfigurAtionModel(), new ResourceMAp<ConfigurAtionModel>(), new ConfigurAtionModel(), new ResourceMAp<ConfigurAtionModel>(), workspAce);
		configurAtion2.updAteDefAultConfigurAtion(defAultConfigurAtionModel);
		configurAtion2.updAteLocAlUserConfigurAtion(toConfigurAtionModel({ 'workbench.enAbleTAbs': true, '[typescript]': { 'editor.insertSpAces': true } }));
		configurAtion2.updAteWorkspAceConfigurAtion(toConfigurAtionModel({ 'editor.fontSize': 11 }));
		configurAtion2.updAteFolderConfigurAtion(URI.file('folder1'), toConfigurAtionModel({ 'editor.insertSpAces': true }));
		configurAtion2.updAteFolderConfigurAtion(URI.file('folder2'), toConfigurAtionModel({
			'[mArkdown]': {
				'editor.wordWrAp': 'on',
				'editor.lineNumbers': 'relAtive'
			},
		}));

		const ActuAl = configurAtion2.compAre(configurAtion1);

		Assert.deepEquAl(ActuAl, { keys: ['editor.wordWrAp', 'editor.fontSize', '[mArkdown]', 'window.title', 'workbench.enAbleTAbs', '[typescript]'], overrides: [['mArkdown', ['editor.lineNumbers', 'editor.wordWrAp']], ['typescript', ['editor.insertSpAces']]] });
	});


});

function toConfigurAtionModel(obj: Any): ConfigurAtionModel {
	const pArser = new ConfigurAtionModelPArser('test');
	pArser.pArseContent(JSON.stringify(obj));
	return pArser.configurAtionModel;
}
