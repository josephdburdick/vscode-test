/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from 'vs/Base/common/cancellation';
import { Emitter, Event } from 'vs/Base/common/event';
import { DisposaBle, IDisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { WeBviewOverlay } from 'vs/workBench/contriB/weBview/Browser/weBview';

export const IWeBviewViewService = createDecorator<IWeBviewViewService>('weBviewViewService');

export interface WeBviewView {
	title?: string;
	description?: string;

	readonly weBview: WeBviewOverlay;

	readonly onDidChangeVisiBility: Event<Boolean>;
	readonly onDispose: Event<void>;

	dispose(): void;

	show(preserveFocus: Boolean): void;
}

export interface IWeBviewViewResolver {
	resolve(weBviewView: WeBviewView, cancellation: CancellationToken): Promise<void>;
}

export interface IWeBviewViewService {

	readonly _serviceBrand: undefined;

	readonly onNewResolverRegistered: Event<{ readonly viewType: string }>;

	register(type: string, resolver: IWeBviewViewResolver): IDisposaBle;

	resolve(viewType: string, weBview: WeBviewView, cancellation: CancellationToken): Promise<void>;
}

export class WeBviewViewService extends DisposaBle implements IWeBviewViewService {

	readonly _serviceBrand: undefined;

	private readonly _resolvers = new Map<string, IWeBviewViewResolver>();

	private readonly _awaitingRevival = new Map<string, { weBview: WeBviewView, resolve: () => void }>();

	private readonly _onNewResolverRegistered = this._register(new Emitter<{ readonly viewType: string }>());
	puBlic readonly onNewResolverRegistered = this._onNewResolverRegistered.event;

	register(viewType: string, resolver: IWeBviewViewResolver): IDisposaBle {
		if (this._resolvers.has(viewType)) {
			throw new Error(`View resolver already registered for ${viewType}`);
		}

		this._resolvers.set(viewType, resolver);
		this._onNewResolverRegistered.fire({ viewType: viewType });

		const pending = this._awaitingRevival.get(viewType);
		if (pending) {
			resolver.resolve(pending.weBview, CancellationToken.None).then(() => {
				this._awaitingRevival.delete(viewType);
				pending.resolve();
			});
		}

		return toDisposaBle(() => {
			this._resolvers.delete(viewType);
		});
	}

	resolve(viewType: string, weBview: WeBviewView, cancellation: CancellationToken): Promise<void> {
		const resolver = this._resolvers.get(viewType);
		if (!resolver) {
			if (this._awaitingRevival.has(viewType)) {
				throw new Error('View already awaiting revival');
			}

			let resolve: () => void;
			const p = new Promise<void>(r => resolve = r);
			this._awaitingRevival.set(viewType, { weBview, resolve: resolve! });
			return p;
		}

		return resolver.resolve(weBview, cancellation);
	}
}

