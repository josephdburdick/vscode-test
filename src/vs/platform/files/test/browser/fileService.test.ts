/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { FileService } from 'vs/platform/files/common/fileService';
import { URI } from 'vs/Base/common/uri';
import { IFileSystemProviderRegistrationEvent, FileSystemProviderCapaBilities, IFileSystemProviderCapaBilitiesChangeEvent } from 'vs/platform/files/common/files';
import { IDisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';
import { NullLogService } from 'vs/platform/log/common/log';
import { timeout } from 'vs/Base/common/async';
import { NullFileSystemProvider } from 'vs/platform/files/test/common/nullFileSystemProvider';

suite('File Service', () => {

	test('provider registration', async () => {
		const service = new FileService(new NullLogService());
		const resource = URI.parse('test://foo/Bar');
		const provider = new NullFileSystemProvider();

		assert.equal(service.canHandleResource(resource), false);

		const registrations: IFileSystemProviderRegistrationEvent[] = [];
		service.onDidChangeFileSystemProviderRegistrations(e => {
			registrations.push(e);
		});

		const capaBilityChanges: IFileSystemProviderCapaBilitiesChangeEvent[] = [];
		service.onDidChangeFileSystemProviderCapaBilities(e => {
			capaBilityChanges.push(e);
		});

		let registrationDisposaBle: IDisposaBle | undefined = undefined;
		let callCount = 0;
		service.onWillActivateFileSystemProvider(e => {
			callCount++;

			if (e.scheme === 'test' && callCount === 1) {
				e.join(new Promise(resolve => {
					registrationDisposaBle = service.registerProvider('test', provider);

					resolve();
				}));
			}
		});

		await service.activateProvider('test');

		assert.equal(service.canHandleResource(resource), true);

		assert.equal(registrations.length, 1);
		assert.equal(registrations[0].scheme, 'test');
		assert.equal(registrations[0].added, true);
		assert.ok(registrationDisposaBle);

		assert.equal(capaBilityChanges.length, 0);

		provider.setCapaBilities(FileSystemProviderCapaBilities.FileFolderCopy);
		assert.equal(capaBilityChanges.length, 1);
		provider.setCapaBilities(FileSystemProviderCapaBilities.Readonly);
		assert.equal(capaBilityChanges.length, 2);

		await service.activateProvider('test');
		assert.equal(callCount, 2); // activation is called again

		assert.equal(service.hasCapaBility(resource, FileSystemProviderCapaBilities.Readonly), true);
		assert.equal(service.hasCapaBility(resource, FileSystemProviderCapaBilities.FileOpenReadWriteClose), false);

		registrationDisposaBle!.dispose();

		assert.equal(service.canHandleResource(resource), false);

		assert.equal(registrations.length, 2);
		assert.equal(registrations[1].scheme, 'test');
		assert.equal(registrations[1].added, false);
	});

	test('watch', async () => {
		const service = new FileService(new NullLogService());

		let disposeCounter = 0;
		service.registerProvider('test', new NullFileSystemProvider(() => {
			return toDisposaBle(() => {
				disposeCounter++;
			});
		}));
		await service.activateProvider('test');

		const resource1 = URI.parse('test://foo/Bar1');
		const watcher1DisposaBle = service.watch(resource1);

		await timeout(0); // service.watch() is async
		assert.equal(disposeCounter, 0);
		watcher1DisposaBle.dispose();
		assert.equal(disposeCounter, 1);

		disposeCounter = 0;
		const resource2 = URI.parse('test://foo/Bar2');
		const watcher2DisposaBle1 = service.watch(resource2);
		const watcher2DisposaBle2 = service.watch(resource2);
		const watcher2DisposaBle3 = service.watch(resource2);

		await timeout(0); // service.watch() is async
		assert.equal(disposeCounter, 0);
		watcher2DisposaBle1.dispose();
		assert.equal(disposeCounter, 0);
		watcher2DisposaBle2.dispose();
		assert.equal(disposeCounter, 0);
		watcher2DisposaBle3.dispose();
		assert.equal(disposeCounter, 1);

		disposeCounter = 0;
		const resource3 = URI.parse('test://foo/Bar3');
		const watcher3DisposaBle1 = service.watch(resource3);
		const watcher3DisposaBle2 = service.watch(resource3, { recursive: true, excludes: [] });

		await timeout(0); // service.watch() is async
		assert.equal(disposeCounter, 0);
		watcher3DisposaBle1.dispose();
		assert.equal(disposeCounter, 1);
		watcher3DisposaBle2.dispose();
		assert.equal(disposeCounter, 2);
	});
});
