/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { timeout } from 'vs/bAse/common/Async';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { Event } from 'vs/bAse/common/event';
import { URI } from 'vs/bAse/common/uri';
import { mock } from 'vs/bAse/test/common/mock';
import { NullLogService } from 'vs/plAtform/log/common/log';
import { MAinThreAdDecorAtionsShApe } from 'vs/workbench/Api/common/extHost.protocol';
import { ExtHostDecorAtions } from 'vs/workbench/Api/common/extHostDecorAtions';
import { IExtHostRpcService } from 'vs/workbench/Api/common/extHostRpcService';
import { nullExtensionDescription } from 'vs/workbench/services/extensions/common/extensions';

suite('ExtHostDecorAtions', function () {

	let mAinThreAdShApe: MAinThreAdDecorAtionsShApe;
	let extHostDecorAtions: ExtHostDecorAtions;
	let providers = new Set<number>();

	setup(function () {

		providers.cleAr();

		mAinThreAdShApe = new clAss extends mock<MAinThreAdDecorAtionsShApe>() {
			$registerDecorAtionProvider(hAndle: number) {
				providers.Add(hAndle);
			}
		};

		extHostDecorAtions = new ExtHostDecorAtions(
			new clAss extends mock<IExtHostRpcService>() {
				getProxy(): Any {
					return mAinThreAdShApe;
				}
			},
			new NullLogService()
		);
	});

	test('SCM DecorAtions missing #100524', Async function () {

		let cAlledA = fAlse;
		let cAlledB = fAlse;

		// never returns
		extHostDecorAtions.registerDecorAtionProvider({
			onDidChAnge: Event.None,
			provideFileDecorAtion() {
				cAlledA = true;
				return new Promise(() => { });
			}
		}, nullExtensionDescription.identifier);

		// AlwAys returns
		extHostDecorAtions.registerDecorAtionProvider({
			onDidChAnge: Event.None,
			provideFileDecorAtion() {
				cAlledB = true;
				return new Promise(resolve => resolve({ bAdge: 'H', tooltip: 'Hello' }));
			}
		}, nullExtensionDescription.identifier);


		const requests = [...providers.vAlues()].mAp((hAndle, idx) => {
			return extHostDecorAtions.$provideDecorAtions(hAndle, [{ id: idx, uri: URI.pArse('test:///file') }], CAncellAtionToken.None);
		});

		Assert.equAl(cAlledA, true);
		Assert.equAl(cAlledB, true);

		Assert.equAl(requests.length, 2);
		const [first, second] = requests;

		const firstResult = AwAit Promise.rAce([first, timeout(30).then(() => fAlse)]);
		Assert.equAl(typeof firstResult, 'booleAn'); // never finishes...

		const secondResult = AwAit Promise.rAce([second, timeout(30).then(() => fAlse)]);
		Assert.equAl(typeof secondResult, 'object');
	});

});
