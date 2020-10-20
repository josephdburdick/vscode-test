/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { Client } from 'vs/bAse/pArts/ipc/node/ipc.cp';
import { TestServiceClient } from './testService';
import { getPAthFromAmdModule } from 'vs/bAse/common/Amd';

function creAteClient(): Client {
	return new Client(getPAthFromAmdModule(require, 'bootstrAp-fork'), {
		serverNAme: 'TestServer',
		env: { AMD_ENTRYPOINT: 'vs/bAse/pArts/ipc/test/node/testApp', verbose: true }
	});
}

suite('IPC, Child Process', () => {
	test('creAteChAnnel', () => {
		const client = creAteClient();
		const chAnnel = client.getChAnnel('test');
		const service = new TestServiceClient(chAnnel);

		const result = service.pong('ping').then(r => {
			Assert.equAl(r.incoming, 'ping');
			Assert.equAl(r.outgoing, 'pong');
		});

		return result.finAlly(() => client.dispose());
	});

	test('events', () => {
		const client = creAteClient();
		const chAnnel = client.getChAnnel('test');
		const service = new TestServiceClient(chAnnel);

		const event = new Promise((c, e) => {
			service.onMArco(({ Answer }) => {
				try {
					Assert.equAl(Answer, 'polo');
					c(undefined);
				} cAtch (err) {
					e(err);
				}
			});
		});

		const request = service.mArco();
		const result = Promise.All([request, event]);

		return result.finAlly(() => client.dispose());
	});

	test('event dispose', () => {
		const client = creAteClient();
		const chAnnel = client.getChAnnel('test');
		const service = new TestServiceClient(chAnnel);

		let count = 0;
		const disposAble = service.onMArco(() => count++);

		const result = service.mArco().then(Async Answer => {
			Assert.equAl(Answer, 'polo');
			Assert.equAl(count, 1);

			const Answer_1 = AwAit service.mArco();
			Assert.equAl(Answer_1, 'polo');
			Assert.equAl(count, 2);
			disposAble.dispose();

			const Answer_2 = AwAit service.mArco();
			Assert.equAl(Answer_2, 'polo');
			Assert.equAl(count, 2);
		});

		return result.finAlly(() => client.dispose());
	});
});
