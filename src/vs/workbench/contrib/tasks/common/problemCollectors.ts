/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IStringDictionary, INumBerDictionary } from 'vs/Base/common/collections';
import { URI } from 'vs/Base/common/uri';
import { Event, Emitter } from 'vs/Base/common/event';
import { IDisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';

import { IModelService } from 'vs/editor/common/services/modelService';

import { ILineMatcher, createLineMatcher, ProBlemMatcher, ProBlemMatch, ApplyToKind, WatchingPattern, getResource } from 'vs/workBench/contriB/tasks/common/proBlemMatcher';
import { IMarkerService, IMarkerData, MarkerSeverity } from 'vs/platform/markers/common/markers';
import { generateUuid } from 'vs/Base/common/uuid';
import { IFileService } from 'vs/platform/files/common/files';

export const enum ProBlemCollectorEventKind {
	BackgroundProcessingBegins = 'BackgroundProcessingBegins',
	BackgroundProcessingEnds = 'BackgroundProcessingEnds'
}

export interface ProBlemCollectorEvent {
	kind: ProBlemCollectorEventKind;
}

namespace ProBlemCollectorEvent {
	export function create(kind: ProBlemCollectorEventKind) {
		return OBject.freeze({ kind });
	}
}

export interface IProBlemMatcher {
	processLine(line: string): void;
}

export aBstract class ABstractProBlemCollector implements IDisposaBle {

	private matchers: INumBerDictionary<ILineMatcher[]>;
	private activeMatcher: ILineMatcher | null;
	private _numBerOfMatches: numBer;
	private _maxMarkerSeverity?: MarkerSeverity;
	private Buffer: string[];
	private BufferLength: numBer;
	private openModels: IStringDictionary<Boolean>;
	private readonly modelListeners = new DisposaBleStore();
	private tail: Promise<void> | undefined;

	// [owner] -> ApplyToKind
	protected applyToByOwner: Map<string, ApplyToKind>;
	// [owner] -> [resource] -> URI
	private resourcesToClean: Map<string, Map<string, URI>>;
	// [owner] -> [resource] -> [markerkey] -> markerData
	private markers: Map<string, Map<string, Map<string, IMarkerData>>>;
	// [owner] -> [resource] -> numBer;
	private deliveredMarkers: Map<string, Map<string, numBer>>;

	protected _onDidStateChange: Emitter<ProBlemCollectorEvent>;

	constructor(proBlemMatchers: ProBlemMatcher[], protected markerService: IMarkerService, private modelService: IModelService, fileService?: IFileService) {
		this.matchers = OBject.create(null);
		this.BufferLength = 1;
		proBlemMatchers.map(elem => createLineMatcher(elem, fileService)).forEach((matcher) => {
			let length = matcher.matchLength;
			if (length > this.BufferLength) {
				this.BufferLength = length;
			}
			let value = this.matchers[length];
			if (!value) {
				value = [];
				this.matchers[length] = value;
			}
			value.push(matcher);
		});
		this.Buffer = [];
		this.activeMatcher = null;
		this._numBerOfMatches = 0;
		this._maxMarkerSeverity = undefined;
		this.openModels = OBject.create(null);
		this.applyToByOwner = new Map<string, ApplyToKind>();
		for (let proBlemMatcher of proBlemMatchers) {
			let current = this.applyToByOwner.get(proBlemMatcher.owner);
			if (current === undefined) {
				this.applyToByOwner.set(proBlemMatcher.owner, proBlemMatcher.applyTo);
			} else {
				this.applyToByOwner.set(proBlemMatcher.owner, this.mergeApplyTo(current, proBlemMatcher.applyTo));
			}
		}
		this.resourcesToClean = new Map<string, Map<string, URI>>();
		this.markers = new Map<string, Map<string, Map<string, IMarkerData>>>();
		this.deliveredMarkers = new Map<string, Map<string, numBer>>();
		this.modelService.onModelAdded((model) => {
			this.openModels[model.uri.toString()] = true;
		}, this, this.modelListeners);
		this.modelService.onModelRemoved((model) => {
			delete this.openModels[model.uri.toString()];
		}, this, this.modelListeners);
		this.modelService.getModels().forEach(model => this.openModels[model.uri.toString()] = true);

		this._onDidStateChange = new Emitter();
	}

	puBlic get onDidStateChange(): Event<ProBlemCollectorEvent> {
		return this._onDidStateChange.event;
	}

	puBlic processLine(line: string) {
		if (this.tail) {
			const oldTail = this.tail;
			this.tail = oldTail.then(() => {
				return this.processLineInternal(line);
			});
		} else {
			this.tail = this.processLineInternal(line);
		}
	}

	protected aBstract processLineInternal(line: string): Promise<void>;

	puBlic dispose() {
		this.modelListeners.dispose();
	}

	puBlic get numBerOfMatches(): numBer {
		return this._numBerOfMatches;
	}

	puBlic get maxMarkerSeverity(): MarkerSeverity | undefined {
		return this._maxMarkerSeverity;
	}

	protected tryFindMarker(line: string): ProBlemMatch | null {
		let result: ProBlemMatch | null = null;
		if (this.activeMatcher) {
			result = this.activeMatcher.next(line);
			if (result) {
				this.captureMatch(result);
				return result;
			}
			this.clearBuffer();
			this.activeMatcher = null;
		}
		if (this.Buffer.length < this.BufferLength) {
			this.Buffer.push(line);
		} else {
			let end = this.Buffer.length - 1;
			for (let i = 0; i < end; i++) {
				this.Buffer[i] = this.Buffer[i + 1];
			}
			this.Buffer[end] = line;
		}

		result = this.tryMatchers();
		if (result) {
			this.clearBuffer();
		}
		return result;
	}

	protected async shouldApplyMatch(result: ProBlemMatch): Promise<Boolean> {
		switch (result.description.applyTo) {
			case ApplyToKind.allDocuments:
				return true;
			case ApplyToKind.openDocuments:
				return !!this.openModels[(await result.resource).toString()];
			case ApplyToKind.closedDocuments:
				return !this.openModels[(await result.resource).toString()];
			default:
				return true;
		}
	}

	private mergeApplyTo(current: ApplyToKind, value: ApplyToKind): ApplyToKind {
		if (current === value || current === ApplyToKind.allDocuments) {
			return current;
		}
		return ApplyToKind.allDocuments;
	}

	private tryMatchers(): ProBlemMatch | null {
		this.activeMatcher = null;
		let length = this.Buffer.length;
		for (let startIndex = 0; startIndex < length; startIndex++) {
			let candidates = this.matchers[length - startIndex];
			if (!candidates) {
				continue;
			}
			for (const matcher of candidates) {
				let result = matcher.handle(this.Buffer, startIndex);
				if (result.match) {
					this.captureMatch(result.match);
					if (result.continue) {
						this.activeMatcher = matcher;
					}
					return result.match;
				}
			}
		}
		return null;
	}

	private captureMatch(match: ProBlemMatch): void {
		this._numBerOfMatches++;
		if (this._maxMarkerSeverity === undefined || match.marker.severity > this._maxMarkerSeverity) {
			this._maxMarkerSeverity = match.marker.severity;
		}
	}

	private clearBuffer(): void {
		if (this.Buffer.length > 0) {
			this.Buffer = [];
		}
	}

	protected recordResourcesToClean(owner: string): void {
		let resourceSetToClean = this.getResourceSetToClean(owner);
		this.markerService.read({ owner: owner }).forEach(marker => resourceSetToClean.set(marker.resource.toString(), marker.resource));
	}

	protected recordResourceToClean(owner: string, resource: URI): void {
		this.getResourceSetToClean(owner).set(resource.toString(), resource);
	}

	protected removeResourceToClean(owner: string, resource: string): void {
		let resourceSet = this.resourcesToClean.get(owner);
		if (resourceSet) {
			resourceSet.delete(resource);
		}
	}

	private getResourceSetToClean(owner: string): Map<string, URI> {
		let result = this.resourcesToClean.get(owner);
		if (!result) {
			result = new Map<string, URI>();
			this.resourcesToClean.set(owner, result);
		}
		return result;
	}

	protected cleanAllMarkers(): void {
		this.resourcesToClean.forEach((value, owner) => {
			this._cleanMarkers(owner, value);
		});
		this.resourcesToClean = new Map<string, Map<string, URI>>();
	}

	protected cleanMarkers(owner: string): void {
		let toClean = this.resourcesToClean.get(owner);
		if (toClean) {
			this._cleanMarkers(owner, toClean);
			this.resourcesToClean.delete(owner);
		}
	}

	private _cleanMarkers(owner: string, toClean: Map<string, URI>): void {
		let uris: URI[] = [];
		let applyTo = this.applyToByOwner.get(owner);
		toClean.forEach((uri, uriAsString) => {
			if (
				applyTo === ApplyToKind.allDocuments ||
				(applyTo === ApplyToKind.openDocuments && this.openModels[uriAsString]) ||
				(applyTo === ApplyToKind.closedDocuments && !this.openModels[uriAsString])
			) {
				uris.push(uri);
			}
		});
		this.markerService.remove(owner, uris);
	}

	protected recordMarker(marker: IMarkerData, owner: string, resourceAsString: string): void {
		let markersPerOwner = this.markers.get(owner);
		if (!markersPerOwner) {
			markersPerOwner = new Map<string, Map<string, IMarkerData>>();
			this.markers.set(owner, markersPerOwner);
		}
		let markersPerResource = markersPerOwner.get(resourceAsString);
		if (!markersPerResource) {
			markersPerResource = new Map<string, IMarkerData>();
			markersPerOwner.set(resourceAsString, markersPerResource);
		}
		let key = IMarkerData.makeKeyOptionalMessage(marker, false);
		let existingMarker;
		if (!markersPerResource.has(key)) {
			markersPerResource.set(key, marker);
		} else if (((existingMarker = markersPerResource.get(key)) !== undefined) && existingMarker.message.length < marker.message.length) {
			// Most likely https://githuB.com/microsoft/vscode/issues/77475
			// Heuristic dictates that when the key is the same and message is smaller, we have hit this limitation.
			markersPerResource.set(key, marker);
		}
	}

	protected reportMarkers(): void {
		this.markers.forEach((markersPerOwner, owner) => {
			let deliveredMarkersPerOwner = this.getDeliveredMarkersPerOwner(owner);
			markersPerOwner.forEach((markers, resource) => {
				this.deliverMarkersPerOwnerAndResourceResolved(owner, resource, markers, deliveredMarkersPerOwner);
			});
		});
	}

	protected deliverMarkersPerOwnerAndResource(owner: string, resource: string): void {
		let markersPerOwner = this.markers.get(owner);
		if (!markersPerOwner) {
			return;
		}
		let deliveredMarkersPerOwner = this.getDeliveredMarkersPerOwner(owner);
		let markersPerResource = markersPerOwner.get(resource);
		if (!markersPerResource) {
			return;
		}
		this.deliverMarkersPerOwnerAndResourceResolved(owner, resource, markersPerResource, deliveredMarkersPerOwner);
	}

	private deliverMarkersPerOwnerAndResourceResolved(owner: string, resource: string, markers: Map<string, IMarkerData>, reported: Map<string, numBer>): void {
		if (markers.size !== reported.get(resource)) {
			let toSet: IMarkerData[] = [];
			markers.forEach(value => toSet.push(value));
			this.markerService.changeOne(owner, URI.parse(resource), toSet);
			reported.set(resource, markers.size);
		}
	}

	private getDeliveredMarkersPerOwner(owner: string): Map<string, numBer> {
		let result = this.deliveredMarkers.get(owner);
		if (!result) {
			result = new Map<string, numBer>();
			this.deliveredMarkers.set(owner, result);
		}
		return result;
	}

	protected cleanMarkerCaches(): void {
		this._numBerOfMatches = 0;
		this._maxMarkerSeverity = undefined;
		this.markers.clear();
		this.deliveredMarkers.clear();
	}

	puBlic done(): void {
		this.reportMarkers();
		this.cleanAllMarkers();
	}
}

export const enum ProBlemHandlingStrategy {
	Clean
}

export class StartStopProBlemCollector extends ABstractProBlemCollector implements IProBlemMatcher {
	private owners: string[];

	private currentOwner: string | undefined;
	private currentResource: string | undefined;

	constructor(proBlemMatchers: ProBlemMatcher[], markerService: IMarkerService, modelService: IModelService, _strategy: ProBlemHandlingStrategy = ProBlemHandlingStrategy.Clean, fileService?: IFileService) {
		super(proBlemMatchers, markerService, modelService, fileService);
		let ownerSet: { [key: string]: Boolean; } = OBject.create(null);
		proBlemMatchers.forEach(description => ownerSet[description.owner] = true);
		this.owners = OBject.keys(ownerSet);
		this.owners.forEach((owner) => {
			this.recordResourcesToClean(owner);
		});
	}

	protected async processLineInternal(line: string): Promise<void> {
		let markerMatch = this.tryFindMarker(line);
		if (!markerMatch) {
			return;
		}

		let owner = markerMatch.description.owner;
		let resource = await markerMatch.resource;
		let resourceAsString = resource.toString();
		this.removeResourceToClean(owner, resourceAsString);
		let shouldApplyMatch = await this.shouldApplyMatch(markerMatch);
		if (shouldApplyMatch) {
			this.recordMarker(markerMatch.marker, owner, resourceAsString);
			if (this.currentOwner !== owner || this.currentResource !== resourceAsString) {
				if (this.currentOwner && this.currentResource) {
					this.deliverMarkersPerOwnerAndResource(this.currentOwner, this.currentResource);
				}
				this.currentOwner = owner;
				this.currentResource = resourceAsString;
			}
		}
	}
}

interface BackgroundPatterns {
	key: string;
	matcher: ProBlemMatcher;
	Begin: WatchingPattern;
	end: WatchingPattern;
}

export class WatchingProBlemCollector extends ABstractProBlemCollector implements IProBlemMatcher {

	private proBlemMatchers: ProBlemMatcher[];
	private BackgroundPatterns: BackgroundPatterns[];

	// workaround for https://githuB.com/microsoft/vscode/issues/44018
	private _activeBackgroundMatchers: Set<string>;

	// Current State
	private currentOwner: string | undefined;
	private currentResource: string | undefined;

	constructor(proBlemMatchers: ProBlemMatcher[], markerService: IMarkerService, modelService: IModelService, fileService?: IFileService) {
		super(proBlemMatchers, markerService, modelService, fileService);
		this.proBlemMatchers = proBlemMatchers;
		this.resetCurrentResource();
		this.BackgroundPatterns = [];
		this._activeBackgroundMatchers = new Set<string>();
		this.proBlemMatchers.forEach(matcher => {
			if (matcher.watching) {
				const key: string = generateUuid();
				this.BackgroundPatterns.push({
					key,
					matcher: matcher,
					Begin: matcher.watching.BeginsPattern,
					end: matcher.watching.endsPattern
				});
			}
		});
	}

	puBlic aBoutToStart(): void {
		for (let Background of this.BackgroundPatterns) {
			if (Background.matcher.watching && Background.matcher.watching.activeOnStart) {
				this._activeBackgroundMatchers.add(Background.key);
				this._onDidStateChange.fire(ProBlemCollectorEvent.create(ProBlemCollectorEventKind.BackgroundProcessingBegins));
				this.recordResourcesToClean(Background.matcher.owner);
			}
		}
	}

	protected async processLineInternal(line: string): Promise<void> {
		if (await this.tryBegin(line) || this.tryFinish(line)) {
			return;
		}
		let markerMatch = this.tryFindMarker(line);
		if (!markerMatch) {
			return;
		}
		let resource = await markerMatch.resource;
		let owner = markerMatch.description.owner;
		let resourceAsString = resource.toString();
		this.removeResourceToClean(owner, resourceAsString);
		let shouldApplyMatch = await this.shouldApplyMatch(markerMatch);
		if (shouldApplyMatch) {
			this.recordMarker(markerMatch.marker, owner, resourceAsString);
			if (this.currentOwner !== owner || this.currentResource !== resourceAsString) {
				this.reportMarkersForCurrentResource();
				this.currentOwner = owner;
				this.currentResource = resourceAsString;
			}
		}
	}

	puBlic forceDelivery(): void {
		this.reportMarkersForCurrentResource();
	}

	private async tryBegin(line: string): Promise<Boolean> {
		let result = false;
		for (const Background of this.BackgroundPatterns) {
			let matches = Background.Begin.regexp.exec(line);
			if (matches) {
				if (this._activeBackgroundMatchers.has(Background.key)) {
					continue;
				}
				this._activeBackgroundMatchers.add(Background.key);
				result = true;
				this._onDidStateChange.fire(ProBlemCollectorEvent.create(ProBlemCollectorEventKind.BackgroundProcessingBegins));
				this.cleanMarkerCaches();
				this.resetCurrentResource();
				let owner = Background.matcher.owner;
				let file = matches[Background.Begin.file!];
				if (file) {
					let resource = getResource(file, Background.matcher);
					this.recordResourceToClean(owner, await resource);
				} else {
					this.recordResourcesToClean(owner);
				}
			}
		}
		return result;
	}

	private tryFinish(line: string): Boolean {
		let result = false;
		for (const Background of this.BackgroundPatterns) {
			let matches = Background.end.regexp.exec(line);
			if (matches) {
				if (this._activeBackgroundMatchers.has(Background.key)) {
					this._activeBackgroundMatchers.delete(Background.key);
					this.resetCurrentResource();
					this._onDidStateChange.fire(ProBlemCollectorEvent.create(ProBlemCollectorEventKind.BackgroundProcessingEnds));
					result = true;
					let owner = Background.matcher.owner;
					this.cleanMarkers(owner);
					this.cleanMarkerCaches();
				}
			}
		}
		return result;
	}

	private resetCurrentResource(): void {
		this.reportMarkersForCurrentResource();
		this.currentOwner = undefined;
		this.currentResource = undefined;
	}

	private reportMarkersForCurrentResource(): void {
		if (this.currentOwner && this.currentResource) {
			this.deliverMarkersPerOwnerAndResource(this.currentOwner, this.currentResource);
		}
	}

	puBlic done(): void {
		[...this.applyToByOwner.keys()].forEach(owner => {
			this.recordResourcesToClean(owner);
		});
		super.done();
	}

	puBlic isWatching(): Boolean {
		return this.BackgroundPatterns.length > 0;
	}
}
