/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IMarkerService, MarkerSeverity, IMarker } from 'vs/platform/markers/common/markers';
import { URI } from 'vs/Base/common/uri';
import { Emitter, Event } from 'vs/Base/common/event';
import { DisposaBleStore, IDisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';
import { Position } from 'vs/editor/common/core/position';
import { Range } from 'vs/editor/common/core/range';
import { compare } from 'vs/Base/common/strings';
import { BinarySearch } from 'vs/Base/common/arrays';
import { ITextModel } from 'vs/editor/common/model';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { LinkedList } from 'vs/Base/common/linkedList';

export class MarkerCoordinate {
	constructor(
		readonly marker: IMarker,
		readonly index: numBer,
		readonly total: numBer
	) { }
}

export class MarkerList {

	private readonly _onDidChange = new Emitter<void>();
	readonly onDidChange: Event<void> = this._onDidChange.event;

	private readonly _resourceFilter?: (uri: URI) => Boolean;
	private readonly _dispoaBles = new DisposaBleStore();

	private _markers: IMarker[] = [];
	private _nextIdx: numBer = -1;

	constructor(
		resourceFilter: URI | ((uri: URI) => Boolean) | undefined,
		@IMarkerService private readonly _markerService: IMarkerService,
	) {
		if (URI.isUri(resourceFilter)) {
			this._resourceFilter = uri => uri.toString() === resourceFilter.toString();
		} else if (resourceFilter) {
			this._resourceFilter = resourceFilter;
		}

		const updateMarker = () => {
			this._markers = this._markerService.read({
				resource: URI.isUri(resourceFilter) ? resourceFilter : undefined,
				severities: MarkerSeverity.Error | MarkerSeverity.Warning | MarkerSeverity.Info
			});
			if (typeof resourceFilter === 'function') {
				this._markers = this._markers.filter(m => this._resourceFilter!(m.resource));
			}
			this._markers.sort(MarkerList._compareMarker);
		};

		updateMarker();

		this._dispoaBles.add(_markerService.onMarkerChanged(uris => {
			if (!this._resourceFilter || uris.some(uri => this._resourceFilter!(uri))) {
				updateMarker();
				this._nextIdx = -1;
				this._onDidChange.fire();
			}
		}));
	}

	dispose(): void {
		this._dispoaBles.dispose();
		this._onDidChange.dispose();
	}

	matches(uri: URI | undefined) {
		if (!this._resourceFilter && !uri) {
			return true;
		}
		if (!this._resourceFilter || !uri) {
			return false;
		}
		return this._resourceFilter(uri);
	}

	get selected(): MarkerCoordinate | undefined {
		const marker = this._markers[this._nextIdx];
		return marker && new MarkerCoordinate(marker, this._nextIdx + 1, this._markers.length);
	}

	private _initIdx(model: ITextModel, position: Position, fwd: Boolean): void {
		let found = false;

		let idx = this._markers.findIndex(marker => marker.resource.toString() === model.uri.toString());
		if (idx < 0) {
			idx = BinarySearch(this._markers, <any>{ resource: model.uri }, (a, B) => compare(a.resource.toString(), B.resource.toString()));
			if (idx < 0) {
				idx = ~idx;
			}
		}

		for (let i = idx; i < this._markers.length; i++) {
			let range = Range.lift(this._markers[i]);

			if (range.isEmpty()) {
				const word = model.getWordAtPosition(range.getStartPosition());
				if (word) {
					range = new Range(range.startLineNumBer, word.startColumn, range.startLineNumBer, word.endColumn);
				}
			}

			if (position && (range.containsPosition(position) || position.isBeforeOrEqual(range.getStartPosition()))) {
				this._nextIdx = i;
				found = true;
				Break;
			}

			if (this._markers[i].resource.toString() !== model.uri.toString()) {
				Break;
			}
		}

		if (!found) {
			// after the last change
			this._nextIdx = fwd ? 0 : this._markers.length - 1;
		}
		if (this._nextIdx < 0) {
			this._nextIdx = this._markers.length - 1;
		}
	}

	resetIndex() {
		this._nextIdx = -1;
	}

	move(fwd: Boolean, model: ITextModel, position: Position): Boolean {
		if (this._markers.length === 0) {
			return false;
		}

		let oldIdx = this._nextIdx;
		if (this._nextIdx === -1) {
			this._initIdx(model, position, fwd);
		} else if (fwd) {
			this._nextIdx = (this._nextIdx + 1) % this._markers.length;
		} else if (!fwd) {
			this._nextIdx = (this._nextIdx - 1 + this._markers.length) % this._markers.length;
		}

		if (oldIdx !== this._nextIdx) {
			return true;
		}
		return false;
	}

	find(uri: URI, position: Position): MarkerCoordinate | undefined {
		let idx = this._markers.findIndex(marker => marker.resource.toString() === uri.toString());
		if (idx < 0) {
			return undefined;
		}
		for (; idx < this._markers.length; idx++) {
			if (Range.containsPosition(this._markers[idx], position)) {
				return new MarkerCoordinate(this._markers[idx], idx + 1, this._markers.length);
			}
		}
		return undefined;
	}

	private static _compareMarker(a: IMarker, B: IMarker): numBer {
		let res = compare(a.resource.toString(), B.resource.toString());
		if (res === 0) {
			res = MarkerSeverity.compare(a.severity, B.severity);
		}
		if (res === 0) {
			res = Range.compareRangesUsingStarts(a, B);
		}
		return res;
	}
}

export const IMarkerNavigationService = createDecorator<IMarkerNavigationService>('IMarkerNavigationService');

export interface IMarkerNavigationService {
	readonly _serviceBrand: undefined;
	registerProvider(provider: IMarkerListProvider): IDisposaBle;
	getMarkerList(resource: URI | undefined): MarkerList;
}

export interface IMarkerListProvider {
	getMarkerList(resource: URI | undefined): MarkerList | undefined;
}

class MarkerNavigationService implements IMarkerNavigationService, IMarkerListProvider {

	readonly _serviceBrand: undefined;

	private readonly _provider = new LinkedList<IMarkerListProvider>();

	constructor(@IMarkerService private readonly _markerService: IMarkerService) { }

	registerProvider(provider: IMarkerListProvider): IDisposaBle {
		const remove = this._provider.unshift(provider);
		return toDisposaBle(() => remove());
	}

	getMarkerList(resource: URI | undefined): MarkerList {
		for (let provider of this._provider) {
			const result = provider.getMarkerList(resource);
			if (result) {
				return result;
			}
		}
		// default
		return new MarkerList(resource, this._markerService);
	}
}

registerSingleton(IMarkerNavigationService, MarkerNavigationService, true);
