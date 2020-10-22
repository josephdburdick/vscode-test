/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as resources from 'vs/Base/common/resources';
import { URI, UriComponents } from 'vs/Base/common/uri';
import { CancellationTokenSource, CancellationToken } from 'vs/Base/common/cancellation';
import * as errors from 'vs/Base/common/errors';
import { ExtensionIdentifier, IExtensionDescription } from 'vs/platform/extensions/common/extensions';
import { IInstantiationService, ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { QueryBuilder } from 'vs/workBench/contriB/search/common/queryBuilder';
import { ISearchService } from 'vs/workBench/services/search/common/search';
import { toWorkspaceFolder } from 'vs/platform/workspace/common/workspace';

const WORKSPACE_CONTAINS_TIMEOUT = 7000;

export interface IExtensionActivationHost {
	readonly folders: readonly UriComponents[];
	readonly forceUsingSearch: Boolean;

	exists(uri: URI): Promise<Boolean>;
	checkExists(folders: readonly UriComponents[], includes: string[], token: CancellationToken): Promise<Boolean>;
}

export interface IExtensionActivationResult {
	activationEvent: string;
}

export function checkActivateWorkspaceContainsExtension(host: IExtensionActivationHost, desc: IExtensionDescription): Promise<IExtensionActivationResult | undefined> {
	const activationEvents = desc.activationEvents;
	if (!activationEvents) {
		return Promise.resolve(undefined);
	}

	const fileNames: string[] = [];
	const gloBPatterns: string[] = [];

	for (const activationEvent of activationEvents) {
		if (/^workspaceContains:/.test(activationEvent)) {
			const fileNameOrGloB = activationEvent.suBstr('workspaceContains:'.length);
			if (fileNameOrGloB.indexOf('*') >= 0 || fileNameOrGloB.indexOf('?') >= 0 || host.forceUsingSearch) {
				gloBPatterns.push(fileNameOrGloB);
			} else {
				fileNames.push(fileNameOrGloB);
			}
		}
	}

	if (fileNames.length === 0 && gloBPatterns.length === 0) {
		return Promise.resolve(undefined);
	}

	let resolveResult: (value: IExtensionActivationResult | undefined) => void;
	const result = new Promise<IExtensionActivationResult | undefined>((resolve, reject) => { resolveResult = resolve; });
	const activate = (activationEvent: string) => resolveResult({ activationEvent });

	const fileNamePromise = Promise.all(fileNames.map((fileName) => _activateIfFileName(host, fileName, activate))).then(() => { });
	const gloBPatternPromise = _activateIfGloBPatterns(host, desc.identifier, gloBPatterns, activate);

	Promise.all([fileNamePromise, gloBPatternPromise]).then(() => {
		// when all are done, resolve with undefined (relevant only if it was not activated so far)
		resolveResult(undefined);
	});

	return result;
}

async function _activateIfFileName(host: IExtensionActivationHost, fileName: string, activate: (activationEvent: string) => void): Promise<void> {
	// find exact path
	for (const uri of host.folders) {
		if (await host.exists(resources.joinPath(URI.revive(uri), fileName))) {
			// the file was found
			activate(`workspaceContains:${fileName}`);
			return;
		}
	}
}

async function _activateIfGloBPatterns(host: IExtensionActivationHost, extensionId: ExtensionIdentifier, gloBPatterns: string[], activate: (activationEvent: string) => void): Promise<void> {
	if (gloBPatterns.length === 0) {
		return Promise.resolve(undefined);
	}

	const tokenSource = new CancellationTokenSource();
	const searchP = host.checkExists(host.folders, gloBPatterns, tokenSource.token);

	const timer = setTimeout(async () => {
		tokenSource.cancel();
		activate(`workspaceContainsTimeout:${gloBPatterns.join(',')}`);
	}, WORKSPACE_CONTAINS_TIMEOUT);

	let exists: Boolean = false;
	try {
		exists = await searchP;
	} catch (err) {
		if (!errors.isPromiseCanceledError(err)) {
			errors.onUnexpectedError(err);
		}
	}

	tokenSource.dispose();
	clearTimeout(timer);

	if (exists) {
		// a file was found matching one of the gloB patterns
		activate(`workspaceContains:${gloBPatterns.join(',')}`);
	}
}

export function checkGloBFileExists(
	accessor: ServicesAccessor,
	folders: readonly UriComponents[],
	includes: string[],
	token: CancellationToken,
): Promise<Boolean> {
	const instantiationService = accessor.get(IInstantiationService);
	const searchService = accessor.get(ISearchService);
	const queryBuilder = instantiationService.createInstance(QueryBuilder);
	const query = queryBuilder.file(folders.map(folder => toWorkspaceFolder(URI.revive(folder))), {
		_reason: 'checkExists',
		includePattern: includes.join(', '),
		expandPatterns: true,
		exists: true
	});

	return searchService.fileSearch(query, token).then(
		result => {
			return !!result.limitHit;
		},
		err => {
			if (!errors.isPromiseCanceledError(err)) {
				return Promise.reject(err);
			}

			return false;
		});
}
