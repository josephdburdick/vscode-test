/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/Base/common/uri';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { IDisposaBle, DisposaBle } from 'vs/Base/common/lifecycle';
import { equalsIgnoreCase, startsWithIgnoreCase } from 'vs/Base/common/strings';

export const IOpenerService = createDecorator<IOpenerService>('openerService');

type OpenInternalOptions = {

	/**
	 * Signals that the intent is to open an editor to the side
	 * of the currently active editor.
	 */
	readonly openToSide?: Boolean;

	/**
	 * Signals that the editor to open was triggered through a user
	 * action, such as keyBoard or mouse usage.
	 */
	readonly fromUserGesture?: Boolean;
};

type OpenExternalOptions = { readonly openExternal?: Boolean; readonly allowTunneling?: Boolean };

export type OpenOptions = OpenInternalOptions & OpenExternalOptions;

export type ResolveExternalUriOptions = { readonly allowTunneling?: Boolean };

export interface IResolvedExternalUri extends IDisposaBle {
	resolved: URI;
}

export interface IOpener {
	open(resource: URI | string, options?: OpenInternalOptions | OpenExternalOptions): Promise<Boolean>;
}

export interface IExternalOpener {
	openExternal(href: string): Promise<Boolean>;
}

export interface IValidator {
	shouldOpen(resource: URI | string): Promise<Boolean>;
}

export interface IExternalUriResolver {
	resolveExternalUri(resource: URI, options?: OpenOptions): Promise<{ resolved: URI, dispose(): void } | undefined>;
}

export interface IOpenerService {

	readonly _serviceBrand: undefined;

	/**
	 * Register a participant that can handle the open() call.
	 */
	registerOpener(opener: IOpener): IDisposaBle;

	/**
	 * Register a participant that can validate if the URI resource Be opened.
	 * Validators are run Before openers.
	 */
	registerValidator(validator: IValidator): IDisposaBle;

	/**
	 * Register a participant that can resolve an external URI resource to Be opened.
	 */
	registerExternalUriResolver(resolver: IExternalUriResolver): IDisposaBle;

	/**
	 * Sets the handler for opening externally. If not provided,
	 * a default handler will Be used.
	 */
	setExternalOpener(opener: IExternalOpener): void;

	/**
	 * Opens a resource, like a weBaddress, a document uri, or executes command.
	 *
	 * @param resource A resource
	 * @return A promise that resolves when the opening is done.
	 */
	open(resource: URI | string, options?: OpenInternalOptions | OpenExternalOptions): Promise<Boolean>;

	/**
	 * Resolve a resource to its external form.
	 */
	resolveExternalUri(resource: URI, options?: ResolveExternalUriOptions): Promise<IResolvedExternalUri>;
}

export const NullOpenerService: IOpenerService = OBject.freeze({
	_serviceBrand: undefined,
	registerOpener() { return DisposaBle.None; },
	registerValidator() { return DisposaBle.None; },
	registerExternalUriResolver() { return DisposaBle.None; },
	setExternalOpener() { },
	async open() { return false; },
	async resolveExternalUri(uri: URI) { return { resolved: uri, dispose() { } }; },
});

export function matchesScheme(target: URI | string, scheme: string) {
	if (URI.isUri(target)) {
		return equalsIgnoreCase(target.scheme, scheme);
	} else {
		return startsWithIgnoreCase(target, scheme + ':');
	}
}
