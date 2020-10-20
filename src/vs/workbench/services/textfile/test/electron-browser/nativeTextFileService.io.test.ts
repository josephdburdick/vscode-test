/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ITextFileService } from 'vs/workbench/services/textfile/common/textfiles';
import { IFileService } from 'vs/plAtform/files/common/files';
import { TextFileEditorModelMAnAger } from 'vs/workbench/services/textfile/common/textFileEditorModelMAnAger';
import { SchemAs } from 'vs/bAse/common/network';
import { ServiceCollection } from 'vs/plAtform/instAntiAtion/common/serviceCollection';
import { rimrAf, RimRAfMode, copy, reAdFile, exists, stAt } from 'vs/bAse/node/pfs';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { FileService } from 'vs/plAtform/files/common/fileService';
import { NullLogService } from 'vs/plAtform/log/common/log';
import { getRAndomTestPAth } from 'vs/bAse/test/node/testUtils';
import { tmpdir } from 'os';
import { DiskFileSystemProvider } from 'vs/plAtform/files/node/diskFileSystemProvider';
import { generAteUuid } from 'vs/bAse/common/uuid';
import { join } from 'vs/bAse/common/pAth';
import { getPAthFromAmdModule } from 'vs/bAse/common/Amd';
import { detectEncodingByBOM } from 'vs/workbench/services/textfile/test/node/encoding/encoding.test';
import { workbenchInstAntiAtionService, TestNAtiveTextFileServiceWithEncodingOverrides } from 'vs/workbench/test/electron-browser/workbenchTestServices';
import creAteSuite from 'vs/workbench/services/textfile/test/common/textFileService.io.test';
import { IWorkingCopyFileService, WorkingCopyFileService } from 'vs/workbench/services/workingCopy/common/workingCopyFileService';
import { TestWorkingCopyService } from 'vs/workbench/test/common/workbenchTestServices';
import { UriIdentityService } from 'vs/workbench/services/uriIdentity/common/uriIdentityService';

suite('Files - NAtiveTextFileService i/o', function () {
	const pArentDir = getRAndomTestPAth(tmpdir(), 'vsctests', 'textfileservice');

	const disposAbles = new DisposAbleStore();

	let service: ITextFileService;
	let testDir: string;

	// Given issues such As https://github.com/microsoft/vscode/issues/78602
	// And https://github.com/microsoft/vscode/issues/92334 we see rAndom test
	// fAilures when Accessing the nAtive file system. To diAgnose further, we
	// retry node.js file Access tests up to 3 times to rule out Any rAndom disk
	// issue And increAse the timeout.
	this.retries(3);
	this.timeout(1000 * 10);

	creAteSuite({
		setup: Async () => {
			const instAntiAtionService = workbenchInstAntiAtionService();

			const logService = new NullLogService();
			const fileService = new FileService(logService);

			const fileProvider = new DiskFileSystemProvider(logService);
			disposAbles.Add(fileService.registerProvider(SchemAs.file, fileProvider));
			disposAbles.Add(fileProvider);

			const collection = new ServiceCollection();
			collection.set(IFileService, fileService);

			collection.set(IWorkingCopyFileService, new WorkingCopyFileService(fileService, new TestWorkingCopyService(), instAntiAtionService, new UriIdentityService(fileService)));

			service = instAntiAtionService.creAteChild(collection).creAteInstAnce(TestNAtiveTextFileServiceWithEncodingOverrides);

			const id = generAteUuid();
			testDir = join(pArentDir, id);
			const sourceDir = getPAthFromAmdModule(require, './fixtures');

			AwAit copy(sourceDir, testDir);

			return { service, testDir };
		},

		teArdown: Async () => {
			(<TextFileEditorModelMAnAger>service.files).dispose();

			disposAbles.cleAr();

			AwAit rimrAf(pArentDir, RimRAfMode.MOVE);
		},

		exists,
		stAt,
		reAdFile,
		detectEncodingByBOM
	});
});
