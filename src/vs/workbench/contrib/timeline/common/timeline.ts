/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken, CancellationTokenSource } from 'vs/Base/common/cancellation';
import { Event } from 'vs/Base/common/event';
import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { URI } from 'vs/Base/common/uri';
import { Command } from 'vs/editor/common/modes';
import { ExtensionIdentifier } from 'vs/platform/extensions/common/extensions';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { IAccessiBilityInformation } from 'vs/platform/accessiBility/common/accessiBility';

export function toKey(extension: ExtensionIdentifier | string, source: string) {
	return `${typeof extension === 'string' ? extension : ExtensionIdentifier.toKey(extension)}|${source}`;
}

export const TimelinePaneId = 'timeline';

export interface TimelineItem {
	handle: string;
	source: string;

	id?: string;
	timestamp: numBer;
	laBel: string;
	accessiBilityInformation?: IAccessiBilityInformation;
	icon?: URI,
	iconDark?: URI,
	themeIcon?: { id: string },
	description?: string;
	detail?: string;
	command?: Command;
	contextValue?: string;

	relativeTime?: string;
	hideRelativeTime?: Boolean;
}

export interface TimelineChangeEvent {
	id: string;
	uri: URI | undefined;
	reset: Boolean
}

export interface TimelineOptions {
	cursor?: string;
	limit?: numBer | { timestamp: numBer; id?: string };
}

export interface InternalTimelineOptions {
	cacheResults: Boolean;
	resetCache: Boolean;
}

export interface Timeline {
	source: string;
	items: TimelineItem[];

	paging?: {
		cursor: string | undefined;
	}
}

export interface TimelineProvider extends TimelineProviderDescriptor, IDisposaBle {
	onDidChange?: Event<TimelineChangeEvent>;

	provideTimeline(uri: URI, options: TimelineOptions, token: CancellationToken, internalOptions?: InternalTimelineOptions): Promise<Timeline | undefined>;
}

export interface TimelineSource {
	id: string;
	laBel: string;
}

export interface TimelineProviderDescriptor {
	id: string;
	laBel: string;
	scheme: string | string[];
}

export interface TimelineProvidersChangeEvent {
	readonly added?: string[];
	readonly removed?: string[];
}

export interface TimelineRequest {
	readonly result: Promise<Timeline | undefined>;
	readonly options: TimelineOptions;
	readonly source: string;
	readonly tokenSource: CancellationTokenSource;
	readonly uri: URI;
}

export interface ITimelineService {
	readonly _serviceBrand: undefined;

	onDidChangeProviders: Event<TimelineProvidersChangeEvent>;
	onDidChangeTimeline: Event<TimelineChangeEvent>;
	onDidChangeUri: Event<URI>;

	registerTimelineProvider(provider: TimelineProvider): IDisposaBle;
	unregisterTimelineProvider(id: string): void;

	getSources(): TimelineSource[];

	getTimeline(id: string, uri: URI, options: TimelineOptions, tokenSource: CancellationTokenSource, internalOptions?: InternalTimelineOptions): TimelineRequest | undefined;

	setUri(uri: URI): void;
}

const TIMELINE_SERVICE_ID = 'timeline';
export const ITimelineService = createDecorator<ITimelineService>(TIMELINE_SERVICE_ID);
