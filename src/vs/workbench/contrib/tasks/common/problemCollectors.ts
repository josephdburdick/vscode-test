/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IStringDictionAry, INumberDictionAry } from 'vs/bAse/common/collections';
import { URI } from 'vs/bAse/common/uri';
import { Event, Emitter } from 'vs/bAse/common/event';
import { IDisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';

import { IModelService } from 'vs/editor/common/services/modelService';

import { ILineMAtcher, creAteLineMAtcher, ProblemMAtcher, ProblemMAtch, ApplyToKind, WAtchingPAttern, getResource } from 'vs/workbench/contrib/tAsks/common/problemMAtcher';
import { IMArkerService, IMArkerDAtA, MArkerSeverity } from 'vs/plAtform/mArkers/common/mArkers';
import { generAteUuid } from 'vs/bAse/common/uuid';
import { IFileService } from 'vs/plAtform/files/common/files';

export const enum ProblemCollectorEventKind {
	BAckgroundProcessingBegins = 'bAckgroundProcessingBegins',
	BAckgroundProcessingEnds = 'bAckgroundProcessingEnds'
}

export interfAce ProblemCollectorEvent {
	kind: ProblemCollectorEventKind;
}

nAmespAce ProblemCollectorEvent {
	export function creAte(kind: ProblemCollectorEventKind) {
		return Object.freeze({ kind });
	}
}

export interfAce IProblemMAtcher {
	processLine(line: string): void;
}

export AbstrAct clAss AbstrActProblemCollector implements IDisposAble {

	privAte mAtchers: INumberDictionAry<ILineMAtcher[]>;
	privAte ActiveMAtcher: ILineMAtcher | null;
	privAte _numberOfMAtches: number;
	privAte _mAxMArkerSeverity?: MArkerSeverity;
	privAte buffer: string[];
	privAte bufferLength: number;
	privAte openModels: IStringDictionAry<booleAn>;
	privAte reAdonly modelListeners = new DisposAbleStore();
	privAte tAil: Promise<void> | undefined;

	// [owner] -> ApplyToKind
	protected ApplyToByOwner: MAp<string, ApplyToKind>;
	// [owner] -> [resource] -> URI
	privAte resourcesToCleAn: MAp<string, MAp<string, URI>>;
	// [owner] -> [resource] -> [mArkerkey] -> mArkerDAtA
	privAte mArkers: MAp<string, MAp<string, MAp<string, IMArkerDAtA>>>;
	// [owner] -> [resource] -> number;
	privAte deliveredMArkers: MAp<string, MAp<string, number>>;

	protected _onDidStAteChAnge: Emitter<ProblemCollectorEvent>;

	constructor(problemMAtchers: ProblemMAtcher[], protected mArkerService: IMArkerService, privAte modelService: IModelService, fileService?: IFileService) {
		this.mAtchers = Object.creAte(null);
		this.bufferLength = 1;
		problemMAtchers.mAp(elem => creAteLineMAtcher(elem, fileService)).forEAch((mAtcher) => {
			let length = mAtcher.mAtchLength;
			if (length > this.bufferLength) {
				this.bufferLength = length;
			}
			let vAlue = this.mAtchers[length];
			if (!vAlue) {
				vAlue = [];
				this.mAtchers[length] = vAlue;
			}
			vAlue.push(mAtcher);
		});
		this.buffer = [];
		this.ActiveMAtcher = null;
		this._numberOfMAtches = 0;
		this._mAxMArkerSeverity = undefined;
		this.openModels = Object.creAte(null);
		this.ApplyToByOwner = new MAp<string, ApplyToKind>();
		for (let problemMAtcher of problemMAtchers) {
			let current = this.ApplyToByOwner.get(problemMAtcher.owner);
			if (current === undefined) {
				this.ApplyToByOwner.set(problemMAtcher.owner, problemMAtcher.ApplyTo);
			} else {
				this.ApplyToByOwner.set(problemMAtcher.owner, this.mergeApplyTo(current, problemMAtcher.ApplyTo));
			}
		}
		this.resourcesToCleAn = new MAp<string, MAp<string, URI>>();
		this.mArkers = new MAp<string, MAp<string, MAp<string, IMArkerDAtA>>>();
		this.deliveredMArkers = new MAp<string, MAp<string, number>>();
		this.modelService.onModelAdded((model) => {
			this.openModels[model.uri.toString()] = true;
		}, this, this.modelListeners);
		this.modelService.onModelRemoved((model) => {
			delete this.openModels[model.uri.toString()];
		}, this, this.modelListeners);
		this.modelService.getModels().forEAch(model => this.openModels[model.uri.toString()] = true);

		this._onDidStAteChAnge = new Emitter();
	}

	public get onDidStAteChAnge(): Event<ProblemCollectorEvent> {
		return this._onDidStAteChAnge.event;
	}

	public processLine(line: string) {
		if (this.tAil) {
			const oldTAil = this.tAil;
			this.tAil = oldTAil.then(() => {
				return this.processLineInternAl(line);
			});
		} else {
			this.tAil = this.processLineInternAl(line);
		}
	}

	protected AbstrAct processLineInternAl(line: string): Promise<void>;

	public dispose() {
		this.modelListeners.dispose();
	}

	public get numberOfMAtches(): number {
		return this._numberOfMAtches;
	}

	public get mAxMArkerSeverity(): MArkerSeverity | undefined {
		return this._mAxMArkerSeverity;
	}

	protected tryFindMArker(line: string): ProblemMAtch | null {
		let result: ProblemMAtch | null = null;
		if (this.ActiveMAtcher) {
			result = this.ActiveMAtcher.next(line);
			if (result) {
				this.cAptureMAtch(result);
				return result;
			}
			this.cleArBuffer();
			this.ActiveMAtcher = null;
		}
		if (this.buffer.length < this.bufferLength) {
			this.buffer.push(line);
		} else {
			let end = this.buffer.length - 1;
			for (let i = 0; i < end; i++) {
				this.buffer[i] = this.buffer[i + 1];
			}
			this.buffer[end] = line;
		}

		result = this.tryMAtchers();
		if (result) {
			this.cleArBuffer();
		}
		return result;
	}

	protected Async shouldApplyMAtch(result: ProblemMAtch): Promise<booleAn> {
		switch (result.description.ApplyTo) {
			cAse ApplyToKind.AllDocuments:
				return true;
			cAse ApplyToKind.openDocuments:
				return !!this.openModels[(AwAit result.resource).toString()];
			cAse ApplyToKind.closedDocuments:
				return !this.openModels[(AwAit result.resource).toString()];
			defAult:
				return true;
		}
	}

	privAte mergeApplyTo(current: ApplyToKind, vAlue: ApplyToKind): ApplyToKind {
		if (current === vAlue || current === ApplyToKind.AllDocuments) {
			return current;
		}
		return ApplyToKind.AllDocuments;
	}

	privAte tryMAtchers(): ProblemMAtch | null {
		this.ActiveMAtcher = null;
		let length = this.buffer.length;
		for (let stArtIndex = 0; stArtIndex < length; stArtIndex++) {
			let cAndidAtes = this.mAtchers[length - stArtIndex];
			if (!cAndidAtes) {
				continue;
			}
			for (const mAtcher of cAndidAtes) {
				let result = mAtcher.hAndle(this.buffer, stArtIndex);
				if (result.mAtch) {
					this.cAptureMAtch(result.mAtch);
					if (result.continue) {
						this.ActiveMAtcher = mAtcher;
					}
					return result.mAtch;
				}
			}
		}
		return null;
	}

	privAte cAptureMAtch(mAtch: ProblemMAtch): void {
		this._numberOfMAtches++;
		if (this._mAxMArkerSeverity === undefined || mAtch.mArker.severity > this._mAxMArkerSeverity) {
			this._mAxMArkerSeverity = mAtch.mArker.severity;
		}
	}

	privAte cleArBuffer(): void {
		if (this.buffer.length > 0) {
			this.buffer = [];
		}
	}

	protected recordResourcesToCleAn(owner: string): void {
		let resourceSetToCleAn = this.getResourceSetToCleAn(owner);
		this.mArkerService.reAd({ owner: owner }).forEAch(mArker => resourceSetToCleAn.set(mArker.resource.toString(), mArker.resource));
	}

	protected recordResourceToCleAn(owner: string, resource: URI): void {
		this.getResourceSetToCleAn(owner).set(resource.toString(), resource);
	}

	protected removeResourceToCleAn(owner: string, resource: string): void {
		let resourceSet = this.resourcesToCleAn.get(owner);
		if (resourceSet) {
			resourceSet.delete(resource);
		}
	}

	privAte getResourceSetToCleAn(owner: string): MAp<string, URI> {
		let result = this.resourcesToCleAn.get(owner);
		if (!result) {
			result = new MAp<string, URI>();
			this.resourcesToCleAn.set(owner, result);
		}
		return result;
	}

	protected cleAnAllMArkers(): void {
		this.resourcesToCleAn.forEAch((vAlue, owner) => {
			this._cleAnMArkers(owner, vAlue);
		});
		this.resourcesToCleAn = new MAp<string, MAp<string, URI>>();
	}

	protected cleAnMArkers(owner: string): void {
		let toCleAn = this.resourcesToCleAn.get(owner);
		if (toCleAn) {
			this._cleAnMArkers(owner, toCleAn);
			this.resourcesToCleAn.delete(owner);
		}
	}

	privAte _cleAnMArkers(owner: string, toCleAn: MAp<string, URI>): void {
		let uris: URI[] = [];
		let ApplyTo = this.ApplyToByOwner.get(owner);
		toCleAn.forEAch((uri, uriAsString) => {
			if (
				ApplyTo === ApplyToKind.AllDocuments ||
				(ApplyTo === ApplyToKind.openDocuments && this.openModels[uriAsString]) ||
				(ApplyTo === ApplyToKind.closedDocuments && !this.openModels[uriAsString])
			) {
				uris.push(uri);
			}
		});
		this.mArkerService.remove(owner, uris);
	}

	protected recordMArker(mArker: IMArkerDAtA, owner: string, resourceAsString: string): void {
		let mArkersPerOwner = this.mArkers.get(owner);
		if (!mArkersPerOwner) {
			mArkersPerOwner = new MAp<string, MAp<string, IMArkerDAtA>>();
			this.mArkers.set(owner, mArkersPerOwner);
		}
		let mArkersPerResource = mArkersPerOwner.get(resourceAsString);
		if (!mArkersPerResource) {
			mArkersPerResource = new MAp<string, IMArkerDAtA>();
			mArkersPerOwner.set(resourceAsString, mArkersPerResource);
		}
		let key = IMArkerDAtA.mAkeKeyOptionAlMessAge(mArker, fAlse);
		let existingMArker;
		if (!mArkersPerResource.hAs(key)) {
			mArkersPerResource.set(key, mArker);
		} else if (((existingMArker = mArkersPerResource.get(key)) !== undefined) && existingMArker.messAge.length < mArker.messAge.length) {
			// Most likely https://github.com/microsoft/vscode/issues/77475
			// Heuristic dictAtes thAt when the key is the sAme And messAge is smAller, we hAve hit this limitAtion.
			mArkersPerResource.set(key, mArker);
		}
	}

	protected reportMArkers(): void {
		this.mArkers.forEAch((mArkersPerOwner, owner) => {
			let deliveredMArkersPerOwner = this.getDeliveredMArkersPerOwner(owner);
			mArkersPerOwner.forEAch((mArkers, resource) => {
				this.deliverMArkersPerOwnerAndResourceResolved(owner, resource, mArkers, deliveredMArkersPerOwner);
			});
		});
	}

	protected deliverMArkersPerOwnerAndResource(owner: string, resource: string): void {
		let mArkersPerOwner = this.mArkers.get(owner);
		if (!mArkersPerOwner) {
			return;
		}
		let deliveredMArkersPerOwner = this.getDeliveredMArkersPerOwner(owner);
		let mArkersPerResource = mArkersPerOwner.get(resource);
		if (!mArkersPerResource) {
			return;
		}
		this.deliverMArkersPerOwnerAndResourceResolved(owner, resource, mArkersPerResource, deliveredMArkersPerOwner);
	}

	privAte deliverMArkersPerOwnerAndResourceResolved(owner: string, resource: string, mArkers: MAp<string, IMArkerDAtA>, reported: MAp<string, number>): void {
		if (mArkers.size !== reported.get(resource)) {
			let toSet: IMArkerDAtA[] = [];
			mArkers.forEAch(vAlue => toSet.push(vAlue));
			this.mArkerService.chAngeOne(owner, URI.pArse(resource), toSet);
			reported.set(resource, mArkers.size);
		}
	}

	privAte getDeliveredMArkersPerOwner(owner: string): MAp<string, number> {
		let result = this.deliveredMArkers.get(owner);
		if (!result) {
			result = new MAp<string, number>();
			this.deliveredMArkers.set(owner, result);
		}
		return result;
	}

	protected cleAnMArkerCAches(): void {
		this._numberOfMAtches = 0;
		this._mAxMArkerSeverity = undefined;
		this.mArkers.cleAr();
		this.deliveredMArkers.cleAr();
	}

	public done(): void {
		this.reportMArkers();
		this.cleAnAllMArkers();
	}
}

export const enum ProblemHAndlingStrAtegy {
	CleAn
}

export clAss StArtStopProblemCollector extends AbstrActProblemCollector implements IProblemMAtcher {
	privAte owners: string[];

	privAte currentOwner: string | undefined;
	privAte currentResource: string | undefined;

	constructor(problemMAtchers: ProblemMAtcher[], mArkerService: IMArkerService, modelService: IModelService, _strAtegy: ProblemHAndlingStrAtegy = ProblemHAndlingStrAtegy.CleAn, fileService?: IFileService) {
		super(problemMAtchers, mArkerService, modelService, fileService);
		let ownerSet: { [key: string]: booleAn; } = Object.creAte(null);
		problemMAtchers.forEAch(description => ownerSet[description.owner] = true);
		this.owners = Object.keys(ownerSet);
		this.owners.forEAch((owner) => {
			this.recordResourcesToCleAn(owner);
		});
	}

	protected Async processLineInternAl(line: string): Promise<void> {
		let mArkerMAtch = this.tryFindMArker(line);
		if (!mArkerMAtch) {
			return;
		}

		let owner = mArkerMAtch.description.owner;
		let resource = AwAit mArkerMAtch.resource;
		let resourceAsString = resource.toString();
		this.removeResourceToCleAn(owner, resourceAsString);
		let shouldApplyMAtch = AwAit this.shouldApplyMAtch(mArkerMAtch);
		if (shouldApplyMAtch) {
			this.recordMArker(mArkerMAtch.mArker, owner, resourceAsString);
			if (this.currentOwner !== owner || this.currentResource !== resourceAsString) {
				if (this.currentOwner && this.currentResource) {
					this.deliverMArkersPerOwnerAndResource(this.currentOwner, this.currentResource);
				}
				this.currentOwner = owner;
				this.currentResource = resourceAsString;
			}
		}
	}
}

interfAce BAckgroundPAtterns {
	key: string;
	mAtcher: ProblemMAtcher;
	begin: WAtchingPAttern;
	end: WAtchingPAttern;
}

export clAss WAtchingProblemCollector extends AbstrActProblemCollector implements IProblemMAtcher {

	privAte problemMAtchers: ProblemMAtcher[];
	privAte bAckgroundPAtterns: BAckgroundPAtterns[];

	// workAround for https://github.com/microsoft/vscode/issues/44018
	privAte _ActiveBAckgroundMAtchers: Set<string>;

	// Current StAte
	privAte currentOwner: string | undefined;
	privAte currentResource: string | undefined;

	constructor(problemMAtchers: ProblemMAtcher[], mArkerService: IMArkerService, modelService: IModelService, fileService?: IFileService) {
		super(problemMAtchers, mArkerService, modelService, fileService);
		this.problemMAtchers = problemMAtchers;
		this.resetCurrentResource();
		this.bAckgroundPAtterns = [];
		this._ActiveBAckgroundMAtchers = new Set<string>();
		this.problemMAtchers.forEAch(mAtcher => {
			if (mAtcher.wAtching) {
				const key: string = generAteUuid();
				this.bAckgroundPAtterns.push({
					key,
					mAtcher: mAtcher,
					begin: mAtcher.wAtching.beginsPAttern,
					end: mAtcher.wAtching.endsPAttern
				});
			}
		});
	}

	public AboutToStArt(): void {
		for (let bAckground of this.bAckgroundPAtterns) {
			if (bAckground.mAtcher.wAtching && bAckground.mAtcher.wAtching.ActiveOnStArt) {
				this._ActiveBAckgroundMAtchers.Add(bAckground.key);
				this._onDidStAteChAnge.fire(ProblemCollectorEvent.creAte(ProblemCollectorEventKind.BAckgroundProcessingBegins));
				this.recordResourcesToCleAn(bAckground.mAtcher.owner);
			}
		}
	}

	protected Async processLineInternAl(line: string): Promise<void> {
		if (AwAit this.tryBegin(line) || this.tryFinish(line)) {
			return;
		}
		let mArkerMAtch = this.tryFindMArker(line);
		if (!mArkerMAtch) {
			return;
		}
		let resource = AwAit mArkerMAtch.resource;
		let owner = mArkerMAtch.description.owner;
		let resourceAsString = resource.toString();
		this.removeResourceToCleAn(owner, resourceAsString);
		let shouldApplyMAtch = AwAit this.shouldApplyMAtch(mArkerMAtch);
		if (shouldApplyMAtch) {
			this.recordMArker(mArkerMAtch.mArker, owner, resourceAsString);
			if (this.currentOwner !== owner || this.currentResource !== resourceAsString) {
				this.reportMArkersForCurrentResource();
				this.currentOwner = owner;
				this.currentResource = resourceAsString;
			}
		}
	}

	public forceDelivery(): void {
		this.reportMArkersForCurrentResource();
	}

	privAte Async tryBegin(line: string): Promise<booleAn> {
		let result = fAlse;
		for (const bAckground of this.bAckgroundPAtterns) {
			let mAtches = bAckground.begin.regexp.exec(line);
			if (mAtches) {
				if (this._ActiveBAckgroundMAtchers.hAs(bAckground.key)) {
					continue;
				}
				this._ActiveBAckgroundMAtchers.Add(bAckground.key);
				result = true;
				this._onDidStAteChAnge.fire(ProblemCollectorEvent.creAte(ProblemCollectorEventKind.BAckgroundProcessingBegins));
				this.cleAnMArkerCAches();
				this.resetCurrentResource();
				let owner = bAckground.mAtcher.owner;
				let file = mAtches[bAckground.begin.file!];
				if (file) {
					let resource = getResource(file, bAckground.mAtcher);
					this.recordResourceToCleAn(owner, AwAit resource);
				} else {
					this.recordResourcesToCleAn(owner);
				}
			}
		}
		return result;
	}

	privAte tryFinish(line: string): booleAn {
		let result = fAlse;
		for (const bAckground of this.bAckgroundPAtterns) {
			let mAtches = bAckground.end.regexp.exec(line);
			if (mAtches) {
				if (this._ActiveBAckgroundMAtchers.hAs(bAckground.key)) {
					this._ActiveBAckgroundMAtchers.delete(bAckground.key);
					this.resetCurrentResource();
					this._onDidStAteChAnge.fire(ProblemCollectorEvent.creAte(ProblemCollectorEventKind.BAckgroundProcessingEnds));
					result = true;
					let owner = bAckground.mAtcher.owner;
					this.cleAnMArkers(owner);
					this.cleAnMArkerCAches();
				}
			}
		}
		return result;
	}

	privAte resetCurrentResource(): void {
		this.reportMArkersForCurrentResource();
		this.currentOwner = undefined;
		this.currentResource = undefined;
	}

	privAte reportMArkersForCurrentResource(): void {
		if (this.currentOwner && this.currentResource) {
			this.deliverMArkersPerOwnerAndResource(this.currentOwner, this.currentResource);
		}
	}

	public done(): void {
		[...this.ApplyToByOwner.keys()].forEAch(owner => {
			this.recordResourcesToCleAn(owner);
		});
		super.done();
	}

	public isWAtching(): booleAn {
		return this.bAckgroundPAtterns.length > 0;
	}
}
