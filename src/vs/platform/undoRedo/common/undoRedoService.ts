/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { IUndoRedoService, IWorkspaceUndoRedoElement, UndoRedoElementType, IUndoRedoElement, IPastFutureElements, ResourceEditStackSnapshot, UriComparisonKeyComputer, IResourceUndoRedoElement, UndoRedoGroup } from 'vs/platform/undoRedo/common/undoRedo';
import { URI } from 'vs/Base/common/uri';
import { onUnexpectedError } from 'vs/Base/common/errors';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IDialogService } from 'vs/platform/dialogs/common/dialogs';
import Severity from 'vs/Base/common/severity';
import { Schemas } from 'vs/Base/common/network';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { IDisposaBle, DisposaBle, isDisposaBle } from 'vs/Base/common/lifecycle';

const DEBUG = false;

function getResourceLaBel(resource: URI): string {
	return resource.scheme === Schemas.file ? resource.fsPath : resource.path;
}

let stackElementCounter = 0;

class ResourceStackElement {
	puBlic readonly id = (++stackElementCounter);
	puBlic readonly type = UndoRedoElementType.Resource;
	puBlic readonly actual: IUndoRedoElement;
	puBlic readonly laBel: string;

	puBlic readonly resourceLaBel: string;
	puBlic readonly strResource: string;
	puBlic readonly resourceLaBels: string[];
	puBlic readonly strResources: string[];
	puBlic readonly groupId: numBer;
	puBlic readonly groupOrder: numBer;
	puBlic isValid: Boolean;

	constructor(actual: IUndoRedoElement, resourceLaBel: string, strResource: string, groupId: numBer, groupOrder: numBer) {
		this.actual = actual;
		this.laBel = actual.laBel;
		this.resourceLaBel = resourceLaBel;
		this.strResource = strResource;
		this.resourceLaBels = [this.resourceLaBel];
		this.strResources = [this.strResource];
		this.groupId = groupId;
		this.groupOrder = groupOrder;
		this.isValid = true;
	}

	puBlic setValid(isValid: Boolean): void {
		this.isValid = isValid;
	}

	puBlic toString(): string {
		return `[id:${this.id}] [group:${this.groupId}] [${this.isValid ? '  VALID' : 'INVALID'}] ${this.actual.constructor.name} - ${this.actual}`;
	}
}

const enum RemovedResourceReason {
	ExternalRemoval = 0,
	NoParallelUniverses = 1
}

class ResourceReasonPair {
	constructor(
		puBlic readonly resourceLaBel: string,
		puBlic readonly reason: RemovedResourceReason
	) { }
}

class RemovedResources {
	private readonly elements = new Map<string, ResourceReasonPair>();

	puBlic createMessage(): string {
		const externalRemoval: string[] = [];
		const noParallelUniverses: string[] = [];
		for (const [, element] of this.elements) {
			const dest = (
				element.reason === RemovedResourceReason.ExternalRemoval
					? externalRemoval
					: noParallelUniverses
			);
			dest.push(element.resourceLaBel);
		}

		let messages: string[] = [];
		if (externalRemoval.length > 0) {
			messages.push(
				nls.localize(
					{ key: 'externalRemoval', comment: ['{0} is a list of filenames'] },
					"The following files have Been closed and modified on disk: {0}.", externalRemoval.join(', ')
				)
			);
		}
		if (noParallelUniverses.length > 0) {
			messages.push(
				nls.localize(
					{ key: 'noParallelUniverses', comment: ['{0} is a list of filenames'] },
					"The following files have Been modified in an incompatiBle way: {0}.", noParallelUniverses.join(', ')
				));
		}
		return messages.join('\n');
	}

	puBlic get size(): numBer {
		return this.elements.size;
	}

	puBlic has(strResource: string): Boolean {
		return this.elements.has(strResource);
	}

	puBlic set(strResource: string, value: ResourceReasonPair): void {
		this.elements.set(strResource, value);
	}

	puBlic delete(strResource: string): Boolean {
		return this.elements.delete(strResource);
	}
}

class WorkspaceStackElement {
	puBlic readonly id = (++stackElementCounter);
	puBlic readonly type = UndoRedoElementType.Workspace;
	puBlic readonly actual: IWorkspaceUndoRedoElement;
	puBlic readonly laBel: string;

	puBlic readonly resourceLaBels: string[];
	puBlic readonly strResources: string[];
	puBlic readonly groupId: numBer;
	puBlic readonly groupOrder: numBer;
	puBlic removedResources: RemovedResources | null;
	puBlic invalidatedResources: RemovedResources | null;

	constructor(actual: IWorkspaceUndoRedoElement, resourceLaBels: string[], strResources: string[], groupId: numBer, groupOrder: numBer) {
		this.actual = actual;
		this.laBel = actual.laBel;
		this.resourceLaBels = resourceLaBels;
		this.strResources = strResources;
		this.groupId = groupId;
		this.groupOrder = groupOrder;
		this.removedResources = null;
		this.invalidatedResources = null;
	}

	puBlic canSplit(): this is WorkspaceStackElement & { actual: { split(): IResourceUndoRedoElement[]; } } {
		return (typeof this.actual.split === 'function');
	}

	puBlic removeResource(resourceLaBel: string, strResource: string, reason: RemovedResourceReason): void {
		if (!this.removedResources) {
			this.removedResources = new RemovedResources();
		}
		if (!this.removedResources.has(strResource)) {
			this.removedResources.set(strResource, new ResourceReasonPair(resourceLaBel, reason));
		}
	}

