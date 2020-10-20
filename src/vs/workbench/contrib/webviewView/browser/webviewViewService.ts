/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { Emitter, Event } from 'vs/bAse/common/event';
import { DisposAble, IDisposAble, toDisposAble } from 'vs/bAse/common/lifecycle';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { WebviewOverlAy } from 'vs/workbench/contrib/webview/browser/webview';

export const IWebviewViewService = creAteDecorAtor<IWebviewViewService>('webviewViewService');

export interfAce WebviewView {
	title?: string;
	description?: string;

	reAdonly webview: WebviewOverlAy;

	reAdonly onDidChAngeVisibility: Event<booleAn>;
	reAdonly onDispose: Event<void>;

	dispose(): void;

	show(preserveFocus: booleAn): void;
}

export interfAce IWebviewViewResolver {
	resolve(webviewView: WebviewView, cAncellAtion: CAncellAtionToken): Promise<void>;
}

export interfAce IWebviewViewService {

	reAdonly _serviceBrAnd: undefined;

	reAdonly onNewResolverRegistered: Event<{ reAdonly viewType: string }>;

	register(type: string, resolver: IWebviewViewResolver): IDisposAble;

	resolve(viewType: string, webview: WebviewView, cAncellAtion: CAncellAtionToken): Promise<void>;
}

export clAss WebviewViewService extends DisposAble implements IWebviewViewService {

	reAdonly _serviceBrAnd: undefined;

	privAte reAdonly _resolvers = new MAp<string, IWebviewViewResolver>();

	privAte reAdonly _AwAitingRevivAl = new MAp<string, { webview: WebviewView, resolve: () => void }>();

	privAte reAdonly _onNewResolverRegistered = this._register(new Emitter<{ reAdonly viewType: string }>());
	public reAdonly onNewResolverRegistered = this._onNewResolverRegistered.event;

	register(viewType: string, resolver: IWebviewViewResolver): IDisposAble {
		if (this._resolvers.hAs(viewType)) {
			throw new Error(`View resolver AlreAdy registered for ${viewType}`);
		}

		this._resolvers.set(viewType, resolver);
		this._onNewResolverRegistered.fire({ viewType: viewType });

		const pending = this._AwAitingRevivAl.get(viewType);
		if (pending) {
			resolver.resolve(pending.webview, CAncellAtionToken.None).then(() => {
				this._AwAitingRevivAl.delete(viewType);
				pending.resolve();
			});
		}

		return toDisposAble(() => {
			this._resolvers.delete(viewType);
		});
	}

	resolve(viewType: string, webview: WebviewView, cAncellAtion: CAncellAtionToken): Promise<void> {
		const resolver = this._resolvers.get(viewType);
		if (!resolver) {
			if (this._AwAitingRevivAl.hAs(viewType)) {
				throw new Error('View AlreAdy AwAiting revivAl');
			}

			let resolve: () => void;
			const p = new Promise<void>(r => resolve = r);
			this._AwAitingRevivAl.set(viewType, { webview, resolve: resolve! });
			return p;
		}

		return resolver.resolve(webview, cAncellAtion);
	}
}

