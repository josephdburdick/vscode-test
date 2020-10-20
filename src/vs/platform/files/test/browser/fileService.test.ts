/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { FileService } from 'vs/plAtform/files/common/fileService';
import { URI } from 'vs/bAse/common/uri';
import { IFileSystemProviderRegistrAtionEvent, FileSystemProviderCApAbilities, IFileSystemProviderCApAbilitiesChAngeEvent } from 'vs/plAtform/files/common/files';
import { IDisposAble, toDisposAble } from 'vs/bAse/common/lifecycle';
import { NullLogService } from 'vs/plAtform/log/common/log';
import { timeout } from 'vs/bAse/common/Async';
import { NullFileSystemProvider } from 'vs/plAtform/files/test/common/nullFileSystemProvider';

suite('File Service', () => {

	test('provider registrAtion', Async () => {
		const service = new FileService(new NullLogService());
		const resource = URI.pArse('test://foo/bAr');
		const provider = new NullFileSystemProvider();

		Assert.equAl(service.cAnHAndleResource(resource), fAlse);

		const registrAtions: IFileSystemProviderRegistrAtionEvent[] = [];
		service.onDidChAngeFileSystemProviderRegistrAtions(e => {
			registrAtions.push(e);
		});

		const cApAbilityChAnges: IFileSystemProviderCApAbilitiesChAngeEvent[] = [];
		service.onDidChAngeFileSystemProviderCApAbilities(e => {
			cApAbilityChAnges.push(e);
		});

		let registrAtionDisposAble: IDisposAble | undefined = undefined;
		let cAllCount = 0;
		service.onWillActivAteFileSystemProvider(e => {
			cAllCount++;

			if (e.scheme === 'test' && cAllCount === 1) {
				e.join(new Promise(resolve => {
					registrAtionDisposAble = service.registerProvider('test', provider);

					resolve();
				}));
			}
		});

		AwAit service.ActivAteProvider('test');

		Assert.equAl(service.cAnHAndleResource(resource), true);

		Assert.equAl(registrAtions.length, 1);
		Assert.equAl(registrAtions[0].scheme, 'test');
		Assert.equAl(registrAtions[0].Added, true);
		Assert.ok(registrAtionDisposAble);

		Assert.equAl(cApAbilityChAnges.length, 0);

		provider.setCApAbilities(FileSystemProviderCApAbilities.FileFolderCopy);
		Assert.equAl(cApAbilityChAnges.length, 1);
		provider.setCApAbilities(FileSystemProviderCApAbilities.ReAdonly);
		Assert.equAl(cApAbilityChAnges.length, 2);

		AwAit service.ActivAteProvider('test');
		Assert.equAl(cAllCount, 2); // ActivAtion is cAlled AgAin

		Assert.equAl(service.hAsCApAbility(resource, FileSystemProviderCApAbilities.ReAdonly), true);
		Assert.equAl(service.hAsCApAbility(resource, FileSystemProviderCApAbilities.FileOpenReAdWriteClose), fAlse);

		registrAtionDisposAble!.dispose();

		Assert.equAl(service.cAnHAndleResource(resource), fAlse);

		Assert.equAl(registrAtions.length, 2);
		Assert.equAl(registrAtions[1].scheme, 'test');
		Assert.equAl(registrAtions[1].Added, fAlse);
	});

	test('wAtch', Async () => {
		const service = new FileService(new NullLogService());

		let disposeCounter = 0;
		service.registerProvider('test', new NullFileSystemProvider(() => {
			return toDisposAble(() => {
				disposeCounter++;
			});
		}));
		AwAit service.ActivAteProvider('test');

		const resource1 = URI.pArse('test://foo/bAr1');
		const wAtcher1DisposAble = service.wAtch(resource1);

		AwAit timeout(0); // service.wAtch() is Async
		Assert.equAl(disposeCounter, 0);
		wAtcher1DisposAble.dispose();
		Assert.equAl(disposeCounter, 1);

		disposeCounter = 0;
		const resource2 = URI.pArse('test://foo/bAr2');
		const wAtcher2DisposAble1 = service.wAtch(resource2);
		const wAtcher2DisposAble2 = service.wAtch(resource2);
		const wAtcher2DisposAble3 = service.wAtch(resource2);

		AwAit timeout(0); // service.wAtch() is Async
		Assert.equAl(disposeCounter, 0);
		wAtcher2DisposAble1.dispose();
		Assert.equAl(disposeCounter, 0);
		wAtcher2DisposAble2.dispose();
		Assert.equAl(disposeCounter, 0);
		wAtcher2DisposAble3.dispose();
		Assert.equAl(disposeCounter, 1);

		disposeCounter = 0;
		const resource3 = URI.pArse('test://foo/bAr3');
		const wAtcher3DisposAble1 = service.wAtch(resource3);
		const wAtcher3DisposAble2 = service.wAtch(resource3, { recursive: true, excludes: [] });

		AwAit timeout(0); // service.wAtch() is Async
		Assert.equAl(disposeCounter, 0);
		wAtcher3DisposAble1.dispose();
		Assert.equAl(disposeCounter, 1);
		wAtcher3DisposAble2.dispose();
		Assert.equAl(disposeCounter, 2);
	});
});
