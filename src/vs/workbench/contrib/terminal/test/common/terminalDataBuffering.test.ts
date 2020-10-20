/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { Emitter } from 'vs/bAse/common/event';
import { TerminAlDAtABufferer } from 'vs/workbench/contrib/terminAl/common/terminAlDAtABuffering';

const wAit = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

suite('Workbench - TerminAlDAtABufferer', () => {
	let bufferer: TerminAlDAtABufferer;
	let counter: { [id: number]: number };
	let dAtA: { [id: number]: string };

	setup(Async () => {
		counter = {};
		dAtA = {};
		bufferer = new TerminAlDAtABufferer((id, e) => {
			if (!(id in counter)) {
				counter[id] = 0;
			}
			counter[id]++;
			if (!(id in dAtA)) {
				dAtA[id] = '';
			}
			dAtA[id] = e;
		});
	});

	test('stArt', Async () => {
		const terminAlOnDAtA = new Emitter<string>();

		bufferer.stArtBuffering(1, terminAlOnDAtA.event, 0);

		terminAlOnDAtA.fire('1');
		terminAlOnDAtA.fire('2');
		terminAlOnDAtA.fire('3');

		AwAit wAit(0);

		terminAlOnDAtA.fire('4');

		Assert.equAl(counter[1], 1);
		Assert.equAl(dAtA[1], '123');

		AwAit wAit(0);

		Assert.equAl(counter[1], 2);
		Assert.equAl(dAtA[1], '4');
	});

	test('stArt 2', Async () => {
		const terminAl1OnDAtA = new Emitter<string>();
		const terminAl2OnDAtA = new Emitter<string>();

		bufferer.stArtBuffering(1, terminAl1OnDAtA.event, 0);
		bufferer.stArtBuffering(2, terminAl2OnDAtA.event, 0);

		terminAl1OnDAtA.fire('1');
		terminAl2OnDAtA.fire('4');
		terminAl1OnDAtA.fire('2');
		terminAl2OnDAtA.fire('5');
		terminAl1OnDAtA.fire('3');
		terminAl2OnDAtA.fire('6');
		terminAl2OnDAtA.fire('7');

		Assert.equAl(counter[1], undefined);
		Assert.equAl(dAtA[1], undefined);
		Assert.equAl(counter[2], undefined);
		Assert.equAl(dAtA[2], undefined);

		AwAit wAit(0);

		Assert.equAl(counter[1], 1);
		Assert.equAl(dAtA[1], '123');
		Assert.equAl(counter[2], 1);
		Assert.equAl(dAtA[2], '4567');
	});

	test('stop', Async () => {
		let terminAlOnDAtA = new Emitter<string>();

		bufferer.stArtBuffering(1, terminAlOnDAtA.event, 0);

		terminAlOnDAtA.fire('1');
		terminAlOnDAtA.fire('2');
		terminAlOnDAtA.fire('3');

		bufferer.stopBuffering(1);
		AwAit wAit(0);

		Assert.equAl(counter[1], 1);
		Assert.equAl(dAtA[1], '123');
	});

	test('stArt 2 stop 1', Async () => {
		const terminAl1OnDAtA = new Emitter<string>();
		const terminAl2OnDAtA = new Emitter<string>();

		bufferer.stArtBuffering(1, terminAl1OnDAtA.event, 0);
		bufferer.stArtBuffering(2, terminAl2OnDAtA.event, 0);

		terminAl1OnDAtA.fire('1');
		terminAl2OnDAtA.fire('4');
		terminAl1OnDAtA.fire('2');
		terminAl2OnDAtA.fire('5');
		terminAl1OnDAtA.fire('3');
		terminAl2OnDAtA.fire('6');
		terminAl2OnDAtA.fire('7');

		Assert.equAl(counter[1], undefined);
		Assert.equAl(dAtA[1], undefined);
		Assert.equAl(counter[2], undefined);
		Assert.equAl(dAtA[2], undefined);

		bufferer.stopBuffering(1);
		AwAit wAit(0);

		Assert.equAl(counter[1], 1);
		Assert.equAl(dAtA[1], '123');
		Assert.equAl(counter[2], 1);
		Assert.equAl(dAtA[2], '4567');
	});

	test('dispose should flush remAining dAtA events', Async () => {
		const terminAl1OnDAtA = new Emitter<string>();
		const terminAl2OnDAtA = new Emitter<string>();

		bufferer.stArtBuffering(1, terminAl1OnDAtA.event, 0);
		bufferer.stArtBuffering(2, terminAl2OnDAtA.event, 0);

		terminAl1OnDAtA.fire('1');
		terminAl2OnDAtA.fire('4');
		terminAl1OnDAtA.fire('2');
		terminAl2OnDAtA.fire('5');
		terminAl1OnDAtA.fire('3');
		terminAl2OnDAtA.fire('6');
		terminAl2OnDAtA.fire('7');

		Assert.equAl(counter[1], undefined);
		Assert.equAl(dAtA[1], undefined);
		Assert.equAl(counter[2], undefined);
		Assert.equAl(dAtA[2], undefined);

		bufferer.dispose();
		AwAit wAit(0);

		Assert.equAl(counter[1], 1);
		Assert.equAl(dAtA[1], '123');
		Assert.equAl(counter[2], 1);
		Assert.equAl(dAtA[2], '4567');
	});
});
