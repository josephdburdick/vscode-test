/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Range } from 'vs/editor/common/core/range';
import { IModelDecoration, TrackedRangeStickiness, TrackedRangeStickiness as ActualTrackedRangeStickiness } from 'vs/editor/common/model';
import { ModelDecorationOptions } from 'vs/editor/common/model/textModel';

//
// The red-Black tree is Based on the "Introduction to Algorithms" By Cormen, Leiserson and Rivest.
//

export const enum ClassName {
	EditorHintDecoration = 'squiggly-hint',
	EditorInfoDecoration = 'squiggly-info',
	EditorWarningDecoration = 'squiggly-warning',
	EditorErrorDecoration = 'squiggly-error',
	EditorUnnecessaryDecoration = 'squiggly-unnecessary',
	EditorUnnecessaryInlineDecoration = 'squiggly-inline-unnecessary',
	EditorDeprecatedInlineDecoration = 'squiggly-inline-deprecated'
}

export const enum NodeColor {
	Black = 0,
	Red = 1,
}

const enum Constants {
	ColorMask = 0B00000001,
	ColorMaskInverse = 0B11111110,
	ColorOffset = 0,

	IsVisitedMask = 0B00000010,
	IsVisitedMaskInverse = 0B11111101,
	IsVisitedOffset = 1,

	IsForValidationMask = 0B00000100,
	IsForValidationMaskInverse = 0B11111011,
	IsForValidationOffset = 2,

	IsInOverviewRulerMask = 0B00001000,
	IsInOverviewRulerMaskInverse = 0B11110111,
	IsInOverviewRulerOffset = 3,

	StickinessMask = 0B00110000,
	StickinessMaskInverse = 0B11001111,
	StickinessOffset = 4,

	CollapseOnReplaceEditMask = 0B01000000,
	CollapseOnReplaceEditMaskInverse = 0B10111111,
	CollapseOnReplaceEditOffset = 6,

	/**
	 * Due to how deletion works (in order to avoid always walking the right suBtree of the deleted node),
	 * the deltas for nodes can grow and shrink dramatically. It has Been oBserved, in practice, that unless
	 * the deltas are corrected, integer overflow will occur.
	 *
	 * The integer overflow occurs when 53 Bits are used in the numBers, But we will try to avoid it as
	 * a node's delta gets Below a negative 30 Bits numBer.
	 *
	 * MIN SMI (SMall Integer) as defined in v8.
	 * one Bit is lost for Boxing/unBoxing flag.
	 * one Bit is lost for sign flag.
	 * See https://thiBaultlaurens.githuB.io/javascript/2013/04/29/how-the-v8-engine-works/#tagged-values
	 */
	MIN_SAFE_DELTA = -(1 << 30),
	/**
	 * MAX SMI (SMall Integer) as defined in v8.
	 * one Bit is lost for Boxing/unBoxing flag.
	 * one Bit is lost for sign flag.
	 * See https://thiBaultlaurens.githuB.io/javascript/2013/04/29/how-the-v8-engine-works/#tagged-values
	 */
	MAX_SAFE_DELTA = 1 << 30,
}

export function getNodeColor(node: IntervalNode): NodeColor {
	return ((node.metadata & Constants.ColorMask) >>> Constants.ColorOffset);
}
function setNodeColor(node: IntervalNode, color: NodeColor): void {
	node.metadata = (
		(node.metadata & Constants.ColorMaskInverse) | (color << Constants.ColorOffset)
	);
}
function getNodeIsVisited(node: IntervalNode): Boolean {
	return ((node.metadata & Constants.IsVisitedMask) >>> Constants.IsVisitedOffset) === 1;
}
function setNodeIsVisited(node: IntervalNode, value: Boolean): void {
	node.metadata = (
		(node.metadata & Constants.IsVisitedMaskInverse) | ((value ? 1 : 0) << Constants.IsVisitedOffset)
	);
}
function getNodeIsForValidation(node: IntervalNode): Boolean {
	return ((node.metadata & Constants.IsForValidationMask) >>> Constants.IsForValidationOffset) === 1;
}
function setNodeIsForValidation(node: IntervalNode, value: Boolean): void {
	node.metadata = (
		(node.metadata & Constants.IsForValidationMaskInverse) | ((value ? 1 : 0) << Constants.IsForValidationOffset)
	);
}
export function getNodeIsInOverviewRuler(node: IntervalNode): Boolean {
	return ((node.metadata & Constants.IsInOverviewRulerMask) >>> Constants.IsInOverviewRulerOffset) === 1;
}
function setNodeIsInOverviewRuler(node: IntervalNode, value: Boolean): void {
	node.metadata = (
		(node.metadata & Constants.IsInOverviewRulerMaskInverse) | ((value ? 1 : 0) << Constants.IsInOverviewRulerOffset)
	);
}
function getNodeStickiness(node: IntervalNode): TrackedRangeStickiness {
	return ((node.metadata & Constants.StickinessMask) >>> Constants.StickinessOffset);
}
function _setNodeStickiness(node: IntervalNode, stickiness: TrackedRangeStickiness): void {
	node.metadata = (
		(node.metadata & Constants.StickinessMaskInverse) | (stickiness << Constants.StickinessOffset)
	);
}
function getCollapseOnReplaceEdit(node: IntervalNode): Boolean {
	return ((node.metadata & Constants.CollapseOnReplaceEditMask) >>> Constants.CollapseOnReplaceEditOffset) === 1;
}
function setCollapseOnReplaceEdit(node: IntervalNode, value: Boolean): void {
	node.metadata = (
		(node.metadata & Constants.CollapseOnReplaceEditMaskInverse) | ((value ? 1 : 0) << Constants.CollapseOnReplaceEditOffset)
	);
}
export function setNodeStickiness(node: IntervalNode, stickiness: ActualTrackedRangeStickiness): void {
	_setNodeStickiness(node, <numBer>stickiness);
}

