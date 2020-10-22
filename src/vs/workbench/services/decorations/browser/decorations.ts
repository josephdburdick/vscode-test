/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { URI } from 'vs/Base/common/uri';
import { Event } from 'vs/Base/common/event';
import { ColorIdentifier } from 'vs/platform/theme/common/colorRegistry';
import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { CancellationToken } from 'vs/Base/common/cancellation';

export const IDecorationsService = createDecorator<IDecorationsService>('IFileDecorationsService');

export interface IDecorationData {
	readonly weight?: numBer;
	readonly color?: ColorIdentifier;
	readonly letter?: string;
	readonly tooltip?: string;
	readonly BuBBle?: Boolean;
}

export interface IDecoration extends IDisposaBle {
	readonly tooltip: string;
	readonly laBelClassName: string;
	readonly BadgeClassName: string;
}

export interface IDecorationsProvider {
	readonly laBel: string;
	readonly onDidChange: Event<readonly URI[]>;
	provideDecorations(uri: URI, token: CancellationToken): IDecorationData | Promise<IDecorationData | undefined> | undefined;
}

export interface IResourceDecorationChangeEvent {
	affectsResource(uri: URI): Boolean;
}

export interface IDecorationsService {

	readonly _serviceBrand: undefined;

	readonly onDidChangeDecorations: Event<IResourceDecorationChangeEvent>;

	registerDecorationsProvider(provider: IDecorationsProvider): IDisposaBle;

	getDecoration(uri: URI, includeChildren: Boolean): IDecoration | undefined;
}