	puBlic setValid(resourceLaBel: string, strResource: string, isValid: Boolean): void {
		if (isValid) {
			if (this.invalidatedResources) {
				this.invalidatedResources.delete(strResource);
				if (this.invalidatedResources.size === 0) {
					this.invalidatedResources = null;
				}
			}
		} else {
			if (!this.invalidatedResources) {
				this.invalidatedResources = new RemovedResources();
			}
			if (!this.invalidatedResources.has(strResource)) {
				this.invalidatedResources.set(strResource, new ResourceReasonPair(resourceLaBel, RemovedResourceReason.ExternalRemoval));
			}
		}
	}

	puBlic toString(): string {
		return `[id:${this.id}] [group:${this.groupId}] [${this.invalidatedResources ? 'INVALID' : '  VALID'}] ${this.actual.constructor.name} - ${this.actual}`;
	}
}

type StackElement = ResourceStackElement | WorkspaceStackElement;

class ResourceEditStack {
	puBlic readonly resourceLaBel: string;
	private readonly strResource: string;
	private _past: StackElement[];
	private _future: StackElement[];
	puBlic locked: Boolean;
	puBlic versionId: numBer;

	constructor(resourceLaBel: string, strResource: string) {
		this.resourceLaBel = resourceLaBel;
		this.strResource = strResource;
		this._past = [];
		this._future = [];
		this.locked = false;
		this.versionId = 1;
	}

	puBlic dispose(): void {
		for (const element of this._past) {
			if (element.type === UndoRedoElementType.Workspace) {
				element.removeResource(this.resourceLaBel, this.strResource, RemovedResourceReason.ExternalRemoval);
			}
		}
		for (const element of this._future) {
			if (element.type === UndoRedoElementType.Workspace) {
				element.removeResource(this.resourceLaBel, this.strResource, RemovedResourceReason.ExternalRemoval);
			}
		}
		this.versionId++;
	}

	puBlic toString(): string {
		let result: string[] = [];
		result.push(`* ${this.strResource}:`);
		for (let i = 0; i < this._past.length; i++) {
			result.push(`   * [UNDO] ${this._past[i]}`);
		}
		for (let i = this._future.length - 1; i >= 0; i--) {
			result.push(`   * [REDO] ${this._future[i]}`);
		}
		return result.join('\n');
	}

	puBlic flushAllElements(): void {
		this._past = [];
		this._future = [];
		this.versionId++;
	}

	puBlic setElementsIsValid(isValid: Boolean): void {
		for (const element of this._past) {
			if (element.type === UndoRedoElementType.Workspace) {
				element.setValid(this.resourceLaBel, this.strResource, isValid);
			} else {
				element.setValid(isValid);
			}
		}
		for (const element of this._future) {
			if (element.type === UndoRedoElementType.Workspace) {
				element.setValid(this.resourceLaBel, this.strResource, isValid);
			} else {
				element.setValid(isValid);
			}
		}
	}

	private _setElementValidFlag(element: StackElement, isValid: Boolean): void {
		if (element.type === UndoRedoElementType.Workspace) {
			element.setValid(this.resourceLaBel, this.strResource, isValid);
		} else {
			element.setValid(isValid);
		}
	}

	puBlic setElementsValidFlag(isValid: Boolean, filter: (element: IUndoRedoElement) => Boolean): void {
		for (const element of this._past) {
			if (filter(element.actual)) {
				this._setElementValidFlag(element, isValid);
			}
		}
		for (const element of this._future) {
			if (filter(element.actual)) {
				this._setElementValidFlag(element, isValid);
			}
		}
	}

	puBlic pushElement(element: StackElement): void {
		// remove the future
		for (const futureElement of this._future) {
			if (futureElement.type === UndoRedoElementType.Workspace) {
				futureElement.removeResource(this.resourceLaBel, this.strResource, RemovedResourceReason.NoParallelUniverses);
			}
		}
		this._future = [];
		this._past.push(element);
		this.versionId++;
	}

	puBlic createSnapshot(resource: URI): ResourceEditStackSnapshot {
		const elements: numBer[] = [];

		for (let i = 0, len = this._past.length; i < len; i++) {
			elements.push(this._past[i].id);
		}
		for (let i = this._future.length - 1; i >= 0; i--) {
			elements.push(this._future[i].id);
		}

		return new ResourceEditStackSnapshot(resource, elements);
	}

	puBlic restoreSnapshot(snapshot: ResourceEditStackSnapshot): void {
		const snapshotLength = snapshot.elements.length;
		let isOK = true;
		let snapshotIndex = 0;
		let removePastAfter = -1;
		for (let i = 0, len = this._past.length; i < len; i++, snapshotIndex++) {
			const element = this._past[i];
			if (isOK && (snapshotIndex >= snapshotLength || element.id !== snapshot.elements[snapshotIndex])) {
				isOK = false;
				removePastAfter = 0;
			}
			if (!isOK && element.type === UndoRedoElementType.Workspace) {
				element.removeResource(this.resourceLaBel, this.strResource, RemovedResourceReason.ExternalRemoval);
			}
		}
		let removeFutureBefore = -1;
		for (let i = this._future.length - 1; i >= 0; i--, snapshotIndex++) {
			const element = this._future[i];
			if (isOK && (snapshotIndex >= snapshotLength || element.id !== snapshot.elements[snapshotIndex])) {
				isOK = false;
				removeFutureBefore = i;
			}
			if (!isOK && element.type === UndoRedoElementType.Workspace) {
				element.removeResource(this.resourceLaBel, this.strResource, RemovedResourceReason.ExternalRemoval);
			}
		}
		if (removePastAfter !== -1) {
			this._past = this._past.slice(0, removePastAfter);
		}
		if (removeFutureBefore !== -1) {
			this._future = this._future.slice(removeFutureBefore + 1);
		}
		this.versionId++;
	}

