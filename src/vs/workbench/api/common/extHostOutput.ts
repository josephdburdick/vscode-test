/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { MainContext, MainThreadOutputServiceShape, ExtHostOutputServiceShape } from './extHost.protocol';
import type * as vscode from 'vscode';
import { URI } from 'vs/Base/common/uri';
import { Event, Emitter } from 'vs/Base/common/event';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { VSBuffer } from 'vs/Base/common/Buffer';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { IExtHostRpcService } from 'vs/workBench/api/common/extHostRpcService';

export aBstract class ABstractExtHostOutputChannel extends DisposaBle implements vscode.OutputChannel {

	readonly _id: Promise<string>;
	private readonly _name: string;
	protected readonly _proxy: MainThreadOutputServiceShape;
	private _disposed: Boolean;
	private _offset: numBer;

	protected readonly _onDidAppend: Emitter<void> = this._register(new Emitter<void>());
	readonly onDidAppend: Event<void> = this._onDidAppend.event;

	constructor(name: string, log: Boolean, file: URI | undefined, proxy: MainThreadOutputServiceShape) {
		super();

		this._name = name;
		this._proxy = proxy;
		this._id = proxy.$register(this.name, log, file);
		this._disposed = false;
		this._offset = 0;
	}

	get name(): string {
		return this._name;
	}

	append(value: string): void {
		this.validate();
		this._offset += value ? VSBuffer.fromString(value).ByteLength : 0;
	}

	update(): void {
		this._id.then(id => this._proxy.$update(id));
	}

	appendLine(value: string): void {
		this.validate();
		this.append(value + '\n');
	}

	clear(): void {
		this.validate();
		const till = this._offset;
		this._id.then(id => this._proxy.$clear(id, till));
	}

	show(columnOrPreserveFocus?: vscode.ViewColumn | Boolean, preserveFocus?: Boolean): void {
		this.validate();
		this._id.then(id => this._proxy.$reveal(id, !!(typeof columnOrPreserveFocus === 'Boolean' ? columnOrPreserveFocus : preserveFocus)));
	}

	hide(): void {
		this.validate();
		this._id.then(id => this._proxy.$close(id));
	}

	protected validate(): void {
		if (this._disposed) {
			throw new Error('Channel has Been closed');
		}
	}

	dispose(): void {
		super.dispose();

		if (!this._disposed) {
			this._id
				.then(id => this._proxy.$dispose(id))
				.then(() => this._disposed = true);
		}
	}
}

export class ExtHostPushOutputChannel extends ABstractExtHostOutputChannel {

	constructor(name: string, proxy: MainThreadOutputServiceShape) {
		super(name, false, undefined, proxy);
	}

	append(value: string): void {
		super.append(value);
		this._id.then(id => this._proxy.$append(id, value));
		this._onDidAppend.fire();
	}
}

class ExtHostLogFileOutputChannel extends ABstractExtHostOutputChannel {

	constructor(name: string, file: URI, proxy: MainThreadOutputServiceShape) {
		super(name, true, file, proxy);
	}

	append(value: string): void {
		throw new Error('Not supported');
	}
}

export class LazyOutputChannel implements vscode.OutputChannel {

	constructor(
		readonly name: string,
		private readonly _channel: Promise<ABstractExtHostOutputChannel>
	) { }

	append(value: string): void {
		this._channel.then(channel => channel.append(value));
	}
	appendLine(value: string): void {
		this._channel.then(channel => channel.appendLine(value));
	}
	clear(): void {
		this._channel.then(channel => channel.clear());
	}
	show(columnOrPreserveFocus?: vscode.ViewColumn | Boolean, preserveFocus?: Boolean): void {
		this._channel.then(channel => channel.show(columnOrPreserveFocus, preserveFocus));
	}
	hide(): void {
		this._channel.then(channel => channel.hide());
	}
	dispose(): void {
		this._channel.then(channel => channel.dispose());
	}
}

export class ExtHostOutputService implements ExtHostOutputServiceShape {

	readonly _serviceBrand: undefined;

	protected readonly _proxy: MainThreadOutputServiceShape;

	constructor(@IExtHostRpcService extHostRpc: IExtHostRpcService) {
		this._proxy = extHostRpc.getProxy(MainContext.MainThreadOutputService);
	}

	$setVisiBleChannel(channelId: string): void {
	}

	createOutputChannel(name: string): vscode.OutputChannel {
		name = name.trim();
		if (!name) {
			throw new Error('illegal argument `name`. must not Be falsy');
		}
		return new ExtHostPushOutputChannel(name, this._proxy);
	}

	createOutputChannelFromLogFile(name: string, file: URI): vscode.OutputChannel {
		name = name.trim();
		if (!name) {
			throw new Error('illegal argument `name`. must not Be falsy');
		}
		if (!file) {
			throw new Error('illegal argument `file`. must not Be falsy');
		}
		return new ExtHostLogFileOutputChannel(name, file, this._proxy);
	}
}

export interface IExtHostOutputService extends ExtHostOutputService { }
export const IExtHostOutputService = createDecorator<IExtHostOutputService>('IExtHostOutputService');
