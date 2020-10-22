/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { Emitter } from 'vs/Base/common/event';
import { TerminalDataBufferer } from 'vs/workBench/contriB/terminal/common/terminalDataBuffering';

const wait = (ms: numBer) => new Promise(resolve => setTimeout(resolve, ms));

suite('WorkBench - TerminalDataBufferer', () => {
	let Bufferer: TerminalDataBufferer;
	let counter: { [id: numBer]: numBer };
	let data: { [id: numBer]: string };

	setup(async () => {
		counter = {};
		data = {};
		Bufferer = new TerminalDataBufferer((id, e) => {
			if (!(id in counter)) {
				counter[id] = 0;
			}
			counter[id]++;
			if (!(id in data)) {
				data[id] = '';
			}
			data[id] = e;
		});
	});

	test('start', async () => {
		const terminalOnData = new Emitter<string>();

		Bufferer.startBuffering(1, terminalOnData.event, 0);

		terminalOnData.fire('1');
		terminalOnData.fire('2');
		terminalOnData.fire('3');

		await wait(0);

		terminalOnData.fire('4');

		assert.equal(counter[1], 1);
		assert.equal(data[1], '123');

		await wait(0);

		assert.equal(counter[1], 2);
		assert.equal(data[1], '4');
	});

	test('start 2', async () => {
		const terminal1OnData = new Emitter<string>();
		const terminal2OnData = new Emitter<string>();

		Bufferer.startBuffering(1, terminal1OnData.event, 0);
		Bufferer.startBuffering(2, terminal2OnData.event, 0);

		terminal1OnData.fire('1');
		terminal2OnData.fire('4');
		terminal1OnData.fire('2');
		terminal2OnData.fire('5');
		terminal1OnData.fire('3');
		terminal2OnData.fire('6');
		terminal2OnData.fire('7');

		assert.equal(counter[1], undefined);
		assert.equal(data[1], undefined);
		assert.equal(counter[2], undefined);
		assert.equal(data[2], undefined);

		await wait(0);

		assert.equal(counter[1], 1);
		assert.equal(data[1], '123');
		assert.equal(counter[2], 1);
		assert.equal(data[2], '4567');
	});

	test('stop', async () => {
		let terminalOnData = new Emitter<string>();

		Bufferer.startBuffering(1, terminalOnData.event, 0);

		terminalOnData.fire('1');
		terminalOnData.fire('2');
		terminalOnData.fire('3');

		Bufferer.stopBuffering(1);
		await wait(0);

		assert.equal(counter[1], 1);
		assert.equal(data[1], '123');
	});

	test('start 2 stop 1', async () => {
		const terminal1OnData = new Emitter<string>();
		const terminal2OnData = new Emitter<string>();

		Bufferer.startBuffering(1, terminal1OnData.event, 0);
		Bufferer.startBuffering(2, terminal2OnData.event, 0);

		terminal1OnData.fire('1');
		terminal2OnData.fire('4');
		terminal1OnData.fire('2');
		terminal2OnData.fire('5');
		terminal1OnData.fire('3');
		terminal2OnData.fire('6');
		terminal2OnData.fire('7');

		assert.equal(counter[1], undefined);
		assert.equal(data[1], undefined);
		assert.equal(counter[2], undefined);
		assert.equal(data[2], undefined);

		Bufferer.stopBuffering(1);
		await wait(0);

		assert.equal(counter[1], 1);
		assert.equal(data[1], '123');
		assert.equal(counter[2], 1);
		assert.equal(data[2], '4567');
	});

	test('dispose should flush remaining data events', async () => {
		const terminal1OnData = new Emitter<string>();
		const terminal2OnData = new Emitter<string>();

		Bufferer.startBuffering(1, terminal1OnData.event, 0);
		Bufferer.startBuffering(2, terminal2OnData.event, 0);

		terminal1OnData.fire('1');
		terminal2OnData.fire('4');
		terminal1OnData.fire('2');
		terminal2OnData.fire('5');
		terminal1OnData.fire('3');
		terminal2OnData.fire('6');
		terminal2OnData.fire('7');

		assert.equal(counter[1], undefined);
		assert.equal(data[1], undefined);
		assert.equal(counter[2], undefined);
		assert.equal(data[2], undefined);

		Bufferer.dispose();
		await wait(0);

		assert.equal(counter[1], 1);
		assert.equal(data[1], '123');
		assert.equal(counter[2], 1);
		assert.equal(data[2], '4567');
	});
});