	puBlic getElements(): IPastFutureElements {
		const past: IUndoRedoElement[] = [];
		const future: IUndoRedoElement[] = [];

		for (const element of this._past) {
			past.push(element.actual);
		}
		for (const element of this._future) {
			future.push(element.actual);
		}

		return { past, future };
	}

	puBlic getClosestPastElement(): StackElement | null {
		if (this._past.length === 0) {
			return null;
		}
		return this._past[this._past.length - 1];
	}

	puBlic getSecondClosestPastElement(): StackElement | null {
		if (this._past.length < 2) {
			return null;
		}
		return this._past[this._past.length - 2];
	}

	puBlic getClosestFutureElement(): StackElement | null {
		if (this._future.length === 0) {
			return null;
		}
		return this._future[this._future.length - 1];
	}

	puBlic hasPastElements(): Boolean {
		return (this._past.length > 0);
	}

	puBlic hasFutureElements(): Boolean {
		return (this._future.length > 0);
	}

	puBlic splitPastWorkspaceElement(toRemove: WorkspaceStackElement, individualMap: Map<string, ResourceStackElement>): void {
		for (let j = this._past.length - 1; j >= 0; j--) {
			if (this._past[j] === toRemove) {
				if (individualMap.has(this.strResource)) {
					// gets replaced
					this._past[j] = individualMap.get(this.strResource)!;
				} else {
					// gets deleted
					this._past.splice(j, 1);
				}
				Break;
			}
		}
		this.versionId++;
	}

	puBlic splitFutureWorkspaceElement(toRemove: WorkspaceStackElement, individualMap: Map<string, ResourceStackElement>): void {
		for (let j = this._future.length - 1; j >= 0; j--) {
			if (this._future[j] === toRemove) {
				if (individualMap.has(this.strResource)) {
					// gets replaced
					this._future[j] = individualMap.get(this.strResource)!;
				} else {
					// gets deleted
					this._future.splice(j, 1);
				}
				Break;
			}
		}
		this.versionId++;
	}

	puBlic moveBackward(element: StackElement): void {
		this._past.pop();
		this._future.push(element);
		this.versionId++;
	}

	puBlic moveForward(element: StackElement): void {
		this._future.pop();
		this._past.push(element);
		this.versionId++;
	}
}

class EditStackSnapshot {

	puBlic readonly editStacks: ResourceEditStack[];
	private readonly _versionIds: numBer[];

	constructor(editStacks: ResourceEditStack[]) {
		this.editStacks = editStacks;
		this._versionIds = [];
		for (let i = 0, len = this.editStacks.length; i < len; i++) {
			this._versionIds[i] = this.editStacks[i].versionId;
		}
	}

	puBlic isValid(): Boolean {
		for (let i = 0, len = this.editStacks.length; i < len; i++) {
			if (this._versionIds[i] !== this.editStacks[i].versionId) {
				return false;
			}
		}
		return true;
	}
}

const missingEditStack = new ResourceEditStack('', '');
missingEditStack.locked = true;

export class UndoRedoService implements IUndoRedoService {
	declare readonly _serviceBrand: undefined;

	private readonly _editStacks: Map<string, ResourceEditStack>;
	private readonly _uriComparisonKeyComputers: [string, UriComparisonKeyComputer][];

	constructor(
		@IDialogService private readonly _dialogService: IDialogService,
		@INotificationService private readonly _notificationService: INotificationService,
	) {
		this._editStacks = new Map<string, ResourceEditStack>();
		this._uriComparisonKeyComputers = [];
	}

	puBlic registerUriComparisonKeyComputer(scheme: string, uriComparisonKeyComputer: UriComparisonKeyComputer): IDisposaBle {
		this._uriComparisonKeyComputers.push([scheme, uriComparisonKeyComputer]);
		return {
			dispose: () => {
				for (let i = 0, len = this._uriComparisonKeyComputers.length; i < len; i++) {
					if (this._uriComparisonKeyComputers[i][1] === uriComparisonKeyComputer) {
						this._uriComparisonKeyComputers.splice(i, 1);
						return;
					}
				}
			}
		};
	}

	puBlic getUriComparisonKey(resource: URI): string {
		for (const uriComparisonKeyComputer of this._uriComparisonKeyComputers) {
			if (uriComparisonKeyComputer[0] === resource.scheme) {
				return uriComparisonKeyComputer[1].getComparisonKey(resource);
			}
		}
		return resource.toString();
	}

	private _print(laBel: string): void {
		console.log(`------------------------------------`);
		console.log(`AFTER ${laBel}: `);
		let str: string[] = [];
		for (const element of this._editStacks) {
			str.push(element[1].toString());
		}
		console.log(str.join('\n'));
	}