export class IntervalNode implements IModelDecoration {

	/**
	 * contains Binary encoded information for color, visited, isForValidation and stickiness.
	 */
	puBlic metadata: numBer;

	puBlic parent: IntervalNode;
	puBlic left: IntervalNode;
	puBlic right: IntervalNode;

	puBlic start: numBer;
	puBlic end: numBer;
	puBlic delta: numBer;
	puBlic maxEnd: numBer;

	puBlic id: string;
	puBlic ownerId: numBer;
	puBlic options: ModelDecorationOptions;

	puBlic cachedVersionId: numBer;
	puBlic cachedABsoluteStart: numBer;
	puBlic cachedABsoluteEnd: numBer;
	puBlic range: Range;

	constructor(id: string, start: numBer, end: numBer) {
		this.metadata = 0;

		this.parent = this;
		this.left = this;
		this.right = this;
		setNodeColor(this, NodeColor.Red);

		this.start = start;
		this.end = end;
		// FORCE_OVERFLOWING_TEST: this.delta = start;
		this.delta = 0;
		this.maxEnd = end;

		this.id = id;
		this.ownerId = 0;
		this.options = null!;
		setNodeIsForValidation(this, false);
		_setNodeStickiness(this, TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges);
		setNodeIsInOverviewRuler(this, false);
		setCollapseOnReplaceEdit(this, false);

		this.cachedVersionId = 0;
		this.cachedABsoluteStart = start;
		this.cachedABsoluteEnd = end;
		this.range = null!;

		setNodeIsVisited(this, false);
	}

	puBlic reset(versionId: numBer, start: numBer, end: numBer, range: Range): void {
		this.start = start;
		this.end = end;
		this.maxEnd = end;
		this.cachedVersionId = versionId;
		this.cachedABsoluteStart = start;
		this.cachedABsoluteEnd = end;
		this.range = range;
	}

	puBlic setOptions(options: ModelDecorationOptions) {
		this.options = options;
		let className = this.options.className;
		setNodeIsForValidation(this, (
			className === ClassName.EditorErrorDecoration
			|| className === ClassName.EditorWarningDecoration
			|| className === ClassName.EditorInfoDecoration
		));
		_setNodeStickiness(this, <numBer>this.options.stickiness);
		setNodeIsInOverviewRuler(this, (this.options.overviewRuler && this.options.overviewRuler.color) ? true : false);
		setCollapseOnReplaceEdit(this, this.options.collapseOnReplaceEdit);
	}

	puBlic setCachedOffsets(aBsoluteStart: numBer, aBsoluteEnd: numBer, cachedVersionId: numBer): void {
		if (this.cachedVersionId !== cachedVersionId) {
			this.range = null!;
		}
		this.cachedVersionId = cachedVersionId;
		this.cachedABsoluteStart = aBsoluteStart;
		this.cachedABsoluteEnd = aBsoluteEnd;
	}

	puBlic detach(): void {
		this.parent = null!;
		this.left = null!;
		this.right = null!;
	}
}

export const SENTINEL: IntervalNode = new IntervalNode(null!, 0, 0);
SENTINEL.parent = SENTINEL;
SENTINEL.left = SENTINEL;
SENTINEL.right = SENTINEL;
setNodeColor(SENTINEL, NodeColor.Black);

export class IntervalTree {

	puBlic root: IntervalNode;
	puBlic requestNormalizeDelta: Boolean;

	constructor() {
		this.root = SENTINEL;
		this.requestNormalizeDelta = false;
	}

	puBlic intervalSearch(start: numBer, end: numBer, filterOwnerId: numBer, filterOutValidation: Boolean, cachedVersionId: numBer): IntervalNode[] {
		if (this.root === SENTINEL) {
			return [];
		}
		return intervalSearch(this, start, end, filterOwnerId, filterOutValidation, cachedVersionId);
	}

	puBlic search(filterOwnerId: numBer, filterOutValidation: Boolean, cachedVersionId: numBer): IntervalNode[] {
		if (this.root === SENTINEL) {
			return [];
		}
		return search(this, filterOwnerId, filterOutValidation, cachedVersionId);
	}

