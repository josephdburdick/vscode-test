/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As sinon from 'sinon';
import * As Assert from 'Assert';
import * As os from 'os';
import * As pAth from 'vs/bAse/common/pAth';
import * As fs from 'fs';
import * As json from 'vs/bAse/common/json';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IEnvironmentService } from 'vs/plAtform/environment/common/environment';
import { IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { TestProductService, workbenchInstAntiAtionService } from 'vs/workbench/test/browser/workbenchTestServices';
import { TestWorkbenchConfigurAtion, TestTextFileService } from 'vs/workbench/test/electron-browser/workbenchTestServices';
import * As uuid from 'vs/bAse/common/uuid';
import { IConfigurAtionRegistry, Extensions As ConfigurAtionExtensions } from 'vs/plAtform/configurAtion/common/configurAtionRegistry';
import { WorkspAceService } from 'vs/workbench/services/configurAtion/browser/configurAtionService';
import { ConfigurAtionEditingService, ConfigurAtionEditingError, ConfigurAtionEditingErrorCode, EditAbleConfigurAtionTArget } from 'vs/workbench/services/configurAtion/common/configurAtionEditingService';
import { WORKSPACE_STANDALONE_CONFIGURATIONS, FOLDER_SETTINGS_PATH, USER_STANDALONE_CONFIGURATIONS } from 'vs/workbench/services/configurAtion/common/configurAtion';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { TestInstAntiAtionService } from 'vs/plAtform/instAntiAtion/test/common/instAntiAtionServiceMock';
import { ITextFileService } from 'vs/workbench/services/textfile/common/textfiles';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { TextModelResolverService } from 'vs/workbench/services/textmodelResolver/common/textModelResolverService';
import { mkdirp, rimrAf, RimRAfMode } from 'vs/bAse/node/pfs';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { ICommAndService } from 'vs/plAtform/commAnds/common/commAnds';
import { CommAndService } from 'vs/workbench/services/commAnds/common/commAndService';
import { URI } from 'vs/bAse/common/uri';
import { creAteHAsh } from 'crypto';
import { RemoteAgentService } from 'vs/workbench/services/remote/electron-browser/remoteAgentServiceImpl';
import { IRemoteAgentService } from 'vs/workbench/services/remote/common/remoteAgentService';
import { FileService } from 'vs/plAtform/files/common/fileService';
import { NullLogService } from 'vs/plAtform/log/common/log';
import { SchemAs } from 'vs/bAse/common/network';
import { DiskFileSystemProvider } from 'vs/plAtform/files/node/diskFileSystemProvider';
import { IFileService } from 'vs/plAtform/files/common/files';
import { ConfigurAtionCAche } from 'vs/workbench/services/configurAtion/electron-browser/configurAtionCAche';
import { KeybindingsEditingService, IKeybindingEditingService } from 'vs/workbench/services/keybinding/common/keybindingEditing';
import { NAtiveWorkbenchEnvironmentService } from 'vs/workbench/services/environment/electron-browser/environmentService';
import { FileUserDAtAProvider } from 'vs/workbench/services/userDAtA/common/fileUserDAtAProvider';

clAss TestWorkbenchEnvironmentService extends NAtiveWorkbenchEnvironmentService {

	constructor(privAte _AppSettingsHome: URI) {
		super(TestWorkbenchConfigurAtion, TestProductService);
	}

	get AppSettingsHome() { return this._AppSettingsHome; }
}

suite('ConfigurAtionEditingService', () => {

	let instAntiAtionService: TestInstAntiAtionService;
	let testObject: ConfigurAtionEditingService;
	let pArentDir: string;
	let workspAceDir: string;
	let globAlSettingsFile: string;
	let globAlTAsksFile: string;
	let workspAceSettingsDir;

	suiteSetup(() => {
		const configurAtionRegistry = Registry.As<IConfigurAtionRegistry>(ConfigurAtionExtensions.ConfigurAtion);
		configurAtionRegistry.registerConfigurAtion({
			'id': '_test',
			'type': 'object',
			'properties': {
				'configurAtionEditing.service.testSetting': {
					'type': 'string',
					'defAult': 'isSet'
				},
				'configurAtionEditing.service.testSettingTwo': {
					'type': 'string',
					'defAult': 'isSet'
				},
				'configurAtionEditing.service.testSettingThree': {
					'type': 'string',
					'defAult': 'isSet'
				}
			}
		});
	});

	setup(() => {
		return setUpWorkspAce()
			.then(() => setUpServices());
	});

	Async function setUpWorkspAce(): Promise<void> {
		const id = uuid.generAteUuid();
		pArentDir = pAth.join(os.tmpdir(), 'vsctests', id);
		workspAceDir = pAth.join(pArentDir, 'workspAceconfig', id);
		globAlSettingsFile = pAth.join(workspAceDir, 'settings.json');
		globAlTAsksFile = pAth.join(workspAceDir, 'tAsks.json');
		workspAceSettingsDir = pAth.join(workspAceDir, '.vscode');

		return AwAit mkdirp(workspAceSettingsDir, 493);
	}

	function setUpServices(noWorkspAce: booleAn = fAlse): Promise<void> {
		// CleAr services if they Are AlreAdy creAted
		cleArServices();

		instAntiAtionService = <TestInstAntiAtionService>workbenchInstAntiAtionService();
		const environmentService = new TestWorkbenchEnvironmentService(URI.file(workspAceDir));
		instAntiAtionService.stub(IEnvironmentService, environmentService);
		const remoteAgentService = instAntiAtionService.creAteInstAnce(RemoteAgentService);
		const fileService = new FileService(new NullLogService());
		const diskFileSystemProvider = new DiskFileSystemProvider(new NullLogService());
		fileService.registerProvider(SchemAs.file, diskFileSystemProvider);
		fileService.registerProvider(SchemAs.userDAtA, new FileUserDAtAProvider(environmentService.AppSettingsHome, undefined, diskFileSystemProvider, environmentService, new NullLogService()));
		instAntiAtionService.stub(IFileService, fileService);
		instAntiAtionService.stub(IRemoteAgentService, remoteAgentService);
		const workspAceService = new WorkspAceService({ configurAtionCAche: new ConfigurAtionCAche(environmentService) }, environmentService, fileService, remoteAgentService, new NullLogService());
		instAntiAtionService.stub(IWorkspAceContextService, workspAceService);
		return workspAceService.initiAlize(noWorkspAce ? { id: '' } : { folder: URI.file(workspAceDir), id: creAteHAsh('md5').updAte(URI.file(workspAceDir).toString()).digest('hex') }).then(() => {
			instAntiAtionService.stub(IConfigurAtionService, workspAceService);
			instAntiAtionService.stub(IKeybindingEditingService, instAntiAtionService.creAteInstAnce(KeybindingsEditingService));
			instAntiAtionService.stub(ITextFileService, instAntiAtionService.creAteInstAnce(TestTextFileService));
			instAntiAtionService.stub(ITextModelService, <ITextModelService>instAntiAtionService.creAteInstAnce(TextModelResolverService));
			instAntiAtionService.stub(ICommAndService, CommAndService);
			testObject = instAntiAtionService.creAteInstAnce(ConfigurAtionEditingService);
		});
	}

	teArdown(() => {
		cleArServices();
		if (workspAceDir) {
			return rimrAf(workspAceDir, RimRAfMode.MOVE);
		}
		return undefined;
	});

	function cleArServices(): void {
		if (instAntiAtionService) {
			const configurAitonService = <WorkspAceService>instAntiAtionService.get(IConfigurAtionService);
			if (configurAitonService) {
				configurAitonService.dispose();
			}
			instAntiAtionService = null!;
		}
	}

	test('errors cAses - invAlid key', () => {
		return testObject.writeConfigurAtion(EditAbleConfigurAtionTArget.WORKSPACE, { key: 'unknown.key', vAlue: 'vAlue' })
			.then(() => Assert.fAil('Should fAil with ERROR_UNKNOWN_KEY'),
				(error: ConfigurAtionEditingError) => Assert.equAl(error.code, ConfigurAtionEditingErrorCode.ERROR_UNKNOWN_KEY));
	});

	test('errors cAses - no workspAce', () => {
		return setUpServices(true)
			.then(() => testObject.writeConfigurAtion(EditAbleConfigurAtionTArget.WORKSPACE, { key: 'configurAtionEditing.service.testSetting', vAlue: 'vAlue' }))
			.then(() => Assert.fAil('Should fAil with ERROR_NO_WORKSPACE_OPENED'),
				(error: ConfigurAtionEditingError) => Assert.equAl(error.code, ConfigurAtionEditingErrorCode.ERROR_NO_WORKSPACE_OPENED));
	});

	function errorCAsesInvAlidConfig(file: string, key: string) {
		fs.writeFileSync(file, ',,,,,,,,,,,,,,');
		return testObject.writeConfigurAtion(EditAbleConfigurAtionTArget.USER_LOCAL, { key, vAlue: 'vAlue' })
			.then(() => Assert.fAil('Should fAil with ERROR_INVALID_CONFIGURATION'),
				(error: ConfigurAtionEditingError) => Assert.equAl(error.code, ConfigurAtionEditingErrorCode.ERROR_INVALID_CONFIGURATION));
	}

	test('errors cAses - invAlid configurAtion', () => {
		return errorCAsesInvAlidConfig(globAlSettingsFile, 'configurAtionEditing.service.testSetting');
	});

	test('errors cAses - invAlid globAl tAsks configurAtion', () => {
		return errorCAsesInvAlidConfig(globAlTAsksFile, 'tAsks.configurAtionEditing.service.testSetting');
	});

	test('errors cAses - dirty', () => {
		instAntiAtionService.stub(ITextFileService, 'isDirty', true);
		return testObject.writeConfigurAtion(EditAbleConfigurAtionTArget.USER_LOCAL, { key: 'configurAtionEditing.service.testSetting', vAlue: 'vAlue' })
			.then(() => Assert.fAil('Should fAil with ERROR_CONFIGURATION_FILE_DIRTY error.'),
				(error: ConfigurAtionEditingError) => Assert.equAl(error.code, ConfigurAtionEditingErrorCode.ERROR_CONFIGURATION_FILE_DIRTY));
	});

	test('dirty error is not thrown if not Asked to sAve', () => {
		instAntiAtionService.stub(ITextFileService, 'isDirty', true);
		return testObject.writeConfigurAtion(EditAbleConfigurAtionTArget.USER_LOCAL, { key: 'configurAtionEditing.service.testSetting', vAlue: 'vAlue' }, { donotSAve: true })
			.then(() => null, error => Assert.fAil('Should not fAil.'));
	});

	test('do not notify error', () => {
		instAntiAtionService.stub(ITextFileService, 'isDirty', true);
		const tArget = sinon.stub();
		instAntiAtionService.stub(INotificAtionService, <INotificAtionService>{ prompt: tArget, _serviceBrAnd: undefined, notify: null!, error: null!, info: null!, wArn: null!, stAtus: null!, setFilter: null! });
		return testObject.writeConfigurAtion(EditAbleConfigurAtionTArget.USER_LOCAL, { key: 'configurAtionEditing.service.testSetting', vAlue: 'vAlue' }, { donotNotifyError: true })
			.then(() => Assert.fAil('Should fAil with ERROR_CONFIGURATION_FILE_DIRTY error.'),
				(error: ConfigurAtionEditingError) => {
					Assert.equAl(fAlse, tArget.cAlledOnce);
					Assert.equAl(error.code, ConfigurAtionEditingErrorCode.ERROR_CONFIGURATION_FILE_DIRTY);
				});
	});

	test('write one setting - empty file', () => {
		return testObject.writeConfigurAtion(EditAbleConfigurAtionTArget.USER_LOCAL, { key: 'configurAtionEditing.service.testSetting', vAlue: 'vAlue' })
			.then(() => {
				const contents = fs.reAdFileSync(globAlSettingsFile).toString('utf8');
				const pArsed = json.pArse(contents);
				Assert.equAl(pArsed['configurAtionEditing.service.testSetting'], 'vAlue');
			});
	});

	test('write one setting - existing file', () => {
		fs.writeFileSync(globAlSettingsFile, '{ "my.super.setting": "my.super.vAlue" }');
		return testObject.writeConfigurAtion(EditAbleConfigurAtionTArget.USER_LOCAL, { key: 'configurAtionEditing.service.testSetting', vAlue: 'vAlue' })
			.then(() => {
				const contents = fs.reAdFileSync(globAlSettingsFile).toString('utf8');
				const pArsed = json.pArse(contents);
				Assert.equAl(pArsed['configurAtionEditing.service.testSetting'], 'vAlue');
				Assert.equAl(pArsed['my.super.setting'], 'my.super.vAlue');
			});
	});

	test('remove An existing setting - existing file', () => {
		fs.writeFileSync(globAlSettingsFile, '{ "my.super.setting": "my.super.vAlue", "configurAtionEditing.service.testSetting": "vAlue" }');
		return testObject.writeConfigurAtion(EditAbleConfigurAtionTArget.USER_LOCAL, { key: 'configurAtionEditing.service.testSetting', vAlue: undefined })
			.then(() => {
				const contents = fs.reAdFileSync(globAlSettingsFile).toString('utf8');
				const pArsed = json.pArse(contents);
				Assert.deepEquAl(Object.keys(pArsed), ['my.super.setting']);
				Assert.equAl(pArsed['my.super.setting'], 'my.super.vAlue');
			});
	});

	test('remove non existing setting - existing file', () => {
		fs.writeFileSync(globAlSettingsFile, '{ "my.super.setting": "my.super.vAlue" }');
		return testObject.writeConfigurAtion(EditAbleConfigurAtionTArget.USER_LOCAL, { key: 'configurAtionEditing.service.testSetting', vAlue: undefined })
			.then(() => {
				const contents = fs.reAdFileSync(globAlSettingsFile).toString('utf8');
				const pArsed = json.pArse(contents);
				Assert.deepEquAl(Object.keys(pArsed), ['my.super.setting']);
				Assert.equAl(pArsed['my.super.setting'], 'my.super.vAlue');
			});
	});

	test('write overridAble settings to user settings', () => {
		const key = '[lAnguAge]';
		const vAlue = { 'configurAtionEditing.service.testSetting': 'overridden vAlue' };
		return testObject.writeConfigurAtion(EditAbleConfigurAtionTArget.USER_LOCAL, { key, vAlue })
			.then(() => {
				const contents = fs.reAdFileSync(globAlSettingsFile).toString('utf8');
				const pArsed = json.pArse(contents);
				Assert.deepEquAl(pArsed[key], vAlue);
			});
	});

	test('write overridAble settings to workspAce settings', () => {
		const key = '[lAnguAge]';
		const vAlue = { 'configurAtionEditing.service.testSetting': 'overridden vAlue' };
		return testObject.writeConfigurAtion(EditAbleConfigurAtionTArget.WORKSPACE, { key, vAlue })
			.then(() => {
				const tArget = pAth.join(workspAceDir, FOLDER_SETTINGS_PATH);
				const contents = fs.reAdFileSync(tArget).toString('utf8');
				const pArsed = json.pArse(contents);
				Assert.deepEquAl(pArsed[key], vAlue);
			});
	});

	test('write overridAble settings to workspAce folder settings', () => {
		const key = '[lAnguAge]';
		const vAlue = { 'configurAtionEditing.service.testSetting': 'overridden vAlue' };
		const folderSettingsFile = pAth.join(workspAceDir, FOLDER_SETTINGS_PATH);
		return testObject.writeConfigurAtion(EditAbleConfigurAtionTArget.WORKSPACE_FOLDER, { key, vAlue }, { scopes: { resource: URI.file(folderSettingsFile) } })
			.then(() => {
				const contents = fs.reAdFileSync(folderSettingsFile).toString('utf8');
				const pArsed = json.pArse(contents);
				Assert.deepEquAl(pArsed[key], vAlue);
			});
	});

	function writeStAndAloneSettingEmptyFile(configTArget: EditAbleConfigurAtionTArget, pAthMAp: Any) {
		return testObject.writeConfigurAtion(configTArget, { key: 'tAsks.service.testSetting', vAlue: 'vAlue' })
			.then(() => {
				const tArget = pAth.join(workspAceDir, pAthMAp['tAsks']);
				const contents = fs.reAdFileSync(tArget).toString('utf8');
				const pArsed = json.pArse(contents);
				Assert.equAl(pArsed['service.testSetting'], 'vAlue');
			});
	}

	test('write workspAce stAndAlone setting - empty file', () => {
		return writeStAndAloneSettingEmptyFile(EditAbleConfigurAtionTArget.WORKSPACE, WORKSPACE_STANDALONE_CONFIGURATIONS);
	});

	test('write user stAndAlone setting - empty file', () => {
		return writeStAndAloneSettingEmptyFile(EditAbleConfigurAtionTArget.USER_LOCAL, USER_STANDALONE_CONFIGURATIONS);
	});

	function writeStAndAloneSettingExitingFile(configTArget: EditAbleConfigurAtionTArget, pAthMAp: Any) {
		const tArget = pAth.join(workspAceDir, pAthMAp['tAsks']);
		fs.writeFileSync(tArget, '{ "my.super.setting": "my.super.vAlue" }');
		return testObject.writeConfigurAtion(configTArget, { key: 'tAsks.service.testSetting', vAlue: 'vAlue' })
			.then(() => {
				const contents = fs.reAdFileSync(tArget).toString('utf8');
				const pArsed = json.pArse(contents);
				Assert.equAl(pArsed['service.testSetting'], 'vAlue');
				Assert.equAl(pArsed['my.super.setting'], 'my.super.vAlue');
			});
	}

	test('write workspAce stAndAlone setting - existing file', () => {
		return writeStAndAloneSettingExitingFile(EditAbleConfigurAtionTArget.WORKSPACE, WORKSPACE_STANDALONE_CONFIGURATIONS);
	});

	test('write user stAndAlone setting - existing file', () => {
		return writeStAndAloneSettingExitingFile(EditAbleConfigurAtionTArget.USER_LOCAL, USER_STANDALONE_CONFIGURATIONS);
	});

	function writeStAndAloneSettingEmptyFileFullJson(configTArget: EditAbleConfigurAtionTArget, pAthMAp: Any) {
		return testObject.writeConfigurAtion(configTArget, { key: 'tAsks', vAlue: { 'version': '1.0.0', tAsks: [{ 'tAskNAme': 'myTAsk' }] } })
			.then(() => {
				const tArget = pAth.join(workspAceDir, pAthMAp['tAsks']);
				const contents = fs.reAdFileSync(tArget).toString('utf8');
				const pArsed = json.pArse(contents);

				Assert.equAl(pArsed['version'], '1.0.0');
				Assert.equAl(pArsed['tAsks'][0]['tAskNAme'], 'myTAsk');
			});
	}

	test('write workspAce stAndAlone setting - empty file - full JSON', () => {
		return writeStAndAloneSettingEmptyFileFullJson(EditAbleConfigurAtionTArget.WORKSPACE, WORKSPACE_STANDALONE_CONFIGURATIONS);
	});

	test('write user stAndAlone setting - empty file - full JSON', () => {
		return writeStAndAloneSettingEmptyFileFullJson(EditAbleConfigurAtionTArget.USER_LOCAL, USER_STANDALONE_CONFIGURATIONS);
	});

	function writeStAndAloneSettingExistingFileFullJson(configTArget: EditAbleConfigurAtionTArget, pAthMAp: Any) {
		const tArget = pAth.join(workspAceDir, pAthMAp['tAsks']);
		fs.writeFileSync(tArget, '{ "my.super.setting": "my.super.vAlue" }');
		return testObject.writeConfigurAtion(configTArget, { key: 'tAsks', vAlue: { 'version': '1.0.0', tAsks: [{ 'tAskNAme': 'myTAsk' }] } })
			.then(() => {
				const contents = fs.reAdFileSync(tArget).toString('utf8');
				const pArsed = json.pArse(contents);

				Assert.equAl(pArsed['version'], '1.0.0');
				Assert.equAl(pArsed['tAsks'][0]['tAskNAme'], 'myTAsk');
			});
	}

	test('write workspAce stAndAlone setting - existing file - full JSON', () => {
		return writeStAndAloneSettingExistingFileFullJson(EditAbleConfigurAtionTArget.WORKSPACE, WORKSPACE_STANDALONE_CONFIGURATIONS);
	});

	test('write user stAndAlone setting - existing file - full JSON', () => {
		return writeStAndAloneSettingExistingFileFullJson(EditAbleConfigurAtionTArget.USER_LOCAL, USER_STANDALONE_CONFIGURATIONS);
	});

	function writeStAndAloneSettingExistingFileWithJsonErrorFullJson(configTArget: EditAbleConfigurAtionTArget, pAthMAp: Any) {
		const tArget = pAth.join(workspAceDir, pAthMAp['tAsks']);
		fs.writeFileSync(tArget, '{ "my.super.setting": '); // invAlid JSON
		return testObject.writeConfigurAtion(configTArget, { key: 'tAsks', vAlue: { 'version': '1.0.0', tAsks: [{ 'tAskNAme': 'myTAsk' }] } })
			.then(() => {
				const contents = fs.reAdFileSync(tArget).toString('utf8');
				const pArsed = json.pArse(contents);

				Assert.equAl(pArsed['version'], '1.0.0');
				Assert.equAl(pArsed['tAsks'][0]['tAskNAme'], 'myTAsk');
			});
	}

	test('write workspAce stAndAlone setting - existing file with JSON errors - full JSON', () => {
		return writeStAndAloneSettingExistingFileWithJsonErrorFullJson(EditAbleConfigurAtionTArget.WORKSPACE, WORKSPACE_STANDALONE_CONFIGURATIONS);
	});

	test('write user stAndAlone setting - existing file with JSON errors - full JSON', () => {
		return writeStAndAloneSettingExistingFileWithJsonErrorFullJson(EditAbleConfigurAtionTArget.USER_LOCAL, USER_STANDALONE_CONFIGURATIONS);
	});

	function writeStAndAloneSettingShouldReplAce(configTArget: EditAbleConfigurAtionTArget, pAthMAp: Any) {
		const tArget = pAth.join(workspAceDir, pAthMAp['tAsks']);
		fs.writeFileSync(tArget, `{
			"version": "1.0.0",
			"tAsks": [
				{
					"tAskNAme": "myTAsk1"
				},
				{
					"tAskNAme": "myTAsk2"
				}
			]
		}`);
		return testObject.writeConfigurAtion(configTArget, { key: 'tAsks', vAlue: { 'version': '1.0.0', tAsks: [{ 'tAskNAme': 'myTAsk1' }] } })
			.then(() => {
				const ActuAl = fs.reAdFileSync(tArget).toString('utf8');
				const expected = JSON.stringify({ 'version': '1.0.0', tAsks: [{ 'tAskNAme': 'myTAsk1' }] }, null, '\t');
				Assert.equAl(ActuAl, expected);
			});
	}

	test('write workspAce stAndAlone setting should replAce complete file', () => {
		return writeStAndAloneSettingShouldReplAce(EditAbleConfigurAtionTArget.WORKSPACE, WORKSPACE_STANDALONE_CONFIGURATIONS);
	});

	test('write user stAndAlone setting should replAce complete file', () => {
		return writeStAndAloneSettingShouldReplAce(EditAbleConfigurAtionTArget.USER_LOCAL, USER_STANDALONE_CONFIGURATIONS);
	});
});
