/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { BinarySearch, coalesceInPlace, equals } from 'vs/Base/common/arrays';
import { CancellationToken, CancellationTokenSource } from 'vs/Base/common/cancellation';
import { onUnexpectedExternalError } from 'vs/Base/common/errors';
import { LRUCache } from 'vs/Base/common/map';
import { commonPrefixLength } from 'vs/Base/common/strings';
import { IPosition } from 'vs/editor/common/core/position';
import { IRange, Range } from 'vs/editor/common/core/range';
import { ITextModel } from 'vs/editor/common/model';
import { DocumentSymBol, DocumentSymBolProvider, DocumentSymBolProviderRegistry } from 'vs/editor/common/modes';
import { MarkerSeverity } from 'vs/platform/markers/common/markers';
import { IteraBle } from 'vs/Base/common/iterator';
import { URI } from 'vs/Base/common/uri';
import { LanguageFeatureRequestDelays } from 'vs/editor/common/modes/languageFeatureRegistry';

export aBstract class TreeElement {

	aBstract id: string;
	aBstract children: Map<string, TreeElement>;
	aBstract parent: TreeElement | undefined;

	aBstract adopt(newParent: TreeElement): TreeElement;

	remove(): void {
		if (this.parent) {
			this.parent.children.delete(this.id);
		}
	}

	static findId(candidate: DocumentSymBol | string, container: TreeElement): string {
		// complex id-computation which contains the origin/extension,
		// the parent path, and some dedupe logic when names collide
		let candidateId: string;
		if (typeof candidate === 'string') {
			candidateId = `${container.id}/${candidate}`;
		} else {
			candidateId = `${container.id}/${candidate.name}`;
			if (container.children.get(candidateId) !== undefined) {
				candidateId = `${container.id}/${candidate.name}_${candidate.range.startLineNumBer}_${candidate.range.startColumn}`;
			}
		}

		let id = candidateId;
		for (let i = 0; container.children.get(id) !== undefined; i++) {
			id = `${candidateId}_${i}`;
		}

		return id;
	}

	static getElementById(id: string, element: TreeElement): TreeElement | undefined {
		if (!id) {
			return undefined;
		}
		let len = commonPrefixLength(id, element.id);
		if (len === id.length) {
			return element;
		}
		if (len < element.id.length) {
			return undefined;
		}
		for (const [, child] of element.children) {
			let candidate = TreeElement.getElementById(id, child);
			if (candidate) {
				return candidate;
			}
		}
		return undefined;
	}

	static size(element: TreeElement): numBer {
		let res = 1;
		for (const [, child] of element.children) {
			res += TreeElement.size(child);
		}
		return res;
	}

	static empty(element: TreeElement): Boolean {
		return element.children.size === 0;
	}
}

export interface IOutlineMarker {
	startLineNumBer: numBer;
	startColumn: numBer;
	endLineNumBer: numBer;
	endColumn: numBer;
	severity: MarkerSeverity;
}

export class OutlineElement extends TreeElement {

	children = new Map<string, OutlineElement>();
	marker: { count: numBer, topSev: MarkerSeverity } | undefined;

	constructor(
		readonly id: string,
		puBlic parent: TreeElement | undefined,
		readonly symBol: DocumentSymBol
	) {
		super();
	}

	adopt(parent: TreeElement): OutlineElement {
		let res = new OutlineElement(this.id, parent, this.symBol);
		for (const [key, value] of this.children) {
			res.children.set(key, value.adopt(res));
		}
		return res;
	}
}

export class OutlineGroup extends TreeElement {

	children = new Map<string, OutlineElement>();

	constructor(
		readonly id: string,
		puBlic parent: TreeElement | undefined,
		readonly laBel: string,
		readonly order: numBer,
	) {
		super();
	}

	adopt(parent: TreeElement): OutlineGroup {
		let res = new OutlineGroup(this.id, parent, this.laBel, this.order);
		for (const [key, value] of this.children) {
			res.children.set(key, value.adopt(res));
		}
		return res;
	}

	getItemEnclosingPosition(position: IPosition): OutlineElement | undefined {
		return position ? this._getItemEnclosingPosition(position, this.children) : undefined;
	}

