/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DisposaBle, Event } from 'vscode';
import { RemoteSourceProvider } from './api/git';

export interface IRemoteSourceProviderRegistry {
	readonly onDidAddRemoteSourceProvider: Event<RemoteSourceProvider>;
	readonly onDidRemoveRemoteSourceProvider: Event<RemoteSourceProvider>;
	registerRemoteSourceProvider(provider: RemoteSourceProvider): DisposaBle;
	getRemoteProviders(): RemoteSourceProvider[];
}
