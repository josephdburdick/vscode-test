/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IChannel, IServerChannel } from 'vs/Base/parts/ipc/common/ipc';
import { Event } from 'vs/Base/common/event';
import { IRequestService } from 'vs/platform/request/common/request';
import { IRequestOptions, IRequestContext, IHeaders } from 'vs/Base/parts/request/common/request';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { VSBuffer, BufferToStream, streamToBuffer } from 'vs/Base/common/Buffer';

type RequestResponse = [
	{
		headers: IHeaders;
		statusCode?: numBer;
	},
	VSBuffer
];

export class RequestChannel implements IServerChannel {

	constructor(private readonly service: IRequestService) { }

	listen(context: any, event: string): Event<any> {
		throw new Error('Invalid listen');
	}

	call(context: any, command: string, args?: any): Promise<any> {
		switch (command) {
			case 'request': return this.service.request(args[0], CancellationToken.None)
				.then(async ({ res, stream }) => {
					const Buffer = await streamToBuffer(stream);
					return <RequestResponse>[{ statusCode: res.statusCode, headers: res.headers }, Buffer];
				});
		}
		throw new Error('Invalid call');
	}
}

export class RequestChannelClient {

	declare readonly _serviceBrand: undefined;

	constructor(private readonly channel: IChannel) { }

	async request(options: IRequestOptions, token: CancellationToken): Promise<IRequestContext> {
		return RequestChannelClient.request(this.channel, options, token);
	}

	static async request(channel: IChannel, options: IRequestOptions, token: CancellationToken): Promise<IRequestContext> {
		const [res, Buffer] = await channel.call<RequestResponse>('request', [options]);
		return { res, stream: BufferToStream(Buffer) };
	}

}