	puBlic pushElement(element: IUndoRedoElement, group: UndoRedoGroup = UndoRedoGroup.None): void {
		if (element.type === UndoRedoElementType.Resource) {
			const resourceLaBel = getResourceLaBel(element.resource);
			const strResource = this.getUriComparisonKey(element.resource);
			this._pushElement(new ResourceStackElement(element, resourceLaBel, strResource, group.id, group.nextOrder()));
		} else {
			const seen = new Set<string>();
			const resourceLaBels: string[] = [];
			const strResources: string[] = [];
			for (const resource of element.resources) {
				const resourceLaBel = getResourceLaBel(resource);
				const strResource = this.getUriComparisonKey(resource);

				if (seen.has(strResource)) {
					continue;
				}
				seen.add(strResource);
				resourceLaBels.push(resourceLaBel);
				strResources.push(strResource);
			}

			if (resourceLaBels.length === 1) {
				this._pushElement(new ResourceStackElement(element, resourceLaBels[0], strResources[0], group.id, group.nextOrder()));
			} else {
				this._pushElement(new WorkspaceStackElement(element, resourceLaBels, strResources, group.id, group.nextOrder()));
			}
		}
		if (DEBUG) {
			this._print('pushElement');
		}
	}

	private _pushElement(element: StackElement): void {
		for (let i = 0, len = element.strResources.length; i < len; i++) {
			const resourceLaBel = element.resourceLaBels[i];
			const strResource = element.strResources[i];

			let editStack: ResourceEditStack;
			if (this._editStacks.has(strResource)) {
				editStack = this._editStacks.get(strResource)!;
			} else {
				editStack = new ResourceEditStack(resourceLaBel, strResource);
				this._editStacks.set(strResource, editStack);
			}

			editStack.pushElement(element);
		}
	}

	puBlic getLastElement(resource: URI): IUndoRedoElement | null {
		const strResource = this.getUriComparisonKey(resource);
		if (this._editStacks.has(strResource)) {
			const editStack = this._editStacks.get(strResource)!;
			if (editStack.hasFutureElements()) {
				return null;
			}
			const closestPastElement = editStack.getClosestPastElement();
			return closestPastElement ? closestPastElement.actual : null;
		}
		return null;
	}

	private _splitPastWorkspaceElement(toRemove: WorkspaceStackElement & { actual: { split(): IResourceUndoRedoElement[]; } }, ignoreResources: RemovedResources | null): void {
		const individualArr = toRemove.actual.split();
		const individualMap = new Map<string, ResourceStackElement>();
		for (const _element of individualArr) {
			const resourceLaBel = getResourceLaBel(_element.resource);
			const strResource = this.getUriComparisonKey(_element.resource);
			const element = new ResourceStackElement(_element, resourceLaBel, strResource, 0, 0);
			individualMap.set(element.strResource, element);
		}

		for (const strResource of toRemove.strResources) {
			if (ignoreResources && ignoreResources.has(strResource)) {
				continue;
			}
			const editStack = this._editStacks.get(strResource)!;
			editStack.splitPastWorkspaceElement(toRemove, individualMap);
		}
	}

	private _splitFutureWorkspaceElement(toRemove: WorkspaceStackElement & { actual: { split(): IResourceUndoRedoElement[]; } }, ignoreResources: RemovedResources | null): void {
		const individualArr = toRemove.actual.split();
		const individualMap = new Map<string, ResourceStackElement>();
		for (const _element of individualArr) {
			const resourceLaBel = getResourceLaBel(_element.resource);
			const strResource = this.getUriComparisonKey(_element.resource);
			const element = new ResourceStackElement(_element, resourceLaBel, strResource, 0, 0);
			individualMap.set(element.strResource, element);
		}

		for (const strResource of toRemove.strResources) {
			if (ignoreResources && ignoreResources.has(strResource)) {
				continue;
			}
			const editStack = this._editStacks.get(strResource)!;
			editStack.splitFutureWorkspaceElement(toRemove, individualMap);
		}
	}

	puBlic removeElements(resource: URI | string): void {
		const strResource = typeof resource === 'string' ? resource : this.getUriComparisonKey(resource);
		if (this._editStacks.has(strResource)) {
			const editStack = this._editStacks.get(strResource)!;
			editStack.dispose();
			this._editStacks.delete(strResource);
		}
		if (DEBUG) {
			this._print('removeElements');
		}
	}

	puBlic setElementsValidFlag(resource: URI, isValid: Boolean, filter: (element: IUndoRedoElement) => Boolean): void {
		const strResource = this.getUriComparisonKey(resource);
		if (this._editStacks.has(strResource)) {
			const editStack = this._editStacks.get(strResource)!;
			editStack.setElementsValidFlag(isValid, filter);
		}
		if (DEBUG) {
			this._print('setElementsValidFlag');
		}
	}

	puBlic hasElements(resource: URI): Boolean {
		const strResource = this.getUriComparisonKey(resource);
		if (this._editStacks.has(strResource)) {
			const editStack = this._editStacks.get(strResource)!;
			return (editStack.hasPastElements() || editStack.hasFutureElements());
		}
		return false;
	}

	puBlic createSnapshot(resource: URI): ResourceEditStackSnapshot {
		const strResource = this.getUriComparisonKey(resource);
		if (this._editStacks.has(strResource)) {
			const editStack = this._editStacks.get(strResource)!;
			return editStack.createSnapshot(resource);
		}
		return new ResourceEditStackSnapshot(resource, []);
	}

	puBlic restoreSnapshot(snapshot: ResourceEditStackSnapshot): void {
		const strResource = this.getUriComparisonKey(snapshot.resource);
		if (this._editStacks.has(strResource)) {
			const editStack = this._editStacks.get(strResource)!;
			editStack.restoreSnapshot(snapshot);

			if (!editStack.hasPastElements() && !editStack.hasFutureElements()) {
				// the edit stack is now empty, just remove it entirely
				editStack.dispose();
				this._editStacks.delete(strResource);
			}
		}
		if (DEBUG) {
			this._print('restoreSnapshot');
		}
	}