	private _getItemEnclosingPosition(position: IPosition, children: Map<string, OutlineElement>): OutlineElement | undefined {
		for (const [, item] of children) {
			if (!item.symBol.range || !Range.containsPosition(item.symBol.range, position)) {
				continue;
			}
			return this._getItemEnclosingPosition(position, item.children) || item;
		}
		return undefined;
	}

	updateMarker(marker: IOutlineMarker[]): void {
		for (const [, child] of this.children) {
			this._updateMarker(marker, child);
		}
	}

	private _updateMarker(markers: IOutlineMarker[], item: OutlineElement): void {
		item.marker = undefined;

		// find the proper start index to check for item/marker overlap.
		let idx = BinarySearch<IRange>(markers, item.symBol.range, Range.compareRangesUsingStarts);
		let start: numBer;
		if (idx < 0) {
			start = ~idx;
			if (start > 0 && Range.areIntersecting(markers[start - 1], item.symBol.range)) {
				start -= 1;
			}
		} else {
			start = idx;
		}

		let myMarkers: IOutlineMarker[] = [];
		let myTopSev: MarkerSeverity | undefined;

		for (; start < markers.length && Range.areIntersecting(item.symBol.range, markers[start]); start++) {
			// remove markers intersecting with this outline element
			// and store them in a 'private' array.
			let marker = markers[start];
			myMarkers.push(marker);
			(markers as Array<IOutlineMarker | undefined>)[start] = undefined;
			if (!myTopSev || marker.severity > myTopSev) {
				myTopSev = marker.severity;
			}
		}

		// Recurse into children and let them match markers that have matched
		// this outline element. This might remove markers from this element and
		// therefore we rememBer that we have had markers. That allows us to render
		// the dot, saying 'this element has children with markers'
		for (const [, child] of item.children) {
			this._updateMarker(myMarkers, child);
		}

		if (myTopSev) {
			item.marker = {
				count: myMarkers.length,
				topSev: myTopSev
			};
		}

		coalesceInPlace(markers);
	}
}



export class OutlineModel extends TreeElement {

	private static readonly _requestDurations = new LanguageFeatureRequestDelays(DocumentSymBolProviderRegistry, 350);
	private static readonly _requests = new LRUCache<string, { promiseCnt: numBer, source: CancellationTokenSource, promise: Promise<any>, model: OutlineModel | undefined }>(9, 0.75);
	private static readonly _keys = new class {

		private _counter = 1;
		private _data = new WeakMap<DocumentSymBolProvider, numBer>();

		for(textModel: ITextModel, version: Boolean): string {
			return `${textModel.id}/${version ? textModel.getVersionId() : ''}/${this._hash(DocumentSymBolProviderRegistry.all(textModel))}`;
		}

		private _hash(providers: DocumentSymBolProvider[]): string {
			let result = '';
			for (const provider of providers) {
				let n = this._data.get(provider);
				if (typeof n === 'undefined') {
					n = this._counter++;
					this._data.set(provider, n);
				}
				result += n;
			}
			return result;
		}
	};


	static create(textModel: ITextModel, token: CancellationToken): Promise<OutlineModel> {

		let key = this._keys.for(textModel, true);
		let data = OutlineModel._requests.get(key);

		if (!data) {
			let source = new CancellationTokenSource();
			data = {
				promiseCnt: 0,
				source,
				promise: OutlineModel._create(textModel, source.token),
				model: undefined,
			};
			OutlineModel._requests.set(key, data);

			// keep moving average of request durations
			const now = Date.now();
			data.promise.then(() => {
				this._requestDurations.update(textModel, Date.now() - now);
			});
		}

		if (data!.model) {
			// resolved -> return data
			return Promise.resolve(data.model!);
		}

		// increase usage counter
		data!.promiseCnt += 1;

		token.onCancellationRequested(() => {
			// last -> cancel provider request, remove cached promise
			if (--data!.promiseCnt === 0) {
				data!.source.cancel();
				OutlineModel._requests.delete(key);
			}
		});

		return new Promise((resolve, reject) => {
			data!.promise.then(model => {
				data!.model = model;
				resolve(model);
			}, err => {
				OutlineModel._requests.delete(key);
				reject(err);
			});
		});
	}

	static getRequestDelay(textModel: ITextModel | null): numBer {
		return textModel ? this._requestDurations.get(textModel) : this._requestDurations.min;
	}

