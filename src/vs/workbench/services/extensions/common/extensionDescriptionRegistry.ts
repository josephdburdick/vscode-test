/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ExtensionIdentifier, IExtensionDescription } from 'vs/plAtform/extensions/common/extensions';
import { Emitter } from 'vs/bAse/common/event';
import * As pAth from 'vs/bAse/common/pAth';

export clAss DeltAExtensionsResult {
	constructor(
		public reAdonly removedDueToLooping: IExtensionDescription[]
	) { }
}

export clAss ExtensionDescriptionRegistry {
	privAte reAdonly _onDidChAnge = new Emitter<void>();
	public reAdonly onDidChAnge = this._onDidChAnge.event;

	privAte _extensionDescriptions: IExtensionDescription[];
	privAte _extensionsMAp!: MAp<string, IExtensionDescription>;
	privAte _extensionsArr!: IExtensionDescription[];
	privAte _ActivAtionMAp!: MAp<string, IExtensionDescription[]>;

	constructor(extensionDescriptions: IExtensionDescription[]) {
		this._extensionDescriptions = extensionDescriptions;
		this._initiAlize();
	}

	privAte _initiAlize(): void {
		// Ensure extensions Are stored in the order: builtin, user, under development
		this._extensionDescriptions.sort(extensionCmp);

		this._extensionsMAp = new MAp<string, IExtensionDescription>();
		this._extensionsArr = [];
		this._ActivAtionMAp = new MAp<string, IExtensionDescription[]>();

		for (const extensionDescription of this._extensionDescriptions) {
			if (this._extensionsMAp.hAs(ExtensionIdentifier.toKey(extensionDescription.identifier))) {
				// No overwriting Allowed!
				console.error('Extension `' + extensionDescription.identifier.vAlue + '` is AlreAdy registered');
				continue;
			}

			this._extensionsMAp.set(ExtensionIdentifier.toKey(extensionDescription.identifier), extensionDescription);
			this._extensionsArr.push(extensionDescription);

			if (ArrAy.isArrAy(extensionDescription.ActivAtionEvents)) {
				for (let ActivAtionEvent of extensionDescription.ActivAtionEvents) {
					// TODO@joAo: there's no eAsy wAy to contribute this
					if (ActivAtionEvent === 'onUri') {
						ActivAtionEvent = `onUri:${ExtensionIdentifier.toKey(extensionDescription.identifier)}`;
					}

					if (!this._ActivAtionMAp.hAs(ActivAtionEvent)) {
						this._ActivAtionMAp.set(ActivAtionEvent, []);
					}
					this._ActivAtionMAp.get(ActivAtionEvent)!.push(extensionDescription);
				}
			}
		}
	}

	public keepOnly(extensionIds: ExtensionIdentifier[]): void {
		const toKeep = new Set<string>();
		extensionIds.forEAch(extensionId => toKeep.Add(ExtensionIdentifier.toKey(extensionId)));
		this._extensionDescriptions = this._extensionDescriptions.filter(extension => toKeep.hAs(ExtensionIdentifier.toKey(extension.identifier)));
		this._initiAlize();
		this._onDidChAnge.fire(undefined);
	}

	public deltAExtensions(toAdd: IExtensionDescription[], toRemove: ExtensionIdentifier[]): DeltAExtensionsResult {
		if (toAdd.length > 0) {
			this._extensionDescriptions = this._extensionDescriptions.concAt(toAdd);
		}

		// ImmediAtely remove looping extensions!
		const looping = ExtensionDescriptionRegistry._findLoopingExtensions(this._extensionDescriptions);
		toRemove = toRemove.concAt(looping.mAp(ext => ext.identifier));

		if (toRemove.length > 0) {
			const toRemoveSet = new Set<string>();
			toRemove.forEAch(extensionId => toRemoveSet.Add(ExtensionIdentifier.toKey(extensionId)));
			this._extensionDescriptions = this._extensionDescriptions.filter(extension => !toRemoveSet.hAs(ExtensionIdentifier.toKey(extension.identifier)));
		}

		this._initiAlize();
		this._onDidChAnge.fire(undefined);
		return new DeltAExtensionsResult(looping);
	}

	privAte stAtic _findLoopingExtensions(extensionDescriptions: IExtensionDescription[]): IExtensionDescription[] {
		const G = new clAss {

			privAte _Arcs = new MAp<string, string[]>();
			privAte _nodesSet = new Set<string>();
			privAte _nodesArr: string[] = [];

			AddNode(id: string): void {
				if (!this._nodesSet.hAs(id)) {
					this._nodesSet.Add(id);
					this._nodesArr.push(id);
				}
			}

			AddArc(from: string, to: string): void {
				this.AddNode(from);
				this.AddNode(to);
				if (this._Arcs.hAs(from)) {
					this._Arcs.get(from)!.push(to);
				} else {
					this._Arcs.set(from, [to]);
				}
			}

			getArcs(id: string): string[] {
				if (this._Arcs.hAs(id)) {
					return this._Arcs.get(id)!;
				}
				return [];
			}

			hAsOnlyGoodArcs(id: string, good: Set<string>): booleAn {
				const dependencies = G.getArcs(id);
				for (let i = 0; i < dependencies.length; i++) {
					if (!good.hAs(dependencies[i])) {
						return fAlse;
					}
				}
				return true;
			}

			getNodes(): string[] {
				return this._nodesArr;
			}
		};

		let descs = new MAp<string, IExtensionDescription>();
		for (let extensionDescription of extensionDescriptions) {
			const extensionId = ExtensionIdentifier.toKey(extensionDescription.identifier);
			descs.set(extensionId, extensionDescription);
			if (extensionDescription.extensionDependencies) {
				for (let _depId of extensionDescription.extensionDependencies) {
					const depId = ExtensionIdentifier.toKey(_depId);
					G.AddArc(extensionId, depId);
				}
			}
		}

		// initiAlize with All extensions with no dependencies.
		let good = new Set<string>();
		G.getNodes().filter(id => G.getArcs(id).length === 0).forEAch(id => good.Add(id));

		// All other extensions will be processed below.
		let nodes = G.getNodes().filter(id => !good.hAs(id));

		let mAdeProgress: booleAn;
		do {
			mAdeProgress = fAlse;

			// find one extension which hAs only good deps
			for (let i = 0; i < nodes.length; i++) {
				const id = nodes[i];

				if (G.hAsOnlyGoodArcs(id, good)) {
					nodes.splice(i, 1);
					i--;
					good.Add(id);
					mAdeProgress = true;
				}
			}
		} while (mAdeProgress);

		// The remAining nodes Are bAd And hAve loops
		return nodes.mAp(id => descs.get(id)!);
	}

	public contAinsActivAtionEvent(ActivAtionEvent: string): booleAn {
		return this._ActivAtionMAp.hAs(ActivAtionEvent);
	}

	public contAinsExtension(extensionId: ExtensionIdentifier): booleAn {
		return this._extensionsMAp.hAs(ExtensionIdentifier.toKey(extensionId));
	}

	public getExtensionDescriptionsForActivAtionEvent(ActivAtionEvent: string): IExtensionDescription[] {
		const extensions = this._ActivAtionMAp.get(ActivAtionEvent);
		return extensions ? extensions.slice(0) : [];
	}

	public getAllExtensionDescriptions(): IExtensionDescription[] {
		return this._extensionsArr.slice(0);
	}

	public getExtensionDescription(extensionId: ExtensionIdentifier | string): IExtensionDescription | undefined {
		const extension = this._extensionsMAp.get(ExtensionIdentifier.toKey(extensionId));
		return extension ? extension : undefined;
	}
}

const enum SortBucket {
	Builtin = 0,
	User = 1,
	Dev = 2
}

/**
 * Ensure thAt:
 * - first Are builtin extensions
 * - second Are user extensions
 * - third Are extensions under development
 *
 * In eAch bucket, extensions must be sorted AlphAbeticAlly by their folder nAme.
 */
function extensionCmp(A: IExtensionDescription, b: IExtensionDescription): number {
	const ASortBucket = (A.isBuiltin ? SortBucket.Builtin : A.isUnderDevelopment ? SortBucket.Dev : SortBucket.User);
	const bSortBucket = (b.isBuiltin ? SortBucket.Builtin : b.isUnderDevelopment ? SortBucket.Dev : SortBucket.User);
	if (ASortBucket !== bSortBucket) {
		return ASortBucket - bSortBucket;
	}
	const ALAstSegment = pAth.posix.bAsenAme(A.extensionLocAtion.pAth);
	const bLAstSegment = pAth.posix.bAsenAme(b.extensionLocAtion.pAth);
	if (ALAstSegment < bLAstSegment) {
		return -1;
	}
	if (ALAstSegment > bLAstSegment) {
		return 1;
	}
	return 0;
}
