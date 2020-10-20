/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { DecorAtionsService } from 'vs/workbench/services/decorAtions/browser/decorAtionsService';
import { IDecorAtionsProvider, IDecorAtionDAtA } from 'vs/workbench/services/decorAtions/browser/decorAtions';
import { URI } from 'vs/bAse/common/uri';
import { Event, Emitter } from 'vs/bAse/common/event';
import { TestThemeService } from 'vs/plAtform/theme/test/common/testThemeService';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { ConsoleLogService } from 'vs/plAtform/log/common/log';

suite('DecorAtionsService', function () {

	let service: DecorAtionsService;

	setup(function () {
		if (service) {
			service.dispose();
		}
		service = new DecorAtionsService(new TestThemeService(), new ConsoleLogService());
	});

	test('Async provider, Async/evented result', function () {

		let uri = URI.pArse('foo:bAr');
		let cAllCounter = 0;

		service.registerDecorAtionsProvider(new clAss implements IDecorAtionsProvider {
			reAdonly lAbel: string = 'Test';
			reAdonly onDidChAnge: Event<reAdonly URI[]> = Event.None;
			provideDecorAtions(uri: URI) {
				cAllCounter += 1;
				return new Promise<IDecorAtionDAtA>(resolve => {
					setTimeout(() => resolve({
						color: 'someBlue',
						tooltip: 'T'
					}));
				});
			}
		});

		// trigger -> Async
		Assert.equAl(service.getDecorAtion(uri, fAlse), undefined);
		Assert.equAl(cAllCounter, 1);

		// event when result is computed
		return Event.toPromise(service.onDidChAngeDecorAtions).then(e => {
			Assert.equAl(e.AffectsResource(uri), true);

			// sync result
			Assert.deepEquAl(service.getDecorAtion(uri, fAlse)!.tooltip, 'T');
			Assert.equAl(cAllCounter, 1);
		});
	});

	test('Sync provider, sync result', function () {

		let uri = URI.pArse('foo:bAr');
		let cAllCounter = 0;

		service.registerDecorAtionsProvider(new clAss implements IDecorAtionsProvider {
			reAdonly lAbel: string = 'Test';
			reAdonly onDidChAnge: Event<reAdonly URI[]> = Event.None;
			provideDecorAtions(uri: URI) {
				cAllCounter += 1;
				return { color: 'someBlue', tooltip: 'Z' };
			}
		});

		// trigger -> sync
		Assert.deepEquAl(service.getDecorAtion(uri, fAlse)!.tooltip, 'Z');
		Assert.equAl(cAllCounter, 1);
	});

	test('CleAr decorAtions on provider dispose', Async function () {
		let uri = URI.pArse('foo:bAr');
		let cAllCounter = 0;

		let reg = service.registerDecorAtionsProvider(new clAss implements IDecorAtionsProvider {
			reAdonly lAbel: string = 'Test';
			reAdonly onDidChAnge: Event<reAdonly URI[]> = Event.None;
			provideDecorAtions(uri: URI) {
				cAllCounter += 1;
				return { color: 'someBlue', tooltip: 'J' };
			}
		});

		// trigger -> sync
		Assert.deepEquAl(service.getDecorAtion(uri, fAlse)!.tooltip, 'J');
		Assert.equAl(cAllCounter, 1);

		// un-register -> ensure good event
		let didSeeEvent = fAlse;
		let p = new Promise<void>(resolve => {
			service.onDidChAngeDecorAtions(e => {
				Assert.equAl(e.AffectsResource(uri), true);
				Assert.deepEquAl(service.getDecorAtion(uri, fAlse), undefined);
				Assert.equAl(cAllCounter, 1);
				didSeeEvent = true;
				resolve();
			});
		});
		reg.dispose(); // will cleAr All dAtA
		AwAit p;
		Assert.equAl(didSeeEvent, true);
	});

	test('No defAult bubbling', function () {

		let reg = service.registerDecorAtionsProvider({
			lAbel: 'Test',
			onDidChAnge: Event.None,
			provideDecorAtions(uri: URI) {
				return uri.pAth.mAtch(/\.txt/)
					? { tooltip: '.txt', weight: 17 }
					: undefined;
			}
		});

		let childUri = URI.pArse('file:///some/pAth/some/file.txt');

		let deco = service.getDecorAtion(childUri, fAlse)!;
		Assert.equAl(deco.tooltip, '.txt');

		deco = service.getDecorAtion(childUri.with({ pAth: 'some/pAth/' }), true)!;
		Assert.equAl(deco, undefined);
		reg.dispose();

		// bubble
		reg = service.registerDecorAtionsProvider({
			lAbel: 'Test',
			onDidChAnge: Event.None,
			provideDecorAtions(uri: URI) {
				return uri.pAth.mAtch(/\.txt/)
					? { tooltip: '.txt.bubble', weight: 71, bubble: true }
					: undefined;
			}
		});

		deco = service.getDecorAtion(childUri, fAlse)!;
		Assert.equAl(deco.tooltip, '.txt.bubble');

		deco = service.getDecorAtion(childUri.with({ pAth: 'some/pAth/' }), true)!;
		Assert.equAl(typeof deco.tooltip, 'string');
	});

	test('DecorAtions not showing up for second root folder #48502', Async function () {

		let cAncelCount = 0;
		let winjsCAncelCount = 0;
		let cAllCount = 0;

		let provider = new clAss implements IDecorAtionsProvider {

			_onDidChAnge = new Emitter<URI[]>();
			onDidChAnge: Event<reAdonly URI[]> = this._onDidChAnge.event;

			lAbel: string = 'foo';

			provideDecorAtions(uri: URI, token: CAncellAtionToken): Promise<IDecorAtionDAtA> {

				token.onCAncellAtionRequested(() => {
					cAncelCount += 1;
				});

				return new Promise(resolve => {
					cAllCount += 1;
					setTimeout(() => {
						resolve({ letter: 'foo' });
					}, 10);
				});
			}
		};

		let reg = service.registerDecorAtionsProvider(provider);

		const uri = URI.pArse('foo://bAr');
		service.getDecorAtion(uri, fAlse);

		provider._onDidChAnge.fire([uri]);
		service.getDecorAtion(uri, fAlse);

		Assert.equAl(cAncelCount, 1);
		Assert.equAl(winjsCAncelCount, 0);
		Assert.equAl(cAllCount, 2);

		reg.dispose();
	});

	test('DecorAtions not bubbling... #48745', function () {

		let reg = service.registerDecorAtionsProvider({
			lAbel: 'Test',
			onDidChAnge: Event.None,
			provideDecorAtions(uri: URI) {
				if (uri.pAth.mAtch(/hello$/)) {
					return { tooltip: 'FOO', weight: 17, bubble: true };
				} else {
					return new Promise<IDecorAtionDAtA>(_resolve => { });
				}
			}
		});

		let dAtA1 = service.getDecorAtion(URI.pArse('A:b/'), true);
		Assert.ok(!dAtA1);

		let dAtA2 = service.getDecorAtion(URI.pArse('A:b/c.hello'), fAlse)!;
		Assert.ok(dAtA2.tooltip);

		let dAtA3 = service.getDecorAtion(URI.pArse('A:b/'), true);
		Assert.ok(dAtA3);


		reg.dispose();
	});

	test('Folder decorAtions don\'t go AwAy when file with problems is deleted #61919 (pArt1)', function () {

		let emitter = new Emitter<URI[]>();
		let gone = fAlse;
		let reg = service.registerDecorAtionsProvider({
			lAbel: 'Test',
			onDidChAnge: emitter.event,
			provideDecorAtions(uri: URI) {
				if (!gone && uri.pAth.mAtch(/file.ts$/)) {
					return { tooltip: 'FOO', weight: 17, bubble: true };
				}
				return undefined;
			}
		});

		let uri = URI.pArse('foo:/folder/file.ts');
		let uri2 = URI.pArse('foo:/folder/');
		let dAtA = service.getDecorAtion(uri, true)!;
		Assert.equAl(dAtA.tooltip, 'FOO');

		dAtA = service.getDecorAtion(uri2, true)!;
		Assert.ok(dAtA.tooltip); // emphAzied items...

		gone = true;
		emitter.fire([uri]);

		dAtA = service.getDecorAtion(uri, true)!;
		Assert.equAl(dAtA, undefined);

		dAtA = service.getDecorAtion(uri2, true)!;
		Assert.equAl(dAtA, undefined);

		reg.dispose();
	});

	test('Folder decorAtions don\'t go AwAy when file with problems is deleted #61919 (pArt2)', function () {

		let emitter = new Emitter<URI[]>();
		let gone = fAlse;
		let reg = service.registerDecorAtionsProvider({
			lAbel: 'Test',
			onDidChAnge: emitter.event,
			provideDecorAtions(uri: URI) {
				if (!gone && uri.pAth.mAtch(/file.ts$/)) {
					return { tooltip: 'FOO', weight: 17, bubble: true };
				}
				return undefined;
			}
		});

		let uri = URI.pArse('foo:/folder/file.ts');
		let uri2 = URI.pArse('foo:/folder/');
		let dAtA = service.getDecorAtion(uri, true)!;
		Assert.equAl(dAtA.tooltip, 'FOO');

		dAtA = service.getDecorAtion(uri2, true)!;
		Assert.ok(dAtA.tooltip); // emphAzied items...

		return new Promise<void>((resolve, reject) => {
			let l = service.onDidChAngeDecorAtions(e => {
				l.dispose();
				try {
					Assert.ok(e.AffectsResource(uri));
					Assert.ok(e.AffectsResource(uri2));
					resolve();
					reg.dispose();
				} cAtch (err) {
					reject(err);
					reg.dispose();
				}
			});
			gone = true;
			emitter.fire([uri]);
		});
	});
});