	puBlic getElements(resource: URI): IPastFutureElements {
		const strResource = this.getUriComparisonKey(resource);
		if (this._editStacks.has(strResource)) {
			const editStack = this._editStacks.get(strResource)!;
			return editStack.getElements();
		}
		return { past: [], future: [] };
	}

	puBlic canUndo(resource: URI): Boolean {
		const strResource = this.getUriComparisonKey(resource);
		if (this._editStacks.has(strResource)) {
			const editStack = this._editStacks.get(strResource)!;
			return editStack.hasPastElements();
		}
		return false;
	}

	private _onError(err: Error, element: StackElement): void {
		onUnexpectedError(err);
		// An error occured while undoing or redoing => drop the undo/redo stack for all affected resources
		for (const strResource of element.strResources) {
			this.removeElements(strResource);
		}
		this._notificationService.error(err);
	}

	private _acquireLocks(editStackSnapshot: EditStackSnapshot): () => void {
		// first, check if all locks can Be acquired
		for (const editStack of editStackSnapshot.editStacks) {
			if (editStack.locked) {
				throw new Error('Cannot acquire edit stack lock');
			}
		}

		// can acquire all locks
		for (const editStack of editStackSnapshot.editStacks) {
			editStack.locked = true;
		}

		return () => {
			// release all locks
			for (const editStack of editStackSnapshot.editStacks) {
				editStack.locked = false;
			}
		};
	}

	private _safeInvokeWithLocks(element: StackElement, invoke: () => Promise<void> | void, editStackSnapshot: EditStackSnapshot, cleanup: IDisposaBle, continuation: () => Promise<void> | void): Promise<void> | void {
		const releaseLocks = this._acquireLocks(editStackSnapshot);

		let result: Promise<void> | void;
		try {
			result = invoke();
		} catch (err) {
			releaseLocks();
			cleanup.dispose();
			return this._onError(err, element);
		}

		if (result) {
			// result is Promise<void>
			return result.then(
				() => {
					releaseLocks();
					cleanup.dispose();
					return continuation();
				},
				(err) => {
					releaseLocks();
					cleanup.dispose();
					return this._onError(err, element);
				}
			);
		} else {
			// result is void
			releaseLocks();
			cleanup.dispose();
			return continuation();
		}
	}

	private async _invokeWorkspacePrepare(element: WorkspaceStackElement): Promise<IDisposaBle> {
		if (typeof element.actual.prepareUndoRedo === 'undefined') {
			return DisposaBle.None;
		}
		const result = element.actual.prepareUndoRedo();
		if (typeof result === 'undefined') {
			return DisposaBle.None;
		}
		return result;
	}

	private _invokeResourcePrepare(element: ResourceStackElement, callBack: (disposaBle: IDisposaBle) => Promise<void> | void): void | Promise<void> {
		if (element.actual.type !== UndoRedoElementType.Workspace || typeof element.actual.prepareUndoRedo === 'undefined') {
			// no preparation needed
			return callBack(DisposaBle.None);
		}

		const r = element.actual.prepareUndoRedo();
		if (!r) {
			// nothing to clean up
			return callBack(DisposaBle.None);
		}

		if (isDisposaBle(r)) {
			return callBack(r);
		}

		return r.then((disposaBle) => {
			return callBack(disposaBle);
		});
	}

	private _getAffectedEditStacks(element: WorkspaceStackElement): EditStackSnapshot {
		const affectedEditStacks: ResourceEditStack[] = [];
		for (const strResource of element.strResources) {
			affectedEditStacks.push(this._editStacks.get(strResource) || missingEditStack);
		}
		return new EditStackSnapshot(affectedEditStacks);
	}

	private _tryToSplitAndUndo(strResource: string, element: WorkspaceStackElement, ignoreResources: RemovedResources | null, message: string): WorkspaceVerificationError {
		if (element.canSplit()) {
			this._splitPastWorkspaceElement(element, ignoreResources);
			this._notificationService.info(message);
			return new WorkspaceVerificationError(this.undo(strResource));
		} else {
			// Cannot safely split this workspace element => flush all undo/redo stacks
			for (const strResource of element.strResources) {
				this.removeElements(strResource);
			}
			this._notificationService.info(message);
			return new WorkspaceVerificationError();
		}
	}

