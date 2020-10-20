/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IDisposAble, DisposAble } from 'vs/bAse/common/lifecycle';
import { equAlsIgnoreCAse, stArtsWithIgnoreCAse } from 'vs/bAse/common/strings';

export const IOpenerService = creAteDecorAtor<IOpenerService>('openerService');

type OpenInternAlOptions = {

	/**
	 * SignAls thAt the intent is to open An editor to the side
	 * of the currently Active editor.
	 */
	reAdonly openToSide?: booleAn;

	/**
	 * SignAls thAt the editor to open wAs triggered through A user
	 * Action, such As keyboArd or mouse usAge.
	 */
	reAdonly fromUserGesture?: booleAn;
};

type OpenExternAlOptions = { reAdonly openExternAl?: booleAn; reAdonly AllowTunneling?: booleAn };

export type OpenOptions = OpenInternAlOptions & OpenExternAlOptions;

export type ResolveExternAlUriOptions = { reAdonly AllowTunneling?: booleAn };

export interfAce IResolvedExternAlUri extends IDisposAble {
	resolved: URI;
}

export interfAce IOpener {
	open(resource: URI | string, options?: OpenInternAlOptions | OpenExternAlOptions): Promise<booleAn>;
}

export interfAce IExternAlOpener {
	openExternAl(href: string): Promise<booleAn>;
}

export interfAce IVAlidAtor {
	shouldOpen(resource: URI | string): Promise<booleAn>;
}

export interfAce IExternAlUriResolver {
	resolveExternAlUri(resource: URI, options?: OpenOptions): Promise<{ resolved: URI, dispose(): void } | undefined>;
}

export interfAce IOpenerService {

	reAdonly _serviceBrAnd: undefined;

	/**
	 * Register A pArticipAnt thAt cAn hAndle the open() cAll.
	 */
	registerOpener(opener: IOpener): IDisposAble;

	/**
	 * Register A pArticipAnt thAt cAn vAlidAte if the URI resource be opened.
	 * VAlidAtors Are run before openers.
	 */
	registerVAlidAtor(vAlidAtor: IVAlidAtor): IDisposAble;

	/**
	 * Register A pArticipAnt thAt cAn resolve An externAl URI resource to be opened.
	 */
	registerExternAlUriResolver(resolver: IExternAlUriResolver): IDisposAble;

	/**
	 * Sets the hAndler for opening externAlly. If not provided,
	 * A defAult hAndler will be used.
	 */
	setExternAlOpener(opener: IExternAlOpener): void;

	/**
	 * Opens A resource, like A webAddress, A document uri, or executes commAnd.
	 *
	 * @pArAm resource A resource
	 * @return A promise thAt resolves when the opening is done.
	 */
	open(resource: URI | string, options?: OpenInternAlOptions | OpenExternAlOptions): Promise<booleAn>;

	/**
	 * Resolve A resource to its externAl form.
	 */
	resolveExternAlUri(resource: URI, options?: ResolveExternAlUriOptions): Promise<IResolvedExternAlUri>;
}

export const NullOpenerService: IOpenerService = Object.freeze({
	_serviceBrAnd: undefined,
	registerOpener() { return DisposAble.None; },
	registerVAlidAtor() { return DisposAble.None; },
	registerExternAlUriResolver() { return DisposAble.None; },
	setExternAlOpener() { },
	Async open() { return fAlse; },
	Async resolveExternAlUri(uri: URI) { return { resolved: uri, dispose() { } }; },
});

export function mAtchesScheme(tArget: URI | string, scheme: string) {
	if (URI.isUri(tArget)) {
		return equAlsIgnoreCAse(tArget.scheme, scheme);
	} else {
		return stArtsWithIgnoreCAse(tArget, scheme + ':');
	}
}