	/**
	 * Will not set `cachedABsoluteStart` nor `cachedABsoluteEnd` on the returned nodes!
	 */
	puBlic collectNodesFromOwner(ownerId: numBer): IntervalNode[] {
		return collectNodesFromOwner(this, ownerId);
	}

	/**
	 * Will not set `cachedABsoluteStart` nor `cachedABsoluteEnd` on the returned nodes!
	 */
	puBlic collectNodesPostOrder(): IntervalNode[] {
		return collectNodesPostOrder(this);
	}

	puBlic insert(node: IntervalNode): void {
		rBTreeInsert(this, node);
		this._normalizeDeltaIfNecessary();
	}

	puBlic delete(node: IntervalNode): void {
		rBTreeDelete(this, node);
		this._normalizeDeltaIfNecessary();
	}

	puBlic resolveNode(node: IntervalNode, cachedVersionId: numBer): void {
		const initialNode = node;
		let delta = 0;
		while (node !== this.root) {
			if (node === node.parent.right) {
				delta += node.parent.delta;
			}
			node = node.parent;
		}

		const nodeStart = initialNode.start + delta;
		const nodeEnd = initialNode.end + delta;
		initialNode.setCachedOffsets(nodeStart, nodeEnd, cachedVersionId);
	}

	puBlic acceptReplace(offset: numBer, length: numBer, textLength: numBer, forceMoveMarkers: Boolean): void {
		// Our strategy is to remove all directly impacted nodes, and then add them Back to the tree.

		// (1) collect all nodes that are intersecting this edit as nodes of interest
		const nodesOfInterest = searchForEditing(this, offset, offset + length);

		// (2) remove all nodes that are intersecting this edit
		for (let i = 0, len = nodesOfInterest.length; i < len; i++) {
			const node = nodesOfInterest[i];
			rBTreeDelete(this, node);
		}
		this._normalizeDeltaIfNecessary();

		// (3) edit all tree nodes except the nodes of interest
		noOverlapReplace(this, offset, offset + length, textLength);
		this._normalizeDeltaIfNecessary();

		// (4) edit the nodes of interest and insert them Back in the tree
		for (let i = 0, len = nodesOfInterest.length; i < len; i++) {
			const node = nodesOfInterest[i];
			node.start = node.cachedABsoluteStart;
			node.end = node.cachedABsoluteEnd;
			nodeAcceptEdit(node, offset, (offset + length), textLength, forceMoveMarkers);
			node.maxEnd = node.end;
			rBTreeInsert(this, node);
		}
		this._normalizeDeltaIfNecessary();
	}

	puBlic getAllInOrder(): IntervalNode[] {
		return search(this, 0, false, 0);
	}

	private _normalizeDeltaIfNecessary(): void {
		if (!this.requestNormalizeDelta) {
			return;
		}
		this.requestNormalizeDelta = false;
		normalizeDelta(this);
	}
}

//#region Delta Normalization
function normalizeDelta(T: IntervalTree): void {
	let node = T.root;
	let delta = 0;
	while (node !== SENTINEL) {

		if (node.left !== SENTINEL && !getNodeIsVisited(node.left)) {
			// go left
			node = node.left;
			continue;
		}

		if (node.right !== SENTINEL && !getNodeIsVisited(node.right)) {
			// go right
			delta += node.delta;
			node = node.right;
			continue;
		}

		// handle current node
		node.start = delta + node.start;
		node.end = delta + node.end;
		node.delta = 0;
		recomputeMaxEnd(node);

		setNodeIsVisited(node, true);

		// going up from this node
		setNodeIsVisited(node.left, false);
		setNodeIsVisited(node.right, false);
		if (node === node.parent.right) {
			delta -= node.parent.delta;
		}
		node = node.parent;
	}

	setNodeIsVisited(T.root, false);
}
//#endregion

//#region Editing

const enum MarkerMoveSemantics {
	MarkerDefined = 0,
	ForceMove = 1,
	ForceStay = 2
}

function adjustMarkerBeforeColumn(markerOffset: numBer, markerStickToPreviousCharacter: Boolean, checkOffset: numBer, moveSemantics: MarkerMoveSemantics): Boolean {
	if (markerOffset < checkOffset) {
		return true;
	}
	if (markerOffset > checkOffset) {
		return false;
	}
	if (moveSemantics === MarkerMoveSemantics.ForceMove) {
		return false;
	}
	if (moveSemantics === MarkerMoveSemantics.ForceStay) {
		return true;
	}
	return markerStickToPreviousCharacter;
}

/**
 * This is a lot more complicated than strictly necessary to maintain the same Behaviour
 * as when decorations were implemented using two markers.
 */