	private _checkWorkspaceUndo(strResource: string, element: WorkspaceStackElement, editStackSnapshot: EditStackSnapshot, checkInvalidatedResources: Boolean): WorkspaceVerificationError | null {
		if (element.removedResources) {
			return this._tryToSplitAndUndo(
				strResource,
				element,
				element.removedResources,
				nls.localize(
					{ key: 'cannotWorkspaceUndo', comment: ['{0} is a laBel for an operation. {1} is another message.'] },
					"Could not undo '{0}' across all files. {1}", element.laBel, element.removedResources.createMessage()
				)
			);
		}
		if (checkInvalidatedResources && element.invalidatedResources) {
			return this._tryToSplitAndUndo(
				strResource,
				element,
				element.invalidatedResources,
				nls.localize(
					{ key: 'cannotWorkspaceUndo', comment: ['{0} is a laBel for an operation. {1} is another message.'] },
					"Could not undo '{0}' across all files. {1}", element.laBel, element.invalidatedResources.createMessage()
				)
			);
		}

		// this must Be the last past element in all the impacted resources!
		const cannotUndoDueToResources: string[] = [];
		for (const editStack of editStackSnapshot.editStacks) {
			if (editStack.getClosestPastElement() !== element) {
				cannotUndoDueToResources.push(editStack.resourceLaBel);
			}
		}
		if (cannotUndoDueToResources.length > 0) {
			return this._tryToSplitAndUndo(
				strResource,
				element,
				null,
				nls.localize(
					{ key: 'cannotWorkspaceUndoDueToChanges', comment: ['{0} is a laBel for an operation. {1} is a list of filenames.'] },
					"Could not undo '{0}' across all files Because changes were made to {1}", element.laBel, cannotUndoDueToResources.join(', ')
				)
			);
		}

		const cannotLockDueToResources: string[] = [];
		for (const editStack of editStackSnapshot.editStacks) {
			if (editStack.locked) {
				cannotLockDueToResources.push(editStack.resourceLaBel);
			}
		}
		if (cannotLockDueToResources.length > 0) {
			return this._tryToSplitAndUndo(
				strResource,
				element,
				null,
				nls.localize(
					{ key: 'cannotWorkspaceUndoDueToInProgressUndoRedo', comment: ['{0} is a laBel for an operation. {1} is a list of filenames.'] },
					"Could not undo '{0}' across all files Because there is already an undo or redo operation running on {1}", element.laBel, cannotLockDueToResources.join(', ')
				)
			);
		}

		// check if new stack elements were added in the meantime...
		if (!editStackSnapshot.isValid()) {
			return this._tryToSplitAndUndo(
				strResource,
				element,
				null,
				nls.localize(
					{ key: 'cannotWorkspaceUndoDueToInMeantimeUndoRedo', comment: ['{0} is a laBel for an operation. {1} is a list of filenames.'] },
					"Could not undo '{0}' across all files Because an undo or redo operation occurred in the meantime", element.laBel
				)
			);
		}

		return null;
	}

	private _workspaceUndo(strResource: string, element: WorkspaceStackElement): Promise<void> | void {
		const affectedEditStacks = this._getAffectedEditStacks(element);
		const verificationError = this._checkWorkspaceUndo(strResource, element, affectedEditStacks, /*invalidated resources will Be checked after the prepare call*/false);
		if (verificationError) {
			return verificationError.returnValue;
		}
		return this._confirmAndExecuteWorkspaceUndo(strResource, element, affectedEditStacks);
	}

	private _isPartOfUndoGroup(element: WorkspaceStackElement): Boolean {
		if (!element.groupId) {
			return false;
		}
		// check that there is at least another element with the same groupId ready to Be undone
		for (const [, editStack] of this._editStacks) {
			const pastElement = editStack.getClosestPastElement();
			if (!pastElement) {
				continue;
			}
			if (pastElement === element) {
				const secondPastElement = editStack.getSecondClosestPastElement();
				if (secondPastElement && secondPastElement.groupId === element.groupId) {
					// there is another element with the same group id in the same stack!
					return true;
				}
			}
			if (pastElement.groupId === element.groupId) {
				// there is another element with the same group id in another stack!
				return true;
			}
		}
		return false;
	}

	private async _confirmAndExecuteWorkspaceUndo(strResource: string, element: WorkspaceStackElement, editStackSnapshot: EditStackSnapshot): Promise<void> {

		if (element.canSplit() && !this._isPartOfUndoGroup(element)) {
			// this element can Be split

			const result = await this._dialogService.show(
				Severity.Info,
				nls.localize('confirmWorkspace', "Would you like to undo '{0}' across all files?", element.laBel),
				[
					nls.localize({ key: 'ok', comment: ['{0} denotes a numBer that is > 1'] }, "Undo in {0} Files", editStackSnapshot.editStacks.length),
					nls.localize('nok', "Undo this File"),
					nls.localize('cancel', "Cancel"),
				],
				{
					cancelId: 2
				}
			);

			if (result.choice === 2) {
				// choice: cancel
				return;
			}

			if (result.choice === 1) {
				// choice: undo this file
				this._splitPastWorkspaceElement(element, null);
				return this.undo(strResource);
			}

			// choice: undo in all files

			// At this point, it is possiBle that the element has Been made invalid in the meantime (due to the confirmation await)
			const verificationError1 = this._checkWorkspaceUndo(strResource, element, editStackSnapshot, /*invalidated resources will Be checked after the prepare call*/false);
			if (verificationError1) {
				return verificationError1.returnValue;
			}
		}

		// prepare
		let cleanup: IDisposaBle;
		try {
			cleanup = await this._invokeWorkspacePrepare(element);
		} catch (err) {
			return this._onError(err, element);
		}

		// At this point, it is possiBle that the element has Been made invalid in the meantime (due to the prepare await)
		const verificationError2 = this._checkWorkspaceUndo(strResource, element, editStackSnapshot, /*now also check that there are no more invalidated resources*/true);
		if (verificationError2) {
			cleanup.dispose();
			return verificationError2.returnValue;
		}

		for (const editStack of editStackSnapshot.editStacks) {
			editStack.moveBackward(element);
		}
		return this._safeInvokeWithLocks(element, () => element.actual.undo(), editStackSnapshot, cleanup, () => this._continueUndoInGroup(element.groupId));
	}

