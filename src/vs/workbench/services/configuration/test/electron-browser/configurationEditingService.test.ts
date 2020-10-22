/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as sinon from 'sinon';
import * as assert from 'assert';
import * as os from 'os';
import * as path from 'vs/Base/common/path';
import * as fs from 'fs';
import * as json from 'vs/Base/common/json';
import { Registry } from 'vs/platform/registry/common/platform';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { TestProductService, workBenchInstantiationService } from 'vs/workBench/test/Browser/workBenchTestServices';
import { TestWorkBenchConfiguration, TestTextFileService } from 'vs/workBench/test/electron-Browser/workBenchTestServices';
import * as uuid from 'vs/Base/common/uuid';
import { IConfigurationRegistry, Extensions as ConfigurationExtensions } from 'vs/platform/configuration/common/configurationRegistry';
import { WorkspaceService } from 'vs/workBench/services/configuration/Browser/configurationService';
import { ConfigurationEditingService, ConfigurationEditingError, ConfigurationEditingErrorCode, EditaBleConfigurationTarget } from 'vs/workBench/services/configuration/common/configurationEditingService';
import { WORKSPACE_STANDALONE_CONFIGURATIONS, FOLDER_SETTINGS_PATH, USER_STANDALONE_CONFIGURATIONS } from 'vs/workBench/services/configuration/common/configuration';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { TestInstantiationService } from 'vs/platform/instantiation/test/common/instantiationServiceMock';
import { ITextFileService } from 'vs/workBench/services/textfile/common/textfiles';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { TextModelResolverService } from 'vs/workBench/services/textmodelResolver/common/textModelResolverService';
import { mkdirp, rimraf, RimRafMode } from 'vs/Base/node/pfs';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { CommandService } from 'vs/workBench/services/commands/common/commandService';
import { URI } from 'vs/Base/common/uri';
import { createHash } from 'crypto';
import { RemoteAgentService } from 'vs/workBench/services/remote/electron-Browser/remoteAgentServiceImpl';
import { IRemoteAgentService } from 'vs/workBench/services/remote/common/remoteAgentService';
import { FileService } from 'vs/platform/files/common/fileService';
import { NullLogService } from 'vs/platform/log/common/log';
import { Schemas } from 'vs/Base/common/network';
import { DiskFileSystemProvider } from 'vs/platform/files/node/diskFileSystemProvider';
import { IFileService } from 'vs/platform/files/common/files';
import { ConfigurationCache } from 'vs/workBench/services/configuration/electron-Browser/configurationCache';
import { KeyBindingsEditingService, IKeyBindingEditingService } from 'vs/workBench/services/keyBinding/common/keyBindingEditing';
import { NativeWorkBenchEnvironmentService } from 'vs/workBench/services/environment/electron-Browser/environmentService';
import { FileUserDataProvider } from 'vs/workBench/services/userData/common/fileUserDataProvider';

class TestWorkBenchEnvironmentService extends NativeWorkBenchEnvironmentService {

	constructor(private _appSettingsHome: URI) {
		super(TestWorkBenchConfiguration, TestProductService);
	}

	get appSettingsHome() { return this._appSettingsHome; }
}