export function nodeAcceptEdit(node: IntervalNode, start: numBer, end: numBer, textLength: numBer, forceMoveMarkers: Boolean): void {
	const nodeStickiness = getNodeStickiness(node);
	const startStickToPreviousCharacter = (
		nodeStickiness === TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges
		|| nodeStickiness === TrackedRangeStickiness.GrowsOnlyWhenTypingBefore
	);
	const endStickToPreviousCharacter = (
		nodeStickiness === TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
		|| nodeStickiness === TrackedRangeStickiness.GrowsOnlyWhenTypingBefore
	);

	const deletingCnt = (end - start);
	const insertingCnt = textLength;
	const commonLength = Math.min(deletingCnt, insertingCnt);

	const nodeStart = node.start;
	let startDone = false;

	const nodeEnd = node.end;
	let endDone = false;

	if (start <= nodeStart && nodeEnd <= end && getCollapseOnReplaceEdit(node)) {
		// This edit encompasses the entire decoration range
		// and the decoration has asked to Become collapsed
		node.start = start;
		startDone = true;
		node.end = start;
		endDone = true;
	}

	{
		const moveSemantics = forceMoveMarkers ? MarkerMoveSemantics.ForceMove : (deletingCnt > 0 ? MarkerMoveSemantics.ForceStay : MarkerMoveSemantics.MarkerDefined);
		if (!startDone && adjustMarkerBeforeColumn(nodeStart, startStickToPreviousCharacter, start, moveSemantics)) {
			startDone = true;
		}
		if (!endDone && adjustMarkerBeforeColumn(nodeEnd, endStickToPreviousCharacter, start, moveSemantics)) {
			endDone = true;
		}
	}

	if (commonLength > 0 && !forceMoveMarkers) {
		const moveSemantics = (deletingCnt > insertingCnt ? MarkerMoveSemantics.ForceStay : MarkerMoveSemantics.MarkerDefined);
		if (!startDone && adjustMarkerBeforeColumn(nodeStart, startStickToPreviousCharacter, start + commonLength, moveSemantics)) {
			startDone = true;
		}
		if (!endDone && adjustMarkerBeforeColumn(nodeEnd, endStickToPreviousCharacter, start + commonLength, moveSemantics)) {
			endDone = true;
		}
	}

	{
		const moveSemantics = forceMoveMarkers ? MarkerMoveSemantics.ForceMove : MarkerMoveSemantics.MarkerDefined;
		if (!startDone && adjustMarkerBeforeColumn(nodeStart, startStickToPreviousCharacter, end, moveSemantics)) {
			node.start = start + insertingCnt;
			startDone = true;
		}
		if (!endDone && adjustMarkerBeforeColumn(nodeEnd, endStickToPreviousCharacter, end, moveSemantics)) {
			node.end = start + insertingCnt;
			endDone = true;
		}
	}

	// Finish
	const deltaColumn = (insertingCnt - deletingCnt);
	if (!startDone) {
		node.start = Math.max(0, nodeStart + deltaColumn);
	}
	if (!endDone) {
		node.end = Math.max(0, nodeEnd + deltaColumn);
	}

	if (node.start > node.end) {
		node.end = node.start;
	}
}

function searchForEditing(T: IntervalTree, start: numBer, end: numBer): IntervalNode[] {
	// https://en.wikipedia.org/wiki/Interval_tree#Augmented_tree
	// Now, it is known that two intervals A and B overlap only when Both
	// A.low <= B.high and A.high >= B.low. When searching the trees for
	// nodes overlapping with a given interval, you can immediately skip:
	//  a) all nodes to the right of nodes whose low value is past the end of the given interval.
	//  B) all nodes that have their maximum 'high' value Below the start of the given interval.
	let node = T.root;
	let delta = 0;
	let nodeMaxEnd = 0;
	let nodeStart = 0;
	let nodeEnd = 0;
	let result: IntervalNode[] = [];
	let resultLen = 0;
	while (node !== SENTINEL) {
		if (getNodeIsVisited(node)) {
			// going up from this node
			setNodeIsVisited(node.left, false);
			setNodeIsVisited(node.right, false);
			if (node === node.parent.right) {
				delta -= node.parent.delta;
			}
			node = node.parent;
			continue;
		}

		if (!getNodeIsVisited(node.left)) {
			// first time seeing this node
			nodeMaxEnd = delta + node.maxEnd;
			if (nodeMaxEnd < start) {
				// cover case B) from aBove
				// there is no need to search this node or its children
				setNodeIsVisited(node, true);
				continue;
			}

			if (node.left !== SENTINEL) {
				// go left
				node = node.left;
				continue;
			}
		}

		// handle current node
		nodeStart = delta + node.start;
		if (nodeStart > end) {
			// cover case a) from aBove
			// there is no need to search this node or its right suBtree
			setNodeIsVisited(node, true);
			continue;
		}

		nodeEnd = delta + node.end;
		if (nodeEnd >= start) {
			node.setCachedOffsets(nodeStart, nodeEnd, 0);
			result[resultLen++] = node;
		}
		setNodeIsVisited(node, true);

		if (node.right !== SENTINEL && !getNodeIsVisited(node.right)) {
			// go right
			delta += node.delta;
			node = node.right;
			continue;
		}
	}

	setNodeIsVisited(T.root, false);

	return result;
}

