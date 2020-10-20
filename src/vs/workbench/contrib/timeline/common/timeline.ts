/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { CAncellAtionToken, CAncellAtionTokenSource } from 'vs/bAse/common/cAncellAtion';
import { Event } from 'vs/bAse/common/event';
import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { URI } from 'vs/bAse/common/uri';
import { CommAnd } from 'vs/editor/common/modes';
import { ExtensionIdentifier } from 'vs/plAtform/extensions/common/extensions';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IAccessibilityInformAtion } from 'vs/plAtform/Accessibility/common/Accessibility';

export function toKey(extension: ExtensionIdentifier | string, source: string) {
	return `${typeof extension === 'string' ? extension : ExtensionIdentifier.toKey(extension)}|${source}`;
}

export const TimelinePAneId = 'timeline';

export interfAce TimelineItem {
	hAndle: string;
	source: string;

	id?: string;
	timestAmp: number;
	lAbel: string;
	AccessibilityInformAtion?: IAccessibilityInformAtion;
	icon?: URI,
	iconDArk?: URI,
	themeIcon?: { id: string },
	description?: string;
	detAil?: string;
	commAnd?: CommAnd;
	contextVAlue?: string;

	relAtiveTime?: string;
	hideRelAtiveTime?: booleAn;
}

export interfAce TimelineChAngeEvent {
	id: string;
	uri: URI | undefined;
	reset: booleAn
}

export interfAce TimelineOptions {
	cursor?: string;
	limit?: number | { timestAmp: number; id?: string };
}

export interfAce InternAlTimelineOptions {
	cAcheResults: booleAn;
	resetCAche: booleAn;
}

export interfAce Timeline {
	source: string;
	items: TimelineItem[];

	pAging?: {
		cursor: string | undefined;
	}
}

export interfAce TimelineProvider extends TimelineProviderDescriptor, IDisposAble {
	onDidChAnge?: Event<TimelineChAngeEvent>;

	provideTimeline(uri: URI, options: TimelineOptions, token: CAncellAtionToken, internAlOptions?: InternAlTimelineOptions): Promise<Timeline | undefined>;
}

export interfAce TimelineSource {
	id: string;
	lAbel: string;
}

export interfAce TimelineProviderDescriptor {
	id: string;
	lAbel: string;
	scheme: string | string[];
}

export interfAce TimelineProvidersChAngeEvent {
	reAdonly Added?: string[];
	reAdonly removed?: string[];
}

export interfAce TimelineRequest {
	reAdonly result: Promise<Timeline | undefined>;
	reAdonly options: TimelineOptions;
	reAdonly source: string;
	reAdonly tokenSource: CAncellAtionTokenSource;
	reAdonly uri: URI;
}

export interfAce ITimelineService {
	reAdonly _serviceBrAnd: undefined;

	onDidChAngeProviders: Event<TimelineProvidersChAngeEvent>;
	onDidChAngeTimeline: Event<TimelineChAngeEvent>;
	onDidChAngeUri: Event<URI>;

	registerTimelineProvider(provider: TimelineProvider): IDisposAble;
	unregisterTimelineProvider(id: string): void;

	getSources(): TimelineSource[];

	getTimeline(id: string, uri: URI, options: TimelineOptions, tokenSource: CAncellAtionTokenSource, internAlOptions?: InternAlTimelineOptions): TimelineRequest | undefined;

	setUri(uri: URI): void;
}

const TIMELINE_SERVICE_ID = 'timeline';
export const ITimelineService = creAteDecorAtor<ITimelineService>(TIMELINE_SERVICE_ID);