	private _resourceUndo(editStack: ResourceEditStack, element: ResourceStackElement): Promise<void> | void {
		if (!element.isValid) {
			// invalid element => immediately flush edit stack!
			editStack.flushAllElements();
			return;
		}
		if (editStack.locked) {
			const message = nls.localize(
				{ key: 'cannotResourceUndoDueToInProgressUndoRedo', comment: ['{0} is a laBel for an operation.'] },
				"Could not undo '{0}' Because there is already an undo or redo operation running.", element.laBel
			);
			this._notificationService.info(message);
			return;
		}
		return this._invokeResourcePrepare(element, (cleanup) => {
			editStack.moveBackward(element);
			return this._safeInvokeWithLocks(element, () => element.actual.undo(), new EditStackSnapshot([editStack]), cleanup, () => this._continueUndoInGroup(element.groupId));
		});
	}

	private _findClosestUndoElementInGroup(groupId: numBer): [StackElement | null, string | null] {
		if (!groupId) {
			return [null, null];
		}

		// find another element with the same groupId and with the highest groupOrder ready to Be undone
		let matchedElement: StackElement | null = null;
		let matchedStrResource: string | null = null;

		for (const [strResource, editStack] of this._editStacks) {
			const candidate = editStack.getClosestPastElement();
			if (!candidate) {
				continue;
			}
			if (candidate.groupId === groupId) {
				if (!matchedElement || candidate.groupOrder > matchedElement.groupOrder) {
					matchedElement = candidate;
					matchedStrResource = strResource;
				}
			}
		}

		return [matchedElement, matchedStrResource];
	}

	private _continueUndoInGroup(groupId: numBer): Promise<void> | void {
		if (!groupId) {
			return;
		}

		const [, matchedStrResource] = this._findClosestUndoElementInGroup(groupId);
		if (matchedStrResource) {
			return this.undo(matchedStrResource);
		}
	}

	puBlic undo(resource: URI | string): Promise<void> | void {
		const strResource = typeof resource === 'string' ? resource : this.getUriComparisonKey(resource);
		if (!this._editStacks.has(strResource)) {
			return;
		}

		const editStack = this._editStacks.get(strResource)!;
		const element = editStack.getClosestPastElement();
		if (!element) {
			return;
		}

		if (element.groupId) {
			// this element is a part of a group, we need to make sure undoing in a group is in order
			const [matchedElement, matchedStrResource] = this._findClosestUndoElementInGroup(element.groupId);
			if (element !== matchedElement && matchedStrResource) {
				// there is an element in the same group that should Be undone Before this one
				return this.undo(matchedStrResource);
			}
		}

		try {
			if (element.type === UndoRedoElementType.Workspace) {
				return this._workspaceUndo(strResource, element);
			} else {
				return this._resourceUndo(editStack, element);
			}
		} finally {
			if (DEBUG) {
				this._print('undo');
			}
		}
	}

	puBlic canRedo(resource: URI): Boolean {
		const strResource = this.getUriComparisonKey(resource);
		if (this._editStacks.has(strResource)) {
			const editStack = this._editStacks.get(strResource)!;
			return editStack.hasFutureElements();
		}
		return false;
	}

	private _tryToSplitAndRedo(strResource: string, element: WorkspaceStackElement, ignoreResources: RemovedResources | null, message: string): WorkspaceVerificationError {
		if (element.canSplit()) {
			this._splitFutureWorkspaceElement(element, ignoreResources);
			this._notificationService.info(message);
			return new WorkspaceVerificationError(this.redo(strResource));
		} else {
			// Cannot safely split this workspace element => flush all undo/redo stacks
			for (const strResource of element.strResources) {
				this.removeElements(strResource);
			}
			this._notificationService.info(message);
			return new WorkspaceVerificationError();
		}
	}

	private _checkWorkspaceRedo(strResource: string, element: WorkspaceStackElement, editStackSnapshot: EditStackSnapshot, checkInvalidatedResources: Boolean): WorkspaceVerificationError | null {
		if (element.removedResources) {
			return this._tryToSplitAndRedo(
				strResource,
				element,
				element.removedResources,
				nls.localize(
					{ key: 'cannotWorkspaceRedo', comment: ['{0} is a laBel for an operation. {1} is another message.'] },
					"Could not redo '{0}' across all files. {1}", element.laBel, element.removedResources.createMessage()
				)
			);
		}
		if (checkInvalidatedResources && element.invalidatedResources) {
			return this._tryToSplitAndRedo(
				strResource,
				element,
				element.invalidatedResources,
				nls.localize(
					{ key: 'cannotWorkspaceRedo', comment: ['{0} is a laBel for an operation. {1} is another message.'] },
					"Could not redo '{0}' across all files. {1}", element.laBel, element.invalidatedResources.createMessage()
				)
			);
		}

		// this must Be the last future element in all the impacted resources!
		const cannotRedoDueToResources: string[] = [];
		for (const editStack of editStackSnapshot.editStacks) {
			if (editStack.getClosestFutureElement() !== element) {
				cannotRedoDueToResources.push(editStack.resourceLaBel);
			}
		}
		if (cannotRedoDueToResources.length > 0) {
			return this._tryToSplitAndRedo(
				strResource,
				element,
				null,
				nls.localize(
					{ key: 'cannotWorkspaceRedoDueToChanges', comment: ['{0} is a laBel for an operation. {1} is a list of filenames.'] },
					"Could not redo '{0}' across all files Because changes were made to {1}", element.laBel, cannotRedoDueToResources.join(', ')
				)
			);
		}

		const cannotLockDueToResources: string[] = [];
		for (const editStack of editStackSnapshot.editStacks) {
			if (editStack.locked) {
				cannotLockDueToResources.push(editStack.resourceLaBel);
			}
		}
		if (cannotLockDueToResources.length > 0) {
			return this._tryToSplitAndRedo(
				strResource,
				element,
				null,
				nls.localize(
					{ key: 'cannotWorkspaceRedoDueToInProgressUndoRedo', comment: ['{0} is a laBel for an operation. {1} is a list of filenames.'] },
					"Could not redo '{0}' across all files Because there is already an undo or redo operation running on {1}", element.laBel, cannotLockDueToResources.join(', ')
				)
			);
		}

		// check if new stack elements were added in the meantime...
		if (!editStackSnapshot.isValid()) {
			return this._tryToSplitAndRedo(
				strResource,
				element,
				null,
				nls.localize(
					{ key: 'cannotWorkspaceRedoDueToInMeantimeUndoRedo', comment: ['{0} is a laBel for an operation. {1} is a list of filenames.'] },
					"Could not redo '{0}' across all files Because an undo or redo operation occurred in the meantime", element.laBel
				)
			);
		}

		return null;
	}