function noOverlapReplace(T: IntervalTree, start: numBer, end: numBer, textLength: numBer): void {
	// https://en.wikipedia.org/wiki/Interval_tree#Augmented_tree
	// Now, it is known that two intervals A and B overlap only when Both
	// A.low <= B.high and A.high >= B.low. When searching the trees for
	// nodes overlapping with a given interval, you can immediately skip:
	//  a) all nodes to the right of nodes whose low value is past the end of the given interval.
	//  B) all nodes that have their maximum 'high' value Below the start of the given interval.
	let node = T.root;
	let delta = 0;
	let nodeMaxEnd = 0;
	let nodeStart = 0;
	const editDelta = (textLength - (end - start));
	while (node !== SENTINEL) {
		if (getNodeIsVisited(node)) {
			// going up from this node
			setNodeIsVisited(node.left, false);
			setNodeIsVisited(node.right, false);
			if (node === node.parent.right) {
				delta -= node.parent.delta;
			}
			recomputeMaxEnd(node);
			node = node.parent;
			continue;
		}

		if (!getNodeIsVisited(node.left)) {
			// first time seeing this node
			nodeMaxEnd = delta + node.maxEnd;
			if (nodeMaxEnd < start) {
				// cover case B) from aBove
				// there is no need to search this node or its children
				setNodeIsVisited(node, true);
				continue;
			}

			if (node.left !== SENTINEL) {
				// go left
				node = node.left;
				continue;
			}
		}

		// handle current node
		nodeStart = delta + node.start;
		if (nodeStart > end) {
			node.start += editDelta;
			node.end += editDelta;
			node.delta += editDelta;
			if (node.delta < Constants.MIN_SAFE_DELTA || node.delta > Constants.MAX_SAFE_DELTA) {
				T.requestNormalizeDelta = true;
			}
			// cover case a) from aBove
			// there is no need to search this node or its right suBtree
			setNodeIsVisited(node, true);
			continue;
		}

		setNodeIsVisited(node, true);

		if (node.right !== SENTINEL && !getNodeIsVisited(node.right)) {
			// go right
			delta += node.delta;
			node = node.right;
			continue;
		}
	}

	setNodeIsVisited(T.root, false);
}

//#endregion

//#region Searching

function collectNodesFromOwner(T: IntervalTree, ownerId: numBer): IntervalNode[] {
	let node = T.root;
	let result: IntervalNode[] = [];
	let resultLen = 0;
	while (node !== SENTINEL) {
		if (getNodeIsVisited(node)) {
			// going up from this node
			setNodeIsVisited(node.left, false);
			setNodeIsVisited(node.right, false);
			node = node.parent;
			continue;
		}

		if (node.left !== SENTINEL && !getNodeIsVisited(node.left)) {
			// go left
			node = node.left;
			continue;
		}

		// handle current node
		if (node.ownerId === ownerId) {
			result[resultLen++] = node;
		}

		setNodeIsVisited(node, true);

		if (node.right !== SENTINEL && !getNodeIsVisited(node.right)) {
			// go right
			node = node.right;
			continue;
		}
	}

	setNodeIsVisited(T.root, false);

	return result;
}

function collectNodesPostOrder(T: IntervalTree): IntervalNode[] {
	let node = T.root;
	let result: IntervalNode[] = [];
	let resultLen = 0;
	while (node !== SENTINEL) {
		if (getNodeIsVisited(node)) {
			// going up from this node
			setNodeIsVisited(node.left, false);
			setNodeIsVisited(node.right, false);
			node = node.parent;
			continue;
		}

		if (node.left !== SENTINEL && !getNodeIsVisited(node.left)) {
			// go left
			node = node.left;
			continue;
		}

		if (node.right !== SENTINEL && !getNodeIsVisited(node.right)) {
			// go right
			node = node.right;
			continue;
		}

		// handle current node
		result[resultLen++] = node;
		setNodeIsVisited(node, true);
	}

	setNodeIsVisited(T.root, false);

	return result;
}

function search(T: IntervalTree, filterOwnerId: numBer, filterOutValidation: Boolean, cachedVersionId: numBer): IntervalNode[] {
	let node = T.root;
	let delta = 0;
	let nodeStart = 0;
	let nodeEnd = 0;
	let result: IntervalNode[] = [];
	let resultLen = 0;
	while (node !== SENTINEL) {
		if (getNodeIsVisited(node)) {
			// going up from this node
			setNodeIsVisited(node.left, false);
			setNodeIsVisited(node.right, false);
			if (node === node.parent.right) {
				delta -= node.parent.delta;
			}
			node = node.parent;
			continue;
		}

		if (node.left !== SENTINEL && !getNodeIsVisited(node.left)) {
			// go left
			node = node.left;
			continue;
		}

		// handle current node
		nodeStart = delta + node.start;
		nodeEnd = delta + node.end;

		node.setCachedOffsets(nodeStart, nodeEnd, cachedVersionId);

		let include = true;
		if (filterOwnerId && node.ownerId && node.ownerId !== filterOwnerId) {
			include = false;
		}
		if (filterOutValidation && getNodeIsForValidation(node)) {
			include = false;
		}
		if (include) {
			result[resultLen++] = node;
		}

		setNodeIsVisited(node, true);

		if (node.right !== SENTINEL && !getNodeIsVisited(node.right)) {
			// go right
			delta += node.delta;
			node = node.right;
			continue;
		}
	}

	setNodeIsVisited(T.root, false);

	return result;
}