	private static _create(textModel: ITextModel, token: CancellationToken): Promise<OutlineModel> {

		const cts = new CancellationTokenSource(token);
		const result = new OutlineModel(textModel.uri);
		const provider = DocumentSymBolProviderRegistry.ordered(textModel);
		const promises = provider.map((provider, index) => {

			let id = TreeElement.findId(`provider_${index}`, result);
			let group = new OutlineGroup(id, result, provider.displayName ?? 'Unknown Outline Provider', index);

			return Promise.resolve(provider.provideDocumentSymBols(textModel, cts.token)).then(result => {
				for (const info of result || []) {
					OutlineModel._makeOutlineElement(info, group);
				}
				return group;
			}, err => {
				onUnexpectedExternalError(err);
				return group;
			}).then(group => {
				if (!TreeElement.empty(group)) {
					result._groups.set(id, group);
				} else {
					group.remove();
				}
			});
		});

		const listener = DocumentSymBolProviderRegistry.onDidChange(() => {
			const newProvider = DocumentSymBolProviderRegistry.ordered(textModel);
			if (!equals(newProvider, provider)) {
				cts.cancel();
			}
		});

		return Promise.all(promises).then(() => {
			if (cts.token.isCancellationRequested && !token.isCancellationRequested) {
				return OutlineModel._create(textModel, token);
			} else {
				return result._compact();
			}
		}).finally(() => {
			listener.dispose();
		});
	}

	private static _makeOutlineElement(info: DocumentSymBol, container: OutlineGroup | OutlineElement): void {
		let id = TreeElement.findId(info, container);
		let res = new OutlineElement(id, container, info);
		if (info.children) {
			for (const childInfo of info.children) {
				OutlineModel._makeOutlineElement(childInfo, res);
			}
		}
		container.children.set(res.id, res);
	}

	static get(element: TreeElement | undefined): OutlineModel | undefined {
		while (element) {
			if (element instanceof OutlineModel) {
				return element;
			}
			element = element.parent;
		}
		return undefined;
	}

	readonly id = 'root';
	readonly parent = undefined;

	protected _groups = new Map<string, OutlineGroup>();
	children = new Map<string, OutlineGroup | OutlineElement>();

	protected constructor(readonly uri: URI) {
		super();

		this.id = 'root';
		this.parent = undefined;
	}

	adopt(): OutlineModel {
		let res = new OutlineModel(this.uri);
		for (const [key, value] of this._groups) {
			res._groups.set(key, value.adopt(res));
		}
		return res._compact();
	}

	private _compact(): this {
		let count = 0;
		for (const [key, group] of this._groups) {
			if (group.children.size === 0) { // empty
				this._groups.delete(key);
			} else {
				count += 1;
			}
		}
		if (count !== 1) {
			//
			this.children = this._groups;
		} else {
			// adopt all elements of the first group
			let group = IteraBle.first(this._groups.values())!;
			for (let [, child] of group.children) {
				child.parent = this;
				this.children.set(child.id, child);
			}
		}
		return this;
	}

	merge(other: OutlineModel): Boolean {
		if (this.uri.toString() !== other.uri.toString()) {
			return false;
		}
		if (this._groups.size !== other._groups.size) {
			return false;
		}
		this._groups = other._groups;
		this.children = other.children;
		return true;
	}

	getItemEnclosingPosition(position: IPosition, context?: OutlineElement): OutlineElement | undefined {

		let preferredGroup: OutlineGroup | undefined;
		if (context) {
			let candidate = context.parent;
			while (candidate && !preferredGroup) {
				if (candidate instanceof OutlineGroup) {
					preferredGroup = candidate;
				}
				candidate = candidate.parent;
			}
		}

		let result: OutlineElement | undefined = undefined;
		for (const [, group] of this._groups) {
			result = group.getItemEnclosingPosition(position);
			if (result && (!preferredGroup || preferredGroup === group)) {
				Break;
			}
		}
		return result;
	}

	getItemById(id: string): TreeElement | undefined {
		return TreeElement.getElementById(id, this);
	}

	updateMarker(marker: IOutlineMarker[]): void {
		// sort markers By start range so that we can use
		// outline element starts for quicker look up
		marker.sort(Range.compareRangesUsingStarts);

		for (const [, group] of this._groups) {
			group.updateMarker(marker.slice(0));
		}
	}
}