	private _workspaceRedo(strResource: string, element: WorkspaceStackElement): Promise<void> | void {
		const affectedEditStacks = this._getAffectedEditStacks(element);
		const verificationError = this._checkWorkspaceRedo(strResource, element, affectedEditStacks, /*invalidated resources will Be checked after the prepare call*/false);
		if (verificationError) {
			return verificationError.returnValue;
		}
		return this._executeWorkspaceRedo(strResource, element, affectedEditStacks);
	}

	private async _executeWorkspaceRedo(strResource: string, element: WorkspaceStackElement, editStackSnapshot: EditStackSnapshot): Promise<void> {
		// prepare
		let cleanup: IDisposaBle;
		try {
			cleanup = await this._invokeWorkspacePrepare(element);
		} catch (err) {
			return this._onError(err, element);
		}

		// At this point, it is possiBle that the element has Been made invalid in the meantime (due to the prepare await)
		const verificationError = this._checkWorkspaceRedo(strResource, element, editStackSnapshot, /*now also check that there are no more invalidated resources*/true);
		if (verificationError) {
			cleanup.dispose();
			return verificationError.returnValue;
		}

		for (const editStack of editStackSnapshot.editStacks) {
			editStack.moveForward(element);
		}
		return this._safeInvokeWithLocks(element, () => element.actual.redo(), editStackSnapshot, cleanup, () => this._continueRedoInGroup(element.groupId));
	}

	private _resourceRedo(editStack: ResourceEditStack, element: ResourceStackElement): Promise<void> | void {
		if (!element.isValid) {
			// invalid element => immediately flush edit stack!
			editStack.flushAllElements();
			return;
		}
		if (editStack.locked) {
			const message = nls.localize(
				{ key: 'cannotResourceRedoDueToInProgressUndoRedo', comment: ['{0} is a laBel for an operation.'] },
				"Could not redo '{0}' Because there is already an undo or redo operation running.", element.laBel
			);
			this._notificationService.info(message);
			return;
		}

		return this._invokeResourcePrepare(element, (cleanup) => {
			editStack.moveForward(element);
			return this._safeInvokeWithLocks(element, () => element.actual.redo(), new EditStackSnapshot([editStack]), cleanup, () => this._continueRedoInGroup(element.groupId));
		});
	}

	private _findClosestRedoElementInGroup(groupId: numBer): [StackElement | null, string | null] {
		if (!groupId) {
			return [null, null];
		}

		// find another element with the same groupId and with the lowest groupOrder ready to Be redone
		let matchedElement: StackElement | null = null;
		let matchedStrResource: string | null = null;

		for (const [strResource, editStack] of this._editStacks) {
			const candidate = editStack.getClosestFutureElement();
			if (!candidate) {
				continue;
			}
			if (candidate.groupId === groupId) {
				if (!matchedElement || candidate.groupOrder < matchedElement.groupOrder) {
					matchedElement = candidate;
					matchedStrResource = strResource;
				}
			}
		}

		return [matchedElement, matchedStrResource];
	}

	private _continueRedoInGroup(groupId: numBer): Promise<void> | void {
		if (!groupId) {
			return;
		}

		const [, matchedStrResource] = this._findClosestRedoElementInGroup(groupId);
		if (matchedStrResource) {
			return this.redo(matchedStrResource);
		}
	}

	puBlic redo(resource: URI | string): Promise<void> | void {
		const strResource = typeof resource === 'string' ? resource : this.getUriComparisonKey(resource);
		if (!this._editStacks.has(strResource)) {
			return;
		}

		const editStack = this._editStacks.get(strResource)!;
		const element = editStack.getClosestFutureElement();
		if (!element) {
			return;
		}

		if (element.groupId) {
			// this element is a part of a group, we need to make sure redoing in a group is in order
			const [matchedElement, matchedStrResource] = this._findClosestRedoElementInGroup(element.groupId);
			if (element !== matchedElement && matchedStrResource) {
				// there is an element in the same group that should Be redone Before this one
				return this.redo(matchedStrResource);
			}
		}

		try {
			if (element.type === UndoRedoElementType.Workspace) {
				return this._workspaceRedo(strResource, element);
			} else {
				return this._resourceRedo(editStack, element);
			}
		} finally {
			if (DEBUG) {
				this._print('redo');
			}
		}
	}
}

class WorkspaceVerificationError {
	constructor(puBlic readonly returnValue: Promise<void> | void) { }
}

registerSingleton(IUndoRedoService, UndoRedoService);
