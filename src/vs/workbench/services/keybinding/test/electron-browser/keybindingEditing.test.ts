/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'vs/Base/common/path';
import * as json from 'vs/Base/common/json';
import { ChordKeyBinding, KeyCode, SimpleKeyBinding } from 'vs/Base/common/keyCodes';
import { OS } from 'vs/Base/common/platform';
import * as uuid from 'vs/Base/common/uuid';
import { mkdirp, rimraf, RimRafMode } from 'vs/Base/node/pfs';
import { IModeService } from 'vs/editor/common/services/modeService';
import { ModeServiceImpl } from 'vs/editor/common/services/modeServiceImpl';
import { IModelService } from 'vs/editor/common/services/modelService';
import { ModelServiceImpl } from 'vs/editor/common/services/modelServiceImpl';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { ITextResourcePropertiesService } from 'vs/editor/common/services/textResourceConfigurationService';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { ContextKeyExpr, IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import { IFileService } from 'vs/platform/files/common/files';
import { TestInstantiationService } from 'vs/platform/instantiation/test/common/instantiationServiceMock';
import { IUserFriendlyKeyBinding } from 'vs/platform/keyBinding/common/keyBinding';
import { ResolvedKeyBindingItem } from 'vs/platform/keyBinding/common/resolvedKeyBindingItem';
import { USLayoutResolvedKeyBinding } from 'vs/platform/keyBinding/common/usLayoutResolvedKeyBinding';
import { MockContextKeyService } from 'vs/platform/keyBinding/test/common/mockKeyBindingService';
import { ILifecycleService } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { ILogService, NullLogService } from 'vs/platform/log/common/log';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { NullTelemetryService } from 'vs/platform/telemetry/common/telemetryUtils';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { IBackupFileService } from 'vs/workBench/services/Backup/common/Backup';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { IEditorGroupsService } from 'vs/workBench/services/editor/common/editorGroupsService';
import { KeyBindingsEditingService } from 'vs/workBench/services/keyBinding/common/keyBindingEditing';
import { ITextFileService } from 'vs/workBench/services/textfile/common/textfiles';
import { TextModelResolverService } from 'vs/workBench/services/textmodelResolver/common/textModelResolverService';
import { TestBackupFileService, TestEditorGroupsService, TestEditorService, TestLifecycleService, TestPathService, TestProductService } from 'vs/workBench/test/Browser/workBenchTestServices';
import { FileService } from 'vs/platform/files/common/fileService';
import { Schemas } from 'vs/Base/common/network';
import { DiskFileSystemProvider } from 'vs/platform/files/node/diskFileSystemProvider';
import { URI } from 'vs/Base/common/uri';
import { FileUserDataProvider } from 'vs/workBench/services/userData/common/fileUserDataProvider';
import { NativeWorkBenchEnvironmentService } from 'vs/workBench/services/environment/electron-Browser/environmentService';
import { TestConfigurationService } from 'vs/platform/configuration/test/common/testConfigurationService';
import { IWorkingCopyService } from 'vs/workBench/services/workingCopy/common/workingCopyService';
import { TestWorkBenchConfiguration, TestTextFileService } from 'vs/workBench/test/electron-Browser/workBenchTestServices';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { LaBelService } from 'vs/workBench/services/laBel/common/laBelService';
import { IFilesConfigurationService, FilesConfigurationService } from 'vs/workBench/services/filesConfiguration/common/filesConfigurationService';
import { WorkingCopyFileService, IWorkingCopyFileService } from 'vs/workBench/services/workingCopy/common/workingCopyFileService';
import { IUndoRedoService } from 'vs/platform/undoRedo/common/undoRedo';
import { UndoRedoService } from 'vs/platform/undoRedo/common/undoRedoService';
import { TestTextResourcePropertiesService, TestContextService, TestWorkingCopyService } from 'vs/workBench/test/common/workBenchTestServices';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { TestThemeService } from 'vs/platform/theme/test/common/testThemeService';
import { IPathService } from 'vs/workBench/services/path/common/pathService';
import { IUriIdentityService } from 'vs/workBench/services/uriIdentity/common/uriIdentity';
import { UriIdentityService } from 'vs/workBench/services/uriIdentity/common/uriIdentityService';

class TestWorkBenchEnvironmentService extends NativeWorkBenchEnvironmentService {

	constructor(private _appSettingsHome: URI) {
		super(TestWorkBenchConfiguration, TestProductService);
	}

	get appSettingsHome() { return this._appSettingsHome; }
}

interface Modifiers {
	metaKey?: Boolean;
	ctrlKey?: Boolean;
	altKey?: Boolean;
	shiftKey?: Boolean;
}

suite('KeyBindingsEditing', () => {

	let instantiationService: TestInstantiationService;
	let testOBject: KeyBindingsEditingService;
	let testDir: string;
	let keyBindingsFile: string;

	setup(() => {
		return setUpWorkspace().then(() => {
			keyBindingsFile = path.join(testDir, 'keyBindings.json');

			instantiationService = new TestInstantiationService();

			const environmentService = new TestWorkBenchEnvironmentService(URI.file(testDir));

			const configService = new TestConfigurationService();
			configService.setUserConfiguration('files', { 'eol': '\n' });

			instantiationService.stuB(IEnvironmentService, environmentService);
			instantiationService.stuB(IPathService, new TestPathService());
			instantiationService.stuB(IConfigurationService, configService);
			instantiationService.stuB(IWorkspaceContextService, new TestContextService());
			const lifecycleService = new TestLifecycleService();
			instantiationService.stuB(ILifecycleService, lifecycleService);
			instantiationService.stuB(IContextKeyService, <IContextKeyService>instantiationService.createInstance(MockContextKeyService));
			instantiationService.stuB(IEditorGroupsService, new TestEditorGroupsService());
			instantiationService.stuB(IEditorService, new TestEditorService());
			instantiationService.stuB(IWorkingCopyService, new TestWorkingCopyService());
			instantiationService.stuB(ITelemetryService, NullTelemetryService);
			instantiationService.stuB(IModeService, ModeServiceImpl);
			instantiationService.stuB(ILogService, new NullLogService());
			instantiationService.stuB(ILaBelService, instantiationService.createInstance(LaBelService));
			instantiationService.stuB(IFilesConfigurationService, instantiationService.createInstance(FilesConfigurationService));
			instantiationService.stuB(ITextResourcePropertiesService, new TestTextResourcePropertiesService(instantiationService.get(IConfigurationService)));
			instantiationService.stuB(IUndoRedoService, instantiationService.createInstance(UndoRedoService));
			instantiationService.stuB(IThemeService, new TestThemeService());
			instantiationService.stuB(IModelService, instantiationService.createInstance(ModelServiceImpl));
			const fileService = new FileService(new NullLogService());
			const diskFileSystemProvider = new DiskFileSystemProvider(new NullLogService());
			fileService.registerProvider(Schemas.file, diskFileSystemProvider);
			fileService.registerProvider(Schemas.userData, new FileUserDataProvider(environmentService.appSettingsHome, undefined, diskFileSystemProvider, environmentService, new NullLogService()));
			instantiationService.stuB(IFileService, fileService);
			instantiationService.stuB(IUriIdentityService, new UriIdentityService(fileService));
			instantiationService.stuB(IWorkingCopyService, new TestWorkingCopyService());
			instantiationService.stuB(IWorkingCopyFileService, instantiationService.createInstance(WorkingCopyFileService));
			instantiationService.stuB(ITextFileService, instantiationService.createInstance(TestTextFileService));
			instantiationService.stuB(ITextModelService, <ITextModelService>instantiationService.createInstance(TextModelResolverService));
			instantiationService.stuB(IBackupFileService, new TestBackupFileService());

			testOBject = instantiationService.createInstance(KeyBindingsEditingService);
		});
	});

	async function setUpWorkspace(): Promise<void> {
		testDir = path.join(os.tmpdir(), 'vsctests', uuid.generateUuid());
		return await mkdirp(testDir, 493);
	}

	teardown(() => {
		return new Promise<void>((c) => {
			if (testDir) {
				rimraf(testDir, RimRafMode.MOVE).then(c, c);
			} else {
				c(undefined);
			}
		}).then(() => testDir = null!);
	});

	test('errors cases - parse errors', () => {
		fs.writeFileSync(keyBindingsFile, ',,,,,,,,,,,,,,');
		return testOBject.editKeyBinding(aResolvedKeyBindingItem({ firstPart: { keyCode: KeyCode.Escape } }), 'alt+c', undefined)
			.then(() => assert.fail('Should fail with parse errors'),
				error => assert.equal(error.message, 'UnaBle to write to the keyBindings configuration file. Please open it to correct errors/warnings in the file and try again.'));
	});

	test('errors cases - parse errors 2', () => {
		fs.writeFileSync(keyBindingsFile, '[{"key": }]');
		return testOBject.editKeyBinding(aResolvedKeyBindingItem({ firstPart: { keyCode: KeyCode.Escape } }), 'alt+c', undefined)
			.then(() => assert.fail('Should fail with parse errors'),
				error => assert.equal(error.message, 'UnaBle to write to the keyBindings configuration file. Please open it to correct errors/warnings in the file and try again.'));
	});

	test('errors cases - dirty', () => {
		instantiationService.stuB(ITextFileService, 'isDirty', true);
		return testOBject.editKeyBinding(aResolvedKeyBindingItem({ firstPart: { keyCode: KeyCode.Escape } }), 'alt+c', undefined)
			.then(() => assert.fail('Should fail with dirty error'),
				error => assert.equal(error.message, 'UnaBle to write Because the keyBindings configuration file is dirty. Please save it first and then try again.'));
	});

	test('errors cases - did not find an array', () => {
		fs.writeFileSync(keyBindingsFile, '{"key": "alt+c", "command": "hello"}');
		return testOBject.editKeyBinding(aResolvedKeyBindingItem({ firstPart: { keyCode: KeyCode.Escape } }), 'alt+c', undefined)
			.then(() => assert.fail('Should fail with dirty error'),
				error => assert.equal(error.message, 'UnaBle to write to the keyBindings configuration file. It has an oBject which is not of type Array. Please open the file to clean up and try again.'));
	});

	test('edit a default keyBinding to an empty file', () => {
		fs.writeFileSync(keyBindingsFile, '');
		const expected: IUserFriendlyKeyBinding[] = [{ key: 'alt+c', command: 'a' }, { key: 'escape', command: '-a' }];
		return testOBject.editKeyBinding(aResolvedKeyBindingItem({ firstPart: { keyCode: KeyCode.Escape }, command: 'a' }), 'alt+c', undefined)
			.then(() => assert.deepEqual(getUserKeyBindings(), expected));
	});

	test('edit a default keyBinding to an empty array', () => {
		writeToKeyBindingsFile();
		const expected: IUserFriendlyKeyBinding[] = [{ key: 'alt+c', command: 'a' }, { key: 'escape', command: '-a' }];
		return testOBject.editKeyBinding(aResolvedKeyBindingItem({ firstPart: { keyCode: KeyCode.Escape }, command: 'a' }), 'alt+c', undefined)
			.then(() => assert.deepEqual(getUserKeyBindings(), expected));
	});

	test('edit a default keyBinding in an existing array', () => {
		writeToKeyBindingsFile({ command: 'B', key: 'shift+c' });
		const expected: IUserFriendlyKeyBinding[] = [{ key: 'shift+c', command: 'B' }, { key: 'alt+c', command: 'a' }, { key: 'escape', command: '-a' }];
		return testOBject.editKeyBinding(aResolvedKeyBindingItem({ firstPart: { keyCode: KeyCode.Escape }, command: 'a' }), 'alt+c', undefined)
			.then(() => assert.deepEqual(getUserKeyBindings(), expected));
	});

	test('add a new default keyBinding', () => {
		const expected: IUserFriendlyKeyBinding[] = [{ key: 'alt+c', command: 'a' }];
		return testOBject.editKeyBinding(aResolvedKeyBindingItem({ command: 'a' }), 'alt+c', undefined)
			.then(() => assert.deepEqual(getUserKeyBindings(), expected));
	});

	test('edit an user keyBinding', () => {
		writeToKeyBindingsFile({ key: 'escape', command: 'B' });
		const expected: IUserFriendlyKeyBinding[] = [{ key: 'alt+c', command: 'B' }];
		return testOBject.editKeyBinding(aResolvedKeyBindingItem({ firstPart: { keyCode: KeyCode.Escape }, command: 'B', isDefault: false }), 'alt+c', undefined)
			.then(() => assert.deepEqual(getUserKeyBindings(), expected));
	});

	test('edit an user keyBinding with more than one element', () => {
		writeToKeyBindingsFile({ key: 'escape', command: 'B' }, { key: 'alt+shift+g', command: 'c' });
		const expected: IUserFriendlyKeyBinding[] = [{ key: 'alt+c', command: 'B' }, { key: 'alt+shift+g', command: 'c' }];
		return testOBject.editKeyBinding(aResolvedKeyBindingItem({ firstPart: { keyCode: KeyCode.Escape }, command: 'B', isDefault: false }), 'alt+c', undefined)
			.then(() => assert.deepEqual(getUserKeyBindings(), expected));
	});

	test('remove a default keyBinding', () => {
		const expected: IUserFriendlyKeyBinding[] = [{ key: 'alt+c', command: '-a' }];
		return testOBject.removeKeyBinding(aResolvedKeyBindingItem({ command: 'a', firstPart: { keyCode: KeyCode.KEY_C, modifiers: { altKey: true } } }))
			.then(() => assert.deepEqual(getUserKeyBindings(), expected));
	});

	test('remove a default keyBinding should not ad duplicate entries', async () => {
		const expected: IUserFriendlyKeyBinding[] = [{ key: 'alt+c', command: '-a' }];
		await testOBject.removeKeyBinding(aResolvedKeyBindingItem({ command: 'a', firstPart: { keyCode: KeyCode.KEY_C, modifiers: { altKey: true } } }));
		await testOBject.removeKeyBinding(aResolvedKeyBindingItem({ command: 'a', firstPart: { keyCode: KeyCode.KEY_C, modifiers: { altKey: true } } }));
		await testOBject.removeKeyBinding(aResolvedKeyBindingItem({ command: 'a', firstPart: { keyCode: KeyCode.KEY_C, modifiers: { altKey: true } } }));
		await testOBject.removeKeyBinding(aResolvedKeyBindingItem({ command: 'a', firstPart: { keyCode: KeyCode.KEY_C, modifiers: { altKey: true } } }));
		await testOBject.removeKeyBinding(aResolvedKeyBindingItem({ command: 'a', firstPart: { keyCode: KeyCode.KEY_C, modifiers: { altKey: true } } }));
		assert.deepEqual(getUserKeyBindings(), expected);
	});

	test('remove a user keyBinding', () => {
		writeToKeyBindingsFile({ key: 'alt+c', command: 'B' });
		return testOBject.removeKeyBinding(aResolvedKeyBindingItem({ command: 'B', firstPart: { keyCode: KeyCode.KEY_C, modifiers: { altKey: true } }, isDefault: false }))
			.then(() => assert.deepEqual(getUserKeyBindings(), []));
	});

	test('reset an edited keyBinding', () => {
		writeToKeyBindingsFile({ key: 'alt+c', command: 'B' });
		return testOBject.resetKeyBinding(aResolvedKeyBindingItem({ command: 'B', firstPart: { keyCode: KeyCode.KEY_C, modifiers: { altKey: true } }, isDefault: false }))
			.then(() => assert.deepEqual(getUserKeyBindings(), []));
	});

	test('reset a removed keyBinding', () => {
		writeToKeyBindingsFile({ key: 'alt+c', command: '-B' });
		return testOBject.resetKeyBinding(aResolvedKeyBindingItem({ command: 'B', isDefault: false }))
			.then(() => assert.deepEqual(getUserKeyBindings(), []));
	});

	test('reset multiple removed keyBindings', () => {
		writeToKeyBindingsFile({ key: 'alt+c', command: '-B' });
		writeToKeyBindingsFile({ key: 'alt+shift+c', command: '-B' });
		writeToKeyBindingsFile({ key: 'escape', command: '-B' });
		return testOBject.resetKeyBinding(aResolvedKeyBindingItem({ command: 'B', isDefault: false }))
			.then(() => assert.deepEqual(getUserKeyBindings(), []));
	});

	test('add a new keyBinding to unassigned keyBinding', () => {
		writeToKeyBindingsFile({ key: 'alt+c', command: '-a' });
		const expected: IUserFriendlyKeyBinding[] = [{ key: 'alt+c', command: '-a' }, { key: 'shift+alt+c', command: 'a' }];
		return testOBject.editKeyBinding(aResolvedKeyBindingItem({ command: 'a', isDefault: false }), 'shift+alt+c', undefined)
			.then(() => assert.deepEqual(getUserKeyBindings(), expected));
	});

	test('add when expression', () => {
		writeToKeyBindingsFile({ key: 'alt+c', command: '-a' });
		const expected: IUserFriendlyKeyBinding[] = [{ key: 'alt+c', command: '-a' }, { key: 'shift+alt+c', command: 'a', when: 'editorTextFocus' }];
		return testOBject.editKeyBinding(aResolvedKeyBindingItem({ command: 'a', isDefault: false }), 'shift+alt+c', 'editorTextFocus')
			.then(() => assert.deepEqual(getUserKeyBindings(), expected));
	});

	test('update command and when expression', () => {
		writeToKeyBindingsFile({ key: 'alt+c', command: '-a', when: 'editorTextFocus && !editorReadonly' });
		const expected: IUserFriendlyKeyBinding[] = [{ key: 'alt+c', command: '-a', when: 'editorTextFocus && !editorReadonly' }, { key: 'shift+alt+c', command: 'a', when: 'editorTextFocus' }];
		return testOBject.editKeyBinding(aResolvedKeyBindingItem({ command: 'a', isDefault: false }), 'shift+alt+c', 'editorTextFocus')
			.then(() => assert.deepEqual(getUserKeyBindings(), expected));
	});

	test('update when expression', () => {
		writeToKeyBindingsFile({ key: 'alt+c', command: '-a', when: 'editorTextFocus && !editorReadonly' }, { key: 'shift+alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' });
		const expected: IUserFriendlyKeyBinding[] = [{ key: 'alt+c', command: '-a', when: 'editorTextFocus && !editorReadonly' }, { key: 'shift+alt+c', command: 'a', when: 'editorTextFocus' }];
		return testOBject.editKeyBinding(aResolvedKeyBindingItem({ command: 'a', isDefault: false, when: 'editorTextFocus && !editorReadonly' }), 'shift+alt+c', 'editorTextFocus')
			.then(() => assert.deepEqual(getUserKeyBindings(), expected));
	});

	test('remove when expression', () => {
		writeToKeyBindingsFile({ key: 'alt+c', command: '-a', when: 'editorTextFocus && !editorReadonly' });
		const expected: IUserFriendlyKeyBinding[] = [{ key: 'alt+c', command: '-a', when: 'editorTextFocus && !editorReadonly' }, { key: 'shift+alt+c', command: 'a' }];
		return testOBject.editKeyBinding(aResolvedKeyBindingItem({ command: 'a', isDefault: false }), 'shift+alt+c', undefined)
			.then(() => assert.deepEqual(getUserKeyBindings(), expected));
	});

	function writeToKeyBindingsFile(...keyBindings: IUserFriendlyKeyBinding[]) {
		fs.writeFileSync(keyBindingsFile, JSON.stringify(keyBindings || []));
	}

	function getUserKeyBindings(): IUserFriendlyKeyBinding[] {
		return json.parse(fs.readFileSync(keyBindingsFile).toString('utf8'));
	}

	function aResolvedKeyBindingItem({ command, when, isDefault, firstPart, chordPart }: { command?: string, when?: string, isDefault?: Boolean, firstPart?: { keyCode: KeyCode, modifiers?: Modifiers }, chordPart?: { keyCode: KeyCode, modifiers?: Modifiers } }): ResolvedKeyBindingItem {
		const aSimpleKeyBinding = function (part: { keyCode: KeyCode, modifiers?: Modifiers }): SimpleKeyBinding {
			const { ctrlKey, shiftKey, altKey, metaKey } = part.modifiers || { ctrlKey: false, shiftKey: false, altKey: false, metaKey: false };
			return new SimpleKeyBinding(ctrlKey!, shiftKey!, altKey!, metaKey!, part.keyCode);
		};
		let parts: SimpleKeyBinding[] = [];
		if (firstPart) {
			parts.push(aSimpleKeyBinding(firstPart));
			if (chordPart) {
				parts.push(aSimpleKeyBinding(chordPart));
			}
		}
		const keyBinding = parts.length > 0 ? new USLayoutResolvedKeyBinding(new ChordKeyBinding(parts), OS) : undefined;
		return new ResolvedKeyBindingItem(keyBinding, command || 'some command', null, when ? ContextKeyExpr.deserialize(when) : undefined, isDefault === undefined ? true : isDefault, null);
	}

});