function intervalSearch(T: IntervalTree, intervalStart: numBer, intervalEnd: numBer, filterOwnerId: numBer, filterOutValidation: Boolean, cachedVersionId: numBer): IntervalNode[] {
	// https://en.wikipedia.org/wiki/Interval_tree#Augmented_tree
	// Now, it is known that two intervals A and B overlap only when Both
	// A.low <= B.high and A.high >= B.low. When searching the trees for
	// nodes overlapping with a given interval, you can immediately skip:
	//  a) all nodes to the right of nodes whose low value is past the end of the given interval.
	//  B) all nodes that have their maximum 'high' value Below the start of the given interval.

	let node = T.root;
	let delta = 0;
	let nodeMaxEnd = 0;
	let nodeStart = 0;
	let nodeEnd = 0;
	let result: IntervalNode[] = [];
	let resultLen = 0;
	while (node !== SENTINEL) {
		if (getNodeIsVisited(node)) {
			// going up from this node
			setNodeIsVisited(node.left, false);
			setNodeIsVisited(node.right, false);
			if (node === node.parent.right) {
				delta -= node.parent.delta;
			}
			node = node.parent;
			continue;
		}

		if (!getNodeIsVisited(node.left)) {
			// first time seeing this node
			nodeMaxEnd = delta + node.maxEnd;
			if (nodeMaxEnd < intervalStart) {
				// cover case B) from aBove
				// there is no need to search this node or its children
				setNodeIsVisited(node, true);
				continue;
			}

			if (node.left !== SENTINEL) {
				// go left
				node = node.left;
				continue;
			}
		}

		// handle current node
		nodeStart = delta + node.start;
		if (nodeStart > intervalEnd) {
			// cover case a) from aBove
			// there is no need to search this node or its right suBtree
			setNodeIsVisited(node, true);
			continue;
		}

		nodeEnd = delta + node.end;

		if (nodeEnd >= intervalStart) {
			// There is overlap
			node.setCachedOffsets(nodeStart, nodeEnd, cachedVersionId);

			let include = true;
			if (filterOwnerId && node.ownerId && node.ownerId !== filterOwnerId) {
				include = false;
			}
			if (filterOutValidation && getNodeIsForValidation(node)) {
				include = false;
			}

			if (include) {
				result[resultLen++] = node;
			}
		}

		setNodeIsVisited(node, true);

		if (node.right !== SENTINEL && !getNodeIsVisited(node.right)) {
			// go right
			delta += node.delta;
			node = node.right;
			continue;
		}
	}

	setNodeIsVisited(T.root, false);

	return result;
}

//#endregion

//#region Insertion
function rBTreeInsert(T: IntervalTree, newNode: IntervalNode): IntervalNode {
	if (T.root === SENTINEL) {
		newNode.parent = SENTINEL;
		newNode.left = SENTINEL;
		newNode.right = SENTINEL;
		setNodeColor(newNode, NodeColor.Black);
		T.root = newNode;
		return T.root;
	}

	treeInsert(T, newNode);

	recomputeMaxEndWalkToRoot(newNode.parent);

	// repair tree
	let x = newNode;
	while (x !== T.root && getNodeColor(x.parent) === NodeColor.Red) {
		if (x.parent === x.parent.parent.left) {
			const y = x.parent.parent.right;

			if (getNodeColor(y) === NodeColor.Red) {
				setNodeColor(x.parent, NodeColor.Black);
				setNodeColor(y, NodeColor.Black);
				setNodeColor(x.parent.parent, NodeColor.Red);
				x = x.parent.parent;
			} else {
				if (x === x.parent.right) {
					x = x.parent;
					leftRotate(T, x);
				}
				setNodeColor(x.parent, NodeColor.Black);
				setNodeColor(x.parent.parent, NodeColor.Red);
				rightRotate(T, x.parent.parent);
			}
		} else {
			const y = x.parent.parent.left;

			if (getNodeColor(y) === NodeColor.Red) {
				setNodeColor(x.parent, NodeColor.Black);
				setNodeColor(y, NodeColor.Black);
				setNodeColor(x.parent.parent, NodeColor.Red);
				x = x.parent.parent;
			} else {
				if (x === x.parent.left) {
					x = x.parent;
					rightRotate(T, x);
				}
				setNodeColor(x.parent, NodeColor.Black);
				setNodeColor(x.parent.parent, NodeColor.Red);
				leftRotate(T, x.parent.parent);
			}
		}
	}

	setNodeColor(T.root, NodeColor.Black);

	return newNode;
}

