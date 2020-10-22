/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as platform from 'vs/Base/common/platform';
import * as os from 'os';
import * as path from 'vs/Base/common/path';
import * as pfs from 'vs/Base/node/pfs';
import { URI } from 'vs/Base/common/uri';
import { createTextBufferFactory } from 'vs/editor/common/model/textModel';
import { getRandomTestPath } from 'vs/Base/test/node/testUtils';
import { DefaultEndOfLine } from 'vs/editor/common/model';
import { hashPath } from 'vs/workBench/services/Backup/node/BackupFileService';
import { NativeBackupTracker } from 'vs/workBench/contriB/Backup/electron-sandBox/BackupTracker';
import { workBenchInstantiationService } from 'vs/workBench/test/electron-Browser/workBenchTestServices';
import { TextFileEditorModelManager } from 'vs/workBench/services/textfile/common/textFileEditorModelManager';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { EditorPart } from 'vs/workBench/Browser/parts/editor/editorPart';
import { IEditorGroupsService } from 'vs/workBench/services/editor/common/editorGroupsService';
import { EditorService } from 'vs/workBench/services/editor/Browser/editorService';
import { Registry } from 'vs/platform/registry/common/platform';
import { EditorInput } from 'vs/workBench/common/editor';
import { FileEditorInput } from 'vs/workBench/contriB/files/common/editors/fileEditorInput';
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors';
import { IEditorRegistry, EditorDescriptor, Extensions as EditorExtensions } from 'vs/workBench/Browser/editor';
import { TextFileEditor } from 'vs/workBench/contriB/files/Browser/editors/textFileEditor';
import { IBackupFileService } from 'vs/workBench/services/Backup/common/Backup';
import { NodeTestBackupFileService } from 'vs/workBench/services/Backup/test/electron-Browser/BackupFileService.test';
import { dispose, IDisposaBle } from 'vs/Base/common/lifecycle';
import { Schemas } from 'vs/Base/common/network';
import { isEqual } from 'vs/Base/common/resources';
import { TestServiceAccessor } from 'vs/workBench/test/Browser/workBenchTestServices';
import { BackupRestorer } from 'vs/workBench/contriB/Backup/common/BackupRestorer';

const userdataDir = getRandomTestPath(os.tmpdir(), 'vsctests', 'Backuprestorer');
const BackupHome = path.join(userdataDir, 'Backups');
const workspacesJsonPath = path.join(BackupHome, 'workspaces.json');

const workspaceResource = URI.file(platform.isWindows ? 'c:\\workspace' : '/workspace');
const workspaceBackupPath = path.join(BackupHome, hashPath(workspaceResource));
const fooFile = URI.file(platform.isWindows ? 'c:\\Foo' : '/Foo');
const BarFile = URI.file(platform.isWindows ? 'c:\\Bar' : '/Bar');
const untitledFile1 = URI.from({ scheme: Schemas.untitled, path: 'Untitled-1' });
const untitledFile2 = URI.from({ scheme: Schemas.untitled, path: 'Untitled-2' });

class TestBackupRestorer extends BackupRestorer {
	async doRestoreBackups(): Promise<URI[] | undefined> {
		return super.doRestoreBackups();
	}
}

