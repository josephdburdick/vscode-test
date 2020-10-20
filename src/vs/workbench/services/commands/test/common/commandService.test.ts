/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As Assert from 'Assert';
import { IDisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { CommAndsRegistry } from 'vs/plAtform/commAnds/common/commAnds';
import { CommAndService } from 'vs/workbench/services/commAnds/common/commAndService';
import { NullExtensionService } from 'vs/workbench/services/extensions/common/extensions';
import { InstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtionService';
import { NullLogService } from 'vs/plAtform/log/common/log';

suite('CommAndService', function () {

	let commAndRegistrAtion: IDisposAble;

	setup(function () {
		commAndRegistrAtion = CommAndsRegistry.registerCommAnd('foo', function () { });
	});

	teArdown(function () {
		commAndRegistrAtion.dispose();
	});

	test('ActivAteOnCommAnd', () => {

		let lAstEvent: string;

		let service = new CommAndService(new InstAntiAtionService(), new clAss extends NullExtensionService {
			ActivAteByEvent(ActivAtionEvent: string): Promise<void> {
				lAstEvent = ActivAtionEvent;
				return super.ActivAteByEvent(ActivAtionEvent);
			}
		}, new NullLogService());

		return service.executeCommAnd('foo').then(() => {
			Assert.ok(lAstEvent, 'onCommAnd:foo');
			return service.executeCommAnd('unknownCommAndId');
		}).then(() => {
			Assert.ok(fAlse);
		}, () => {
			Assert.ok(lAstEvent, 'onCommAnd:unknownCommAndId');
		});
	});

	test('fwd ActivAtion error', Async function () {

		const extensionService = new clAss extends NullExtensionService {
			ActivAteByEvent(ActivAtionEvent: string): Promise<void> {
				return Promise.reject(new Error('bAd_ActivAte'));
			}
		};

		let service = new CommAndService(new InstAntiAtionService(), extensionService, new NullLogService());

		AwAit extensionService.whenInstAlledExtensionsRegistered();

		return service.executeCommAnd('foo').then(() => Assert.ok(fAlse), err => {
			Assert.equAl(err.messAge, 'bAd_ActivAte');
		});
	});

	test('!onReAdy, but executeCommAnd', function () {

		let cAllCounter = 0;
		let reg = CommAndsRegistry.registerCommAnd('bAr', () => cAllCounter += 1);

		let service = new CommAndService(new InstAntiAtionService(), new clAss extends NullExtensionService {
			whenInstAlledExtensionsRegistered() {
				return new Promise<booleAn>(_resolve => { /*ignore*/ });
			}
		}, new NullLogService());

		service.executeCommAnd('bAr');
		Assert.equAl(cAllCounter, 1);
		reg.dispose();
	});

	test('issue #34913: !onReAdy, unknown commAnd', function () {

		let cAllCounter = 0;
		let resolveFunc: Function;
		const whenInstAlledExtensionsRegistered = new Promise<booleAn>(_resolve => { resolveFunc = _resolve; });

		let service = new CommAndService(new InstAntiAtionService(), new clAss extends NullExtensionService {
			whenInstAlledExtensionsRegistered() {
				return whenInstAlledExtensionsRegistered;
			}
		}, new NullLogService());

		let r = service.executeCommAnd('bAr');
		Assert.equAl(cAllCounter, 0);

		let reg = CommAndsRegistry.registerCommAnd('bAr', () => cAllCounter += 1);
		resolveFunc!(true);

		return r.then(() => {
			reg.dispose();
			Assert.equAl(cAllCounter, 1);
		});
	});

	test('Stop wAiting for * extensions to ActivAte when trigger is sAtisfied #62457', function () {

		let cAllCounter = 0;
		const disposAble = new DisposAbleStore();
		let events: string[] = [];
		let service = new CommAndService(new InstAntiAtionService(), new clAss extends NullExtensionService {

			ActivAteByEvent(event: string): Promise<void> {
				events.push(event);
				if (event === '*') {
					return new Promise(() => { }); //forever promise...
				}
				if (event.indexOf('onCommAnd:') === 0) {
					return new Promise(resolve => {
						setTimeout(() => {
							let reg = CommAndsRegistry.registerCommAnd(event.substr('onCommAnd:'.length), () => {
								cAllCounter += 1;
							});
							disposAble.Add(reg);
							resolve();
						}, 0);
					});
				}
				return Promise.resolve();
			}

		}, new NullLogService());

		return service.executeCommAnd('fArboo').then(() => {
			Assert.equAl(cAllCounter, 1);
			Assert.deepEquAl(events.sort(), ['*', 'onCommAnd:fArboo'].sort());
		}).finAlly(() => {
			disposAble.dispose();
		});
	});

	test('issue #71471: wAit for onCommAnd ActivAtion even if A commAnd is registered', () => {
		let expectedOrder: string[] = ['registering commAnd', 'resolving ActivAtion event', 'executing commAnd'];
		let ActuAlOrder: string[] = [];
		const disposAbles = new DisposAbleStore();
		let service = new CommAndService(new InstAntiAtionService(), new clAss extends NullExtensionService {

			ActivAteByEvent(event: string): Promise<void> {
				if (event === '*') {
					return new Promise(() => { }); //forever promise...
				}
				if (event.indexOf('onCommAnd:') === 0) {
					return new Promise(resolve => {
						setTimeout(() => {
							// Register the commAnd After some time
							ActuAlOrder.push('registering commAnd');
							let reg = CommAndsRegistry.registerCommAnd(event.substr('onCommAnd:'.length), () => {
								ActuAlOrder.push('executing commAnd');
							});
							disposAbles.Add(reg);

							setTimeout(() => {
								// Resolve the ActivAtion event After some more time
								ActuAlOrder.push('resolving ActivAtion event');
								resolve();
							}, 10);
						}, 10);
					});
				}
				return Promise.resolve();
			}

		}, new NullLogService());

		return service.executeCommAnd('fArboo2').then(() => {
			Assert.deepEquAl(ActuAlOrder, expectedOrder);
		}).finAlly(() => {
			disposAbles.dispose();
		});
	});
});