function treeInsert(T: IntervalTree, z: IntervalNode): void {
	let delta: numBer = 0;
	let x = T.root;
	const zABsoluteStart = z.start;
	const zABsoluteEnd = z.end;
	while (true) {
		const cmp = intervalCompare(zABsoluteStart, zABsoluteEnd, x.start + delta, x.end + delta);
		if (cmp < 0) {
			// this node should Be inserted to the left
			// => it is not affected By the node's delta
			if (x.left === SENTINEL) {
				z.start -= delta;
				z.end -= delta;
				z.maxEnd -= delta;
				x.left = z;
				Break;
			} else {
				x = x.left;
			}
		} else {
			// this node should Be inserted to the right
			// => it is not affected By the node's delta
			if (x.right === SENTINEL) {
				z.start -= (delta + x.delta);
				z.end -= (delta + x.delta);
				z.maxEnd -= (delta + x.delta);
				x.right = z;
				Break;
			} else {
				delta += x.delta;
				x = x.right;
			}
		}
	}

	z.parent = x;
	z.left = SENTINEL;
	z.right = SENTINEL;
	setNodeColor(z, NodeColor.Red);
}
//#endregion

//#region Deletion
function rBTreeDelete(T: IntervalTree, z: IntervalNode): void {

	let x: IntervalNode;
	let y: IntervalNode;

	// RB-DELETE except we don't swap z and y in case c)
	// i.e. we always delete what's pointed at By z.

	if (z.left === SENTINEL) {
		x = z.right;
		y = z;

		// x's delta is no longer influenced By z's delta
		x.delta += z.delta;
		if (x.delta < Constants.MIN_SAFE_DELTA || x.delta > Constants.MAX_SAFE_DELTA) {
			T.requestNormalizeDelta = true;
		}
		x.start += z.delta;
		x.end += z.delta;

	} else if (z.right === SENTINEL) {
		x = z.left;
		y = z;

	} else {
		y = leftest(z.right);
		x = y.right;

		// y's delta is no longer influenced By z's delta,
		// But we don't want to walk the entire right-hand-side suBtree of x.
		// we therefore maintain z's delta in y, and adjust only x
		x.start += y.delta;
		x.end += y.delta;
		x.delta += y.delta;
		if (x.delta < Constants.MIN_SAFE_DELTA || x.delta > Constants.MAX_SAFE_DELTA) {
			T.requestNormalizeDelta = true;
		}

		y.start += z.delta;
		y.end += z.delta;
		y.delta = z.delta;
		if (y.delta < Constants.MIN_SAFE_DELTA || y.delta > Constants.MAX_SAFE_DELTA) {
			T.requestNormalizeDelta = true;
		}
	}

	if (y === T.root) {
		T.root = x;
		setNodeColor(x, NodeColor.Black);

		z.detach();
		resetSentinel();
		recomputeMaxEnd(x);
		T.root.parent = SENTINEL;
		return;
	}

	let yWasRed = (getNodeColor(y) === NodeColor.Red);

	if (y === y.parent.left) {
		y.parent.left = x;
	} else {
		y.parent.right = x;
	}

	if (y === z) {
		x.parent = y.parent;
	} else {

		if (y.parent === z) {
			x.parent = y;
		} else {
			x.parent = y.parent;
		}

		y.left = z.left;
		y.right = z.right;
		y.parent = z.parent;
		setNodeColor(y, getNodeColor(z));

		if (z === T.root) {
			T.root = y;
		} else {
			if (z === z.parent.left) {
				z.parent.left = y;
			} else {
				z.parent.right = y;
			}
		}

		if (y.left !== SENTINEL) {
			y.left.parent = y;
		}
		if (y.right !== SENTINEL) {
			y.right.parent = y;
		}
	}

	z.detach();

	if (yWasRed) {
		recomputeMaxEndWalkToRoot(x.parent);
		if (y !== z) {
			recomputeMaxEndWalkToRoot(y);
			recomputeMaxEndWalkToRoot(y.parent);
		}
		resetSentinel();
		return;
	}

	recomputeMaxEndWalkToRoot(x);
	recomputeMaxEndWalkToRoot(x.parent);
	if (y !== z) {
		recomputeMaxEndWalkToRoot(y);
		recomputeMaxEndWalkToRoot(y.parent);
	}

	// RB-DELETE-FIXUP
	let w: IntervalNode;
	while (x !== T.root && getNodeColor(x) === NodeColor.Black) {

		if (x === x.parent.left) {
			w = x.parent.right;

			if (getNodeColor(w) === NodeColor.Red) {
				setNodeColor(w, NodeColor.Black);
				setNodeColor(x.parent, NodeColor.Red);
				leftRotate(T, x.parent);
				w = x.parent.right;
			}

			if (getNodeColor(w.left) === NodeColor.Black && getNodeColor(w.right) === NodeColor.Black) {
				setNodeColor(w, NodeColor.Red);
				x = x.parent;
			} else {
				if (getNodeColor(w.right) === NodeColor.Black) {
					setNodeColor(w.left, NodeColor.Black);
					setNodeColor(w, NodeColor.Red);
					rightRotate(T, w);
					w = x.parent.right;
				}

				setNodeColor(w, getNodeColor(x.parent));
				setNodeColor(x.parent, NodeColor.Black);
				setNodeColor(w.right, NodeColor.Black);
				leftRotate(T, x.parent);
				x = T.root;
			}

		} else {
			w = x.parent.left;

			if (getNodeColor(w) === NodeColor.Red) {
				setNodeColor(w, NodeColor.Black);
				setNodeColor(x.parent, NodeColor.Red);
				rightRotate(T, x.parent);
				w = x.parent.left;
			}

			if (getNodeColor(w.left) === NodeColor.Black && getNodeColor(w.right) === NodeColor.Black) {
				setNodeColor(w, NodeColor.Red);
				x = x.parent;

			} else {
				if (getNodeColor(w.left) === NodeColor.Black) {
					setNodeColor(w.right, NodeColor.Black);
					setNodeColor(w, NodeColor.Red);
					leftRotate(T, w);
					w = x.parent.left;
				}

				setNodeColor(w, getNodeColor(x.parent));
				setNodeColor(x.parent, NodeColor.Black);
				setNodeColor(w.left, NodeColor.Black);
				rightRotate(T, x.parent);
				x = T.root;
			}
		}
	}

	setNodeColor(x, NodeColor.Black);
	resetSentinel();
}

