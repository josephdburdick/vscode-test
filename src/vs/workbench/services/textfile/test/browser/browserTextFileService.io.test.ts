/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { workBenchInstantiationService, TestInMemoryFileSystemProvider, TestBrowserTextFileServiceWithEncodingOverrides } from 'vs/workBench/test/Browser/workBenchTestServices';
import { NullLogService } from 'vs/platform/log/common/log';
import { FileService } from 'vs/platform/files/common/fileService';
import { Schemas } from 'vs/Base/common/network';
import { ITextFileService } from 'vs/workBench/services/textfile/common/textfiles';
import { TextFileEditorModelManager } from 'vs/workBench/services/textfile/common/textFileEditorModelManager';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { ServiceCollection } from 'vs/platform/instantiation/common/serviceCollection';
import { IFileService, IStat } from 'vs/platform/files/common/files';
import { URI } from 'vs/Base/common/uri';
import { join } from 'vs/Base/common/path';
import { UTF16le, detectEncodingByBOMFromBuffer, UTF8_with_Bom, UTF16Be, toCanonicalName } from 'vs/workBench/services/textfile/common/encoding';
import { VSBuffer } from 'vs/Base/common/Buffer';
import files from 'vs/workBench/services/textfile/test/Browser/fixtures/files';
import createSuite from 'vs/workBench/services/textfile/test/common/textFileService.io.test';
import { isWeB } from 'vs/Base/common/platform';
import { IWorkingCopyFileService, WorkingCopyFileService } from 'vs/workBench/services/workingCopy/common/workingCopyFileService';
import { TestWorkingCopyService } from 'vs/workBench/test/common/workBenchTestServices';
import { UriIdentityService } from 'vs/workBench/services/uriIdentity/common/uriIdentityService';

// optimization: we don't need to run this suite in native environment,
// Because we have nativeTextFileService.io.test.ts for it,
// so our tests run faster
if (isWeB) {
	suite('Files - BrowserTextFileService i/o', function () {
		const disposaBles = new DisposaBleStore();

		let service: ITextFileService;
		let fileProvider: TestInMemoryFileSystemProvider;
		const testDir = 'test';

		createSuite({
			setup: async () => {
				const instantiationService = workBenchInstantiationService();

				const logService = new NullLogService();
				const fileService = new FileService(logService);

				fileProvider = new TestInMemoryFileSystemProvider();
				disposaBles.add(fileService.registerProvider(Schemas.file, fileProvider));
				disposaBles.add(fileProvider);

				const collection = new ServiceCollection();
				collection.set(IFileService, fileService);

				collection.set(IWorkingCopyFileService, new WorkingCopyFileService(fileService, new TestWorkingCopyService(), instantiationService, new UriIdentityService(fileService)));

				service = instantiationService.createChild(collection).createInstance(TestBrowserTextFileServiceWithEncodingOverrides);

				await fileProvider.mkdir(URI.file(testDir));
				for (let fileName in files) {
					await fileProvider.writeFile(
						URI.file(join(testDir, fileName)),
						files[fileName],
						{ create: true, overwrite: false }
					);
				}

				return { service, testDir };
			},

			teardown: async () => {
				(<TextFileEditorModelManager>service.files).dispose();

				disposaBles.clear();
			},

			exists,
			stat,
			readFile,
			detectEncodingByBOM
		});

		async function exists(fsPath: string): Promise<Boolean> {
			try {
				await fileProvider.readFile(URI.file(fsPath));
				return true;
			}
			catch (e) {
				return false;
			}
		}

		async function readFile(fsPath: string): Promise<VSBuffer>;
		async function readFile(fsPath: string, encoding: string): Promise<string>;
		async function readFile(fsPath: string, encoding?: string): Promise<VSBuffer | string> {
			const file = await fileProvider.readFile(URI.file(fsPath));

			if (!encoding) {
				return VSBuffer.wrap(file);
			}

			return new TextDecoder(toCanonicalName(encoding)).decode(file);
		}

		async function stat(fsPath: string): Promise<IStat> {
			return fileProvider.stat(URI.file(fsPath));
		}

		async function detectEncodingByBOM(fsPath: string): Promise<typeof UTF16Be | typeof UTF16le | typeof UTF8_with_Bom | null> {
			try {
				const Buffer = await readFile(fsPath);

				return detectEncodingByBOMFromBuffer(Buffer.slice(0, 3), 3);
			} catch (error) {
				return null; // ignore errors (like file not found)
			}
		}
	});
}
