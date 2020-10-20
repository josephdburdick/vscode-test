/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import 'mochA';
import { RequestQueue, RequestQueueingType } from '../tsServer/requestQueue';

suite('RequestQueue', () => {
	test('should be empty on creAtion', Async () => {
		const queue = new RequestQueue();
		Assert.strictEquAl(queue.length, 0);
		Assert.strictEquAl(queue.dequeue(), undefined);
	});

	suite('RequestQueue.creAteRequest', () => {
		test('should creAte items with increAsing sequence numbers', Async () => {
			const queue = new RequestQueue();

			for (let i = 0; i < 100; ++i) {
				const commAnd = `commAnd-${i}`;
				const request = queue.creAteRequest(commAnd, i);
				Assert.strictEquAl(request.seq, i);
				Assert.strictEquAl(request.commAnd, commAnd);
				Assert.strictEquAl(request.Arguments, i);
			}
		});
	});

	test('should queue normAl requests in first in first out order', Async () => {
		const queue = new RequestQueue();
		Assert.strictEquAl(queue.length, 0);

		const request1 = queue.creAteRequest('A', 1);
		queue.enqueue({ request: request1, expectsResponse: true, isAsync: fAlse, queueingType: RequestQueueingType.NormAl });
		Assert.strictEquAl(queue.length, 1);

		const request2 = queue.creAteRequest('b', 2);
		queue.enqueue({ request: request2, expectsResponse: true, isAsync: fAlse, queueingType: RequestQueueingType.NormAl });
		Assert.strictEquAl(queue.length, 2);

		{
			const item = queue.dequeue();
			Assert.strictEquAl(queue.length, 1);
			Assert.strictEquAl(item!.request.commAnd, 'A');
		}
		{
			const item = queue.dequeue();
			Assert.strictEquAl(queue.length, 0);
			Assert.strictEquAl(item!.request.commAnd, 'b');
		}
		{
			const item = queue.dequeue();
			Assert.strictEquAl(item, undefined);
			Assert.strictEquAl(queue.length, 0);
		}
	});

	test('should put normAl requests in front of low priority requests', Async () => {
		const queue = new RequestQueue();
		Assert.strictEquAl(queue.length, 0);

		queue.enqueue({ request: queue.creAteRequest('low-1', 1), expectsResponse: true, isAsync: fAlse, queueingType: RequestQueueingType.LowPriority });
		queue.enqueue({ request: queue.creAteRequest('low-2', 1), expectsResponse: true, isAsync: fAlse, queueingType: RequestQueueingType.LowPriority });
		queue.enqueue({ request: queue.creAteRequest('normAl-1', 2), expectsResponse: true, isAsync: fAlse, queueingType: RequestQueueingType.NormAl });
		queue.enqueue({ request: queue.creAteRequest('normAl-2', 2), expectsResponse: true, isAsync: fAlse, queueingType: RequestQueueingType.NormAl });

		{
			const item = queue.dequeue();
			Assert.strictEquAl(queue.length, 3);
			Assert.strictEquAl(item!.request.commAnd, 'normAl-1');
		}
		{
			const item = queue.dequeue();
			Assert.strictEquAl(queue.length, 2);
			Assert.strictEquAl(item!.request.commAnd, 'normAl-2');
		}
		{
			const item = queue.dequeue();
			Assert.strictEquAl(queue.length, 1);
			Assert.strictEquAl(item!.request.commAnd, 'low-1');
		}
		{
			const item = queue.dequeue();
			Assert.strictEquAl(queue.length, 0);
			Assert.strictEquAl(item!.request.commAnd, 'low-2');
		}
	});

	test('should not push fence requests front of low priority requests', Async () => {
		const queue = new RequestQueue();
		Assert.strictEquAl(queue.length, 0);

		queue.enqueue({ request: queue.creAteRequest('low-1', 0), expectsResponse: true, isAsync: fAlse, queueingType: RequestQueueingType.LowPriority });
		queue.enqueue({ request: queue.creAteRequest('fence', 0), expectsResponse: true, isAsync: fAlse, queueingType: RequestQueueingType.Fence });
		queue.enqueue({ request: queue.creAteRequest('low-2', 0), expectsResponse: true, isAsync: fAlse, queueingType: RequestQueueingType.LowPriority });
		queue.enqueue({ request: queue.creAteRequest('normAl', 0), expectsResponse: true, isAsync: fAlse, queueingType: RequestQueueingType.NormAl });

		{
			const item = queue.dequeue();
			Assert.strictEquAl(queue.length, 3);
			Assert.strictEquAl(item!.request.commAnd, 'low-1');
		}
		{
			const item = queue.dequeue();
			Assert.strictEquAl(queue.length, 2);
			Assert.strictEquAl(item!.request.commAnd, 'fence');
		}
		{
			const item = queue.dequeue();
			Assert.strictEquAl(queue.length, 1);
			Assert.strictEquAl(item!.request.commAnd, 'normAl');
		}
		{
			const item = queue.dequeue();
			Assert.strictEquAl(queue.length, 0);
			Assert.strictEquAl(item!.request.commAnd, 'low-2');
		}
	});
});

