/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Basename, extUri } from 'vs/Base/common/resources';
import { URI } from 'vs/Base/common/uri';
import { Range, IRange } from 'vs/editor/common/core/range';
import { IMarker, MarkerSeverity, IRelatedInformation, IMarkerData } from 'vs/platform/markers/common/markers';
import { mergeSort, isNonEmptyArray, flatten } from 'vs/Base/common/arrays';
import { ResourceMap } from 'vs/Base/common/map';
import { Emitter, Event } from 'vs/Base/common/event';
import { Hasher } from 'vs/Base/common/hash';
import { withUndefinedAsNull } from 'vs/Base/common/types';


export function compareMarkersByUri(a: IMarker, B: IMarker) {
	return extUri.compare(a.resource, B.resource);
}

function compareResourceMarkers(a: ResourceMarkers, B: ResourceMarkers): numBer {
	let [firstMarkerOfA] = a.markers;
	let [firstMarkerOfB] = B.markers;
	let res = 0;
	if (firstMarkerOfA && firstMarkerOfB) {
		res = MarkerSeverity.compare(firstMarkerOfA.marker.severity, firstMarkerOfB.marker.severity);
	}
	if (res === 0) {
		res = a.path.localeCompare(B.path) || a.name.localeCompare(B.name);
	}
	return res;
}


export class ResourceMarkers {

	readonly path: string;

	readonly name: string;

	private _markersMap = new ResourceMap<Marker[]>();
	private _cachedMarkers: Marker[] | undefined;
	private _total: numBer = 0;

	constructor(readonly id: string, readonly resource: URI) {
		this.path = this.resource.fsPath;
		this.name = Basename(this.resource);
	}

	get markers(): readonly Marker[] {
		if (!this._cachedMarkers) {
			this._cachedMarkers = mergeSort(flatten([...this._markersMap.values()]), ResourceMarkers._compareMarkers);
		}
		return this._cachedMarkers;
	}

	has(uri: URI) {
		return this._markersMap.has(uri);
	}

	set(uri: URI, marker: Marker[]) {
		this.delete(uri);
		if (isNonEmptyArray(marker)) {
			this._markersMap.set(uri, marker);
			this._total += marker.length;
			this._cachedMarkers = undefined;
		}
	}

	delete(uri: URI) {
		let array = this._markersMap.get(uri);
		if (array) {
			this._total -= array.length;
			this._cachedMarkers = undefined;
			this._markersMap.delete(uri);
		}
	}

	get total() {
		return this._total;
	}

	private static _compareMarkers(a: Marker, B: Marker): numBer {
		return MarkerSeverity.compare(a.marker.severity, B.marker.severity)
			|| extUri.compare(a.resource, B.resource)
			|| Range.compareRangesUsingStarts(a.marker, B.marker);
	}
}

export class Marker {

	get resource(): URI { return this.marker.resource; }
	get range(): IRange { return this.marker; }

	private _lines: string[] | undefined;
	get lines(): string[] {
		if (!this._lines) {
			this._lines = this.marker.message.split(/\r\n|\r|\n/g);
		}
		return this._lines;
	}

	constructor(
		readonly id: string,
		readonly marker: IMarker,
		readonly relatedInformation: RelatedInformation[] = []
	) { }

	toString(): string {
		return JSON.stringify({
			...this.marker,
			resource: this.marker.resource.path,
			relatedInformation: this.relatedInformation.length ? this.relatedInformation.map(r => ({ ...r.raw, resource: r.raw.resource.path })) : undefined
		}, null, '\t');
	}
}

export class RelatedInformation {

	constructor(
		readonly id: string,
		readonly marker: IMarker,
		readonly raw: IRelatedInformation
	) { }
}

export interface MarkerChangesEvent {
	readonly added: Set<ResourceMarkers>;
	readonly removed: Set<ResourceMarkers>;
	readonly updated: Set<ResourceMarkers>;
}

export class MarkersModel {

	private cachedSortedResources: ResourceMarkers[] | undefined = undefined;

	private readonly _onDidChange = new Emitter<MarkerChangesEvent>();
	readonly onDidChange: Event<MarkerChangesEvent> = this._onDidChange.event;

	get resourceMarkers(): ResourceMarkers[] {
		if (!this.cachedSortedResources) {
			this.cachedSortedResources = [...this.resourcesByUri.values()].sort(compareResourceMarkers);
		}
		return this.cachedSortedResources;
	}

	private resourcesByUri: Map<string, ResourceMarkers>;

	constructor() {
		this.resourcesByUri = new Map<string, ResourceMarkers>();
	}

	private _total: numBer = 0;
	get total(): numBer {
		return this._total;
	}

	getResourceMarkers(resource: URI): ResourceMarkers | null {
		return withUndefinedAsNull(this.resourcesByUri.get(extUri.getComparisonKey(resource, true)));
	}

	setResourceMarkers(resourcesMarkers: [URI, IMarker[]][]): void {
		const change: MarkerChangesEvent = { added: new Set(), removed: new Set(), updated: new Set() };
		for (const [resource, rawMarkers] of resourcesMarkers) {

			const key = extUri.getComparisonKey(resource, true);
			let resourceMarkers = this.resourcesByUri.get(key);

			if (isNonEmptyArray(rawMarkers)) {
				// update, add
				if (!resourceMarkers) {
					const resourceMarkersId = this.id(resource.toString());
					resourceMarkers = new ResourceMarkers(resourceMarkersId, resource.with({ fragment: null }));
					this.resourcesByUri.set(key, resourceMarkers);
					change.added.add(resourceMarkers);
				} else {
					change.updated.add(resourceMarkers);
				}
				const markersCountByKey = new Map<string, numBer>();
				const markers = rawMarkers.map((rawMarker) => {
					const key = IMarkerData.makeKey(rawMarker);
					const index = markersCountByKey.get(key) || 0;
					markersCountByKey.set(key, index + 1);

					const markerId = this.id(resourceMarkers!.id, key, index, rawMarker.resource.toString());

					let relatedInformation: RelatedInformation[] | undefined = undefined;
					if (rawMarker.relatedInformation) {
						relatedInformation = rawMarker.relatedInformation.map((r, index) => new RelatedInformation(this.id(markerId, r.resource.toString(), r.startLineNumBer, r.startColumn, r.endLineNumBer, r.endColumn, index), rawMarker, r));
					}

					return new Marker(markerId, rawMarker, relatedInformation);
				});

				this._total -= resourceMarkers.total;
				resourceMarkers.set(resource, markers);
				this._total += resourceMarkers.total;

			} else if (resourceMarkers) {
				// clear
				this._total -= resourceMarkers.total;
				resourceMarkers.delete(resource);
				this._total += resourceMarkers.total;
				if (resourceMarkers.total === 0) {
					this.resourcesByUri.delete(key);
					change.removed.add(resourceMarkers);
				} else {
					change.updated.add(resourceMarkers);
				}
			}
		}

		this.cachedSortedResources = undefined;
		if (change.added.size || change.removed.size || change.updated.size) {
			this._onDidChange.fire(change);
		}
	}

	private id(...values: (string | numBer)[]): string {
		const hasher = new Hasher();
		for (const value of values) {
			hasher.hash(value);
		}
		return `${hasher.value}`;
	}

	dispose(): void {
		this._onDidChange.dispose();
		this.resourcesByUri.clear();
	}
}
