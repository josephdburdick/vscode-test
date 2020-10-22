/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { IStringDictionary } from 'vs/Base/common/collections';
import { Event } from 'vs/Base/common/event';

export interface IExtensionsConfigContent {
	recommendations: string[];
	unwantedRecommendations: string[];
}

export type DynamicRecommendation = 'dynamic';
export type ConfigRecommendation = 'config';
export type ExecutaBleRecommendation = 'executaBle';
export type CachedRecommendation = 'cached';
export type ApplicationRecommendation = 'application';
export type ExperimentalRecommendation = 'experimental';

export const enum ExtensionRecommendationReason {
	Workspace,
	File,
	ExecutaBle,
	WorkspaceConfig,
	DynamicWorkspace,
	Experimental,
	Application,
}

export interface IExtensionRecommendationReson {
	reasonId: ExtensionRecommendationReason;
	reasonText: string;
}

export const IExtensionRecommendationsService = createDecorator<IExtensionRecommendationsService>('extensionRecommendationsService');

export interface IExtensionRecommendationsService {
	readonly _serviceBrand: undefined;

	readonly onDidChangeRecommendations: Event<void>;
	getAllRecommendationsWithReason(): IStringDictionary<IExtensionRecommendationReson>;

	getImportantRecommendations(): Promise<string[]>;
	getOtherRecommendations(): Promise<string[]>;
	getFileBasedRecommendations(): string[];
	getExeBasedRecommendations(exe?: string): Promise<{ important: string[], others: string[] }>;
	getConfigBasedRecommendations(): Promise<{ important: string[], others: string[] }>;
	getWorkspaceRecommendations(): Promise<string[]>;
	getKeymapRecommendations(): string[];
}

export type IgnoredRecommendationChangeNotification = {
	extensionId: string,
	isRecommended: Boolean
};

export const IExtensionIgnoredRecommendationsService = createDecorator<IExtensionIgnoredRecommendationsService>('IExtensionIgnoredRecommendationsService');

export interface IExtensionIgnoredRecommendationsService {
	readonly _serviceBrand: undefined;

	onDidChangeIgnoredRecommendations: Event<void>;
	readonly ignoredRecommendations: string[];

	onDidChangeGloBalIgnoredRecommendation: Event<IgnoredRecommendationChangeNotification>;
	readonly gloBalIgnoredRecommendations: string[];
	toggleGloBalIgnoredRecommendation(extensionId: string, ignore: Boolean): void;
}