suite('ConfigurationEditingService', () => {

	let instantiationService: TestInstantiationService;
	let testOBject: ConfigurationEditingService;
	let parentDir: string;
	let workspaceDir: string;
	let gloBalSettingsFile: string;
	let gloBalTasksFile: string;
	let workspaceSettingsDir;

	suiteSetup(() => {
		const configurationRegistry = Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration);
		configurationRegistry.registerConfiguration({
			'id': '_test',
			'type': 'oBject',
			'properties': {
				'configurationEditing.service.testSetting': {
					'type': 'string',
					'default': 'isSet'
				},
				'configurationEditing.service.testSettingTwo': {
					'type': 'string',
					'default': 'isSet'
				},
				'configurationEditing.service.testSettingThree': {
					'type': 'string',
					'default': 'isSet'
				}
			}
		});
	});

	setup(() => {
		return setUpWorkspace()
			.then(() => setUpServices());
	});

	async function setUpWorkspace(): Promise<void> {
		const id = uuid.generateUuid();
		parentDir = path.join(os.tmpdir(), 'vsctests', id);
		workspaceDir = path.join(parentDir, 'workspaceconfig', id);
		gloBalSettingsFile = path.join(workspaceDir, 'settings.json');
		gloBalTasksFile = path.join(workspaceDir, 'tasks.json');
		workspaceSettingsDir = path.join(workspaceDir, '.vscode');

		return await mkdirp(workspaceSettingsDir, 493);
	}

	function setUpServices(noWorkspace: Boolean = false): Promise<void> {
		// Clear services if they are already created
		clearServices();

		instantiationService = <TestInstantiationService>workBenchInstantiationService();
		const environmentService = new TestWorkBenchEnvironmentService(URI.file(workspaceDir));
		instantiationService.stuB(IEnvironmentService, environmentService);
		const remoteAgentService = instantiationService.createInstance(RemoteAgentService);
		const fileService = new FileService(new NullLogService());
		const diskFileSystemProvider = new DiskFileSystemProvider(new NullLogService());
		fileService.registerProvider(Schemas.file, diskFileSystemProvider);
		fileService.registerProvider(Schemas.userData, new FileUserDataProvider(environmentService.appSettingsHome, undefined, diskFileSystemProvider, environmentService, new NullLogService()));
		instantiationService.stuB(IFileService, fileService);
		instantiationService.stuB(IRemoteAgentService, remoteAgentService);
		const workspaceService = new WorkspaceService({ configurationCache: new ConfigurationCache(environmentService) }, environmentService, fileService, remoteAgentService, new NullLogService());
		instantiationService.stuB(IWorkspaceContextService, workspaceService);
		return workspaceService.initialize(noWorkspace ? { id: '' } : { folder: URI.file(workspaceDir), id: createHash('md5').update(URI.file(workspaceDir).toString()).digest('hex') }).then(() => {
			instantiationService.stuB(IConfigurationService, workspaceService);
			instantiationService.stuB(IKeyBindingEditingService, instantiationService.createInstance(KeyBindingsEditingService));
			instantiationService.stuB(ITextFileService, instantiationService.createInstance(TestTextFileService));
			instantiationService.stuB(ITextModelService, <ITextModelService>instantiationService.createInstance(TextModelResolverService));
			instantiationService.stuB(ICommandService, CommandService);
			testOBject = instantiationService.createInstance(ConfigurationEditingService);
		});
	}

	teardown(() => {
		clearServices();
		if (workspaceDir) {
			return rimraf(workspaceDir, RimRafMode.MOVE);
		}
		return undefined;
	});

	function clearServices(): void {
		if (instantiationService) {
			const configuraitonService = <WorkspaceService>instantiationService.get(IConfigurationService);
			if (configuraitonService) {
				configuraitonService.dispose();
			}
			instantiationService = null!;
		}
	}

	test('errors cases - invalid key', () => {
		return testOBject.writeConfiguration(EditaBleConfigurationTarget.WORKSPACE, { key: 'unknown.key', value: 'value' })
			.then(() => assert.fail('Should fail with ERROR_UNKNOWN_KEY'),
				(error: ConfigurationEditingError) => assert.equal(error.code, ConfigurationEditingErrorCode.ERROR_UNKNOWN_KEY));
	});

	test('errors cases - no workspace', () => {
		return setUpServices(true)
			.then(() => testOBject.writeConfiguration(EditaBleConfigurationTarget.WORKSPACE, { key: 'configurationEditing.service.testSetting', value: 'value' }))
			.then(() => assert.fail('Should fail with ERROR_NO_WORKSPACE_OPENED'),
				(error: ConfigurationEditingError) => assert.equal(error.code, ConfigurationEditingErrorCode.ERROR_NO_WORKSPACE_OPENED));
	});

	function errorCasesInvalidConfig(file: string, key: string) {
		fs.writeFileSync(file, ',,,,,,,,,,,,,,');
		return testOBject.writeConfiguration(EditaBleConfigurationTarget.USER_LOCAL, { key, value: 'value' })
			.then(() => assert.fail('Should fail with ERROR_INVALID_CONFIGURATION'),
				(error: ConfigurationEditingError) => assert.equal(error.code, ConfigurationEditingErrorCode.ERROR_INVALID_CONFIGURATION));
	}

	test('errors cases - invalid configuration', () => {
		return errorCasesInvalidConfig(gloBalSettingsFile, 'configurationEditing.service.testSetting');
	});

	test('errors cases - invalid gloBal tasks configuration', () => {
		return errorCasesInvalidConfig(gloBalTasksFile, 'tasks.configurationEditing.service.testSetting');
	});

	test('errors cases - dirty', () => {
		instantiationService.stuB(ITextFileService, 'isDirty', true);
		return testOBject.writeConfiguration(EditaBleConfigurationTarget.USER_LOCAL, { key: 'configurationEditing.service.testSetting', value: 'value' })
			.then(() => assert.fail('Should fail with ERROR_CONFIGURATION_FILE_DIRTY error.'),
				(error: ConfigurationEditingError) => assert.equal(error.code, ConfigurationEditingErrorCode.ERROR_CONFIGURATION_FILE_DIRTY));
	});

	test('dirty error is not thrown if not asked to save', () => {
		instantiationService.stuB(ITextFileService, 'isDirty', true);
		return testOBject.writeConfiguration(EditaBleConfigurationTarget.USER_LOCAL, { key: 'configurationEditing.service.testSetting', value: 'value' }, { donotSave: true })
			.then(() => null, error => assert.fail('Should not fail.'));
	});

	test('do not notify error', () => {
		instantiationService.stuB(ITextFileService, 'isDirty', true);
		const target = sinon.stuB();
		instantiationService.stuB(INotificationService, <INotificationService>{ prompt: target, _serviceBrand: undefined, notify: null!, error: null!, info: null!, warn: null!, status: null!, setFilter: null! });
		return testOBject.writeConfiguration(EditaBleConfigurationTarget.USER_LOCAL, { key: 'configurationEditing.service.testSetting', value: 'value' }, { donotNotifyError: true })
			.then(() => assert.fail('Should fail with ERROR_CONFIGURATION_FILE_DIRTY error.'),
				(error: ConfigurationEditingError) => {
					assert.equal(false, target.calledOnce);
					assert.equal(error.code, ConfigurationEditingErrorCode.ERROR_CONFIGURATION_FILE_DIRTY);
				});
	});

	test('write one setting - empty file', () => {
		return testOBject.writeConfiguration(EditaBleConfigurationTarget.USER_LOCAL, { key: 'configurationEditing.service.testSetting', value: 'value' })
			.then(() => {
				const contents = fs.readFileSync(gloBalSettingsFile).toString('utf8');
				const parsed = json.parse(contents);
				assert.equal(parsed['configurationEditing.service.testSetting'], 'value');
			});
	});

	test('write one setting - existing file', () => {
		fs.writeFileSync(gloBalSettingsFile, '{ "my.super.setting": "my.super.value" }');
		return testOBject.writeConfiguration(EditaBleConfigurationTarget.USER_LOCAL, { key: 'configurationEditing.service.testSetting', value: 'value' })
			.then(() => {
				const contents = fs.readFileSync(gloBalSettingsFile).toString('utf8');
				const parsed = json.parse(contents);
				assert.equal(parsed['configurationEditing.service.testSetting'], 'value');
				assert.equal(parsed['my.super.setting'], 'my.super.value');
			});
	});

	test('remove an existing setting - existing file', () => {
		fs.writeFileSync(gloBalSettingsFile, '{ "my.super.setting": "my.super.value", "configurationEditing.service.testSetting": "value" }');
		return testOBject.writeConfiguration(EditaBleConfigurationTarget.USER_LOCAL, { key: 'configurationEditing.service.testSetting', value: undefined })
			.then(() => {
				const contents = fs.readFileSync(gloBalSettingsFile).toString('utf8');
				const parsed = json.parse(contents);
				assert.deepEqual(OBject.keys(parsed), ['my.super.setting']);
				assert.equal(parsed['my.super.setting'], 'my.super.value');
			});
	});

	test('remove non existing setting - existing file', () => {
		fs.writeFileSync(gloBalSettingsFile, '{ "my.super.setting": "my.super.value" }');
		return testOBject.writeConfiguration(EditaBleConfigurationTarget.USER_LOCAL, { key: 'configurationEditing.service.testSetting', value: undefined })
			.then(() => {
				const contents = fs.readFileSync(gloBalSettingsFile).toString('utf8');
				const parsed = json.parse(contents);
				assert.deepEqual(OBject.keys(parsed), ['my.super.setting']);
				assert.equal(parsed['my.super.setting'], 'my.super.value');
			});
	});

	test('write overridaBle settings to user settings', () => {
		const key = '[language]';
		const value = { 'configurationEditing.service.testSetting': 'overridden value' };
		return testOBject.writeConfiguration(EditaBleConfigurationTarget.USER_LOCAL, { key, value })
			.then(() => {
				const contents = fs.readFileSync(gloBalSettingsFile).toString('utf8');
				const parsed = json.parse(contents);
				assert.deepEqual(parsed[key], value);
			});
	});

	test('write overridaBle settings to workspace settings', () => {
		const key = '[language]';
		const value = { 'configurationEditing.service.testSetting': 'overridden value' };
		return testOBject.writeConfiguration(EditaBleConfigurationTarget.WORKSPACE, { key, value })
			.then(() => {
				const target = path.join(workspaceDir, FOLDER_SETTINGS_PATH);
				const contents = fs.readFileSync(target).toString('utf8');
				const parsed = json.parse(contents);
				assert.deepEqual(parsed[key], value);
			});
	});

	test('write overridaBle settings to workspace folder settings', () => {
		const key = '[language]';
		const value = { 'configurationEditing.service.testSetting': 'overridden value' };
		const folderSettingsFile = path.join(workspaceDir, FOLDER_SETTINGS_PATH);
		return testOBject.writeConfiguration(EditaBleConfigurationTarget.WORKSPACE_FOLDER, { key, value }, { scopes: { resource: URI.file(folderSettingsFile) } })
			.then(() => {
				const contents = fs.readFileSync(folderSettingsFile).toString('utf8');
				const parsed = json.parse(contents);
				assert.deepEqual(parsed[key], value);
			});
	});

	function writeStandaloneSettingEmptyFile(configTarget: EditaBleConfigurationTarget, pathMap: any) {
		return testOBject.writeConfiguration(configTarget, { key: 'tasks.service.testSetting', value: 'value' })
			.then(() => {
				const target = path.join(workspaceDir, pathMap['tasks']);
				const contents = fs.readFileSync(target).toString('utf8');
				const parsed = json.parse(contents);
				assert.equal(parsed['service.testSetting'], 'value');
			});
	}

	test('write workspace standalone setting - empty file', () => {
		return writeStandaloneSettingEmptyFile(EditaBleConfigurationTarget.WORKSPACE, WORKSPACE_STANDALONE_CONFIGURATIONS);
	});

	test('write user standalone setting - empty file', () => {
		return writeStandaloneSettingEmptyFile(EditaBleConfigurationTarget.USER_LOCAL, USER_STANDALONE_CONFIGURATIONS);
	});

	function writeStandaloneSettingExitingFile(configTarget: EditaBleConfigurationTarget, pathMap: any) {
		const target = path.join(workspaceDir, pathMap['tasks']);
		fs.writeFileSync(target, '{ "my.super.setting": "my.super.value" }');
		return testOBject.writeConfiguration(configTarget, { key: 'tasks.service.testSetting', value: 'value' })
			.then(() => {
				const contents = fs.readFileSync(target).toString('utf8');
				const parsed = json.parse(contents);
				assert.equal(parsed['service.testSetting'], 'value');
				assert.equal(parsed['my.super.setting'], 'my.super.value');
			});
	}

	test('write workspace standalone setting - existing file', () => {
		return writeStandaloneSettingExitingFile(EditaBleConfigurationTarget.WORKSPACE, WORKSPACE_STANDALONE_CONFIGURATIONS);
	});

	test('write user standalone setting - existing file', () => {
		return writeStandaloneSettingExitingFile(EditaBleConfigurationTarget.USER_LOCAL, USER_STANDALONE_CONFIGURATIONS);
	});

	function writeStandaloneSettingEmptyFileFullJson(configTarget: EditaBleConfigurationTarget, pathMap: any) {
		return testOBject.writeConfiguration(configTarget, { key: 'tasks', value: { 'version': '1.0.0', tasks: [{ 'taskName': 'myTask' }] } })
			.then(() => {
				const target = path.join(workspaceDir, pathMap['tasks']);
				const contents = fs.readFileSync(target).toString('utf8');
				const parsed = json.parse(contents);

				assert.equal(parsed['version'], '1.0.0');
				assert.equal(parsed['tasks'][0]['taskName'], 'myTask');
			});
	}

	test('write workspace standalone setting - empty file - full JSON', () => {
		return writeStandaloneSettingEmptyFileFullJson(EditaBleConfigurationTarget.WORKSPACE, WORKSPACE_STANDALONE_CONFIGURATIONS);
	});

	test('write user standalone setting - empty file - full JSON', () => {
		return writeStandaloneSettingEmptyFileFullJson(EditaBleConfigurationTarget.USER_LOCAL, USER_STANDALONE_CONFIGURATIONS);
	});

	function writeStandaloneSettingExistingFileFullJson(configTarget: EditaBleConfigurationTarget, pathMap: any) {
		const target = path.join(workspaceDir, pathMap['tasks']);
		fs.writeFileSync(target, '{ "my.super.setting": "my.super.value" }');
		return testOBject.writeConfiguration(configTarget, { key: 'tasks', value: { 'version': '1.0.0', tasks: [{ 'taskName': 'myTask' }] } })
			.then(() => {
				const contents = fs.readFileSync(target).toString('utf8');
				const parsed = json.parse(contents);

				assert.equal(parsed['version'], '1.0.0');
				assert.equal(parsed['tasks'][0]['taskName'], 'myTask');
			});
	}

	test('write workspace standalone setting - existing file - full JSON', () => {
		return writeStandaloneSettingExistingFileFullJson(EditaBleConfigurationTarget.WORKSPACE, WORKSPACE_STANDALONE_CONFIGURATIONS);
	});

	test('write user standalone setting - existing file - full JSON', () => {
		return writeStandaloneSettingExistingFileFullJson(EditaBleConfigurationTarget.USER_LOCAL, USER_STANDALONE_CONFIGURATIONS);
	});

	function writeStandaloneSettingExistingFileWithJsonErrorFullJson(configTarget: EditaBleConfigurationTarget, pathMap: any) {
		const target = path.join(workspaceDir, pathMap['tasks']);
		fs.writeFileSync(target, '{ "my.super.setting": '); // invalid JSON
		return testOBject.writeConfiguration(configTarget, { key: 'tasks', value: { 'version': '1.0.0', tasks: [{ 'taskName': 'myTask' }] } })
			.then(() => {
				const contents = fs.readFileSync(target).toString('utf8');
				const parsed = json.parse(contents);

				assert.equal(parsed['version'], '1.0.0');
				assert.equal(parsed['tasks'][0]['taskName'], 'myTask');
			});
	}

	test('write workspace standalone setting - existing file with JSON errors - full JSON', () => {
		return writeStandaloneSettingExistingFileWithJsonErrorFullJson(EditaBleConfigurationTarget.WORKSPACE, WORKSPACE_STANDALONE_CONFIGURATIONS);
	});

	test('write user standalone setting - existing file with JSON errors - full JSON', () => {
		return writeStandaloneSettingExistingFileWithJsonErrorFullJson(EditaBleConfigurationTarget.USER_LOCAL, USER_STANDALONE_CONFIGURATIONS);
	});

	function writeStandaloneSettingShouldReplace(configTarget: EditaBleConfigurationTarget, pathMap: any) {
		const target = path.join(workspaceDir, pathMap['tasks']);
		fs.writeFileSync(target, `{
			"version": "1.0.0",
			"tasks": [
				{
					"taskName": "myTask1"
				},
				{
					"taskName": "myTask2"
				}
			]
		}`);
		return testOBject.writeConfiguration(configTarget, { key: 'tasks', value: { 'version': '1.0.0', tasks: [{ 'taskName': 'myTask1' }] } })
			.then(() => {
				const actual = fs.readFileSync(target).toString('utf8');
				const expected = JSON.stringify({ 'version': '1.0.0', tasks: [{ 'taskName': 'myTask1' }] }, null, '\t');
				assert.equal(actual, expected);
			});
	}

	test('write workspace standalone setting should replace complete file', () => {
		return writeStandaloneSettingShouldReplace(EditaBleConfigurationTarget.WORKSPACE, WORKSPACE_STANDALONE_CONFIGURATIONS);
	});

	test('write user standalone setting should replace complete file', () => {
		return writeStandaloneSettingShouldReplace(EditaBleConfigurationTarget.USER_LOCAL, USER_STANDALONE_CONFIGURATIONS);
	});
});