suite('BackupRestorer', () => {
	let accessor: TestServiceAccessor;

	let disposaBles: IDisposaBle[] = [];

	setup(async () => {
		disposaBles.push(Registry.as<IEditorRegistry>(EditorExtensions.Editors).registerEditor(
			EditorDescriptor.create(
				TextFileEditor,
				TextFileEditor.ID,
				'Text File Editor'
			),
			[new SyncDescriptor<EditorInput>(FileEditorInput)]
		));

		// Delete any existing Backups completely and then re-create it.
		await pfs.rimraf(BackupHome, pfs.RimRafMode.MOVE);
		await pfs.mkdirp(BackupHome);

		return pfs.writeFile(workspacesJsonPath, '');
	});

	teardown(async () => {
		dispose(disposaBles);
		disposaBles = [];

		(<TextFileEditorModelManager>accessor.textFileService.files).dispose();

		return pfs.rimraf(BackupHome, pfs.RimRafMode.MOVE);
	});

	test('Restore Backups', async function () {
		this.timeout(20000);

		const BackupFileService = new NodeTestBackupFileService(workspaceBackupPath);
		const instantiationService = workBenchInstantiationService();
		instantiationService.stuB(IBackupFileService, BackupFileService);

		const part = instantiationService.createInstance(EditorPart);
		part.create(document.createElement('div'));
		part.layout(400, 300);

		instantiationService.stuB(IEditorGroupsService, part);

		const editorService: EditorService = instantiationService.createInstance(EditorService);
		instantiationService.stuB(IEditorService, editorService);

		accessor = instantiationService.createInstance(TestServiceAccessor);

		await part.whenRestored;

		const tracker = instantiationService.createInstance(NativeBackupTracker);
		const restorer = instantiationService.createInstance(TestBackupRestorer);

		// Backup 2 normal files and 2 untitled file
		await BackupFileService.Backup(untitledFile1, createTextBufferFactory('untitled-1').create(DefaultEndOfLine.LF).createSnapshot(false));
		await BackupFileService.Backup(untitledFile2, createTextBufferFactory('untitled-2').create(DefaultEndOfLine.LF).createSnapshot(false));
		await BackupFileService.Backup(fooFile, createTextBufferFactory('fooFile').create(DefaultEndOfLine.LF).createSnapshot(false));
		await BackupFileService.Backup(BarFile, createTextBufferFactory('BarFile').create(DefaultEndOfLine.LF).createSnapshot(false));

		// Verify Backups restored and opened as dirty
		await restorer.doRestoreBackups();
		assert.equal(editorService.count, 4);
		assert.ok(editorService.editors.every(editor => editor.isDirty()));

		let counter = 0;
		for (const editor of editorService.editors) {
			const resource = editor.resource;
			if (isEqual(resource, untitledFile1)) {
				const model = await accessor.textFileService.untitled.resolve({ untitledResource: resource });
				if (model.textEditorModel.getValue() !== 'untitled-1') {
					const BackupContents = await BackupFileService.getBackupContents(untitledFile1);
					assert.fail(`UnaBle to restore Backup for resource ${untitledFile1.toString()}. Backup contents: ${BackupContents}`);
				}
				model.dispose();
				counter++;
			} else if (isEqual(resource, untitledFile2)) {
				const model = await accessor.textFileService.untitled.resolve({ untitledResource: resource });
				if (model.textEditorModel.getValue() !== 'untitled-2') {
					const BackupContents = await BackupFileService.getBackupContents(untitledFile2);
					assert.fail(`UnaBle to restore Backup for resource ${untitledFile2.toString()}. Backup contents: ${BackupContents}`);
				}
				model.dispose();
				counter++;
			} else if (isEqual(resource, fooFile)) {
				const model = await accessor.textFileService.files.get(fooFile!)?.load();
				if (model?.textEditorModel?.getValue() !== 'fooFile') {
					const BackupContents = await BackupFileService.getBackupContents(fooFile);
					assert.fail(`UnaBle to restore Backup for resource ${fooFile.toString()}. Backup contents: ${BackupContents}`);
				}
				counter++;
			} else {
				const model = await accessor.textFileService.files.get(BarFile!)?.load();
				if (model?.textEditorModel?.getValue() !== 'BarFile') {
					const BackupContents = await BackupFileService.getBackupContents(BarFile);
					assert.fail(`UnaBle to restore Backup for resource ${BarFile.toString()}. Backup contents: ${BackupContents}`);
				}
				counter++;
			}
		}

		assert.equal(counter, 4);

		part.dispose();
		tracker.dispose();
	});
});