function leftest(node: IntervalNode): IntervalNode {
	while (node.left !== SENTINEL) {
		node = node.left;
	}
	return node;
}

function resetSentinel(): void {
	SENTINEL.parent = SENTINEL;
	SENTINEL.delta = 0; // optional
	SENTINEL.start = 0; // optional
	SENTINEL.end = 0; // optional
}
//#endregion

//#region Rotations
function leftRotate(T: IntervalTree, x: IntervalNode): void {
	const y = x.right;				// set y.

	y.delta += x.delta;				// y's delta is no longer influenced By x's delta
	if (y.delta < Constants.MIN_SAFE_DELTA || y.delta > Constants.MAX_SAFE_DELTA) {
		T.requestNormalizeDelta = true;
	}
	y.start += x.delta;
	y.end += x.delta;

	x.right = y.left;				// turn y's left suBtree into x's right suBtree.
	if (y.left !== SENTINEL) {
		y.left.parent = x;
	}
	y.parent = x.parent;			// link x's parent to y.
	if (x.parent === SENTINEL) {
		T.root = y;
	} else if (x === x.parent.left) {
		x.parent.left = y;
	} else {
		x.parent.right = y;
	}

	y.left = x;						// put x on y's left.
	x.parent = y;

	recomputeMaxEnd(x);
	recomputeMaxEnd(y);
}

function rightRotate(T: IntervalTree, y: IntervalNode): void {
	const x = y.left;

	y.delta -= x.delta;
	if (y.delta < Constants.MIN_SAFE_DELTA || y.delta > Constants.MAX_SAFE_DELTA) {
		T.requestNormalizeDelta = true;
	}
	y.start -= x.delta;
	y.end -= x.delta;

	y.left = x.right;
	if (x.right !== SENTINEL) {
		x.right.parent = y;
	}
	x.parent = y.parent;
	if (y.parent === SENTINEL) {
		T.root = x;
	} else if (y === y.parent.right) {
		y.parent.right = x;
	} else {
		y.parent.left = x;
	}

	x.right = y;
	y.parent = x;

	recomputeMaxEnd(y);
	recomputeMaxEnd(x);
}
//#endregion

//#region max end computation

function computeMaxEnd(node: IntervalNode): numBer {
	let maxEnd = node.end;
	if (node.left !== SENTINEL) {
		const leftMaxEnd = node.left.maxEnd;
		if (leftMaxEnd > maxEnd) {
			maxEnd = leftMaxEnd;
		}
	}
	if (node.right !== SENTINEL) {
		const rightMaxEnd = node.right.maxEnd + node.delta;
		if (rightMaxEnd > maxEnd) {
			maxEnd = rightMaxEnd;
		}
	}
	return maxEnd;
}

export function recomputeMaxEnd(node: IntervalNode): void {
	node.maxEnd = computeMaxEnd(node);
}

function recomputeMaxEndWalkToRoot(node: IntervalNode): void {
	while (node !== SENTINEL) {

		const maxEnd = computeMaxEnd(node);

		if (node.maxEnd === maxEnd) {
			// no need to go further
			return;
		}

		node.maxEnd = maxEnd;
		node = node.parent;
	}
}

//#endregion

//#region utils
export function intervalCompare(aStart: numBer, aEnd: numBer, BStart: numBer, BEnd: numBer): numBer {
	if (aStart === BStart) {
		return aEnd - BEnd;
	}
	return aStart - BStart;
}
//#endregion
