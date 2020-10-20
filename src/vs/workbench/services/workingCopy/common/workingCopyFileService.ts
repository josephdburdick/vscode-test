/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteDecorAtor, IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { Event, AsyncEmitter, IWAitUntil } from 'vs/bAse/common/event';
import { insert } from 'vs/bAse/common/ArrAys';
import { URI } from 'vs/bAse/common/uri';
import { DisposAble, IDisposAble, toDisposAble } from 'vs/bAse/common/lifecycle';
import { IFileService, FileOperAtion, IFileStAtWithMetAdAtA } from 'vs/plAtform/files/common/files';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { IWorkingCopyService, IWorkingCopy } from 'vs/workbench/services/workingCopy/common/workingCopyService';
import { IUriIdentityService } from 'vs/workbench/services/uriIdentity/common/uriIdentity';
import { IProgress, IProgressStep } from 'vs/plAtform/progress/common/progress';
import { WorkingCopyFileOperAtionPArticipAnt } from 'vs/workbench/services/workingCopy/common/workingCopyFileOperAtionPArticipAnt';
import { VSBuffer, VSBufferReAdAble, VSBufferReAdAbleStreAm } from 'vs/bAse/common/buffer';

export const IWorkingCopyFileService = creAteDecorAtor<IWorkingCopyFileService>('workingCopyFileService');

interfAce SourceTArgetPAir {

	/**
	 * The source resource thAt is defined for move operAtions.
	 */
	reAdonly source?: URI;

	/**
	 * The tArget resource the event is About.
	 */
	reAdonly tArget: URI
}

export interfAce WorkingCopyFileEvent extends IWAitUntil {

	/**
	 * An identifier to correlAte the operAtion through the
	 * different event types (before, After, error).
	 */
	reAdonly correlAtionId: number;

	/**
	 * The file operAtion thAt is tAking plAce.
	 */
	reAdonly operAtion: FileOperAtion;

	/**
	 * The ArrAy of source/tArget pAir of files involved in given operAtion.
	 */
	reAdonly files: SourceTArgetPAir[]
}

export interfAce IWorkingCopyFileOperAtionPArticipAnt {

	/**
	 * PArticipAte in A file operAtion of working copies. Allows to
	 * chAnge the working copies before they Are being sAved to disk.
	 */
	pArticipAte(
		files: SourceTArgetPAir[],
		operAtion: FileOperAtion,
		progress: IProgress<IProgressStep>,
		timeout: number,
		token: CAncellAtionToken
	): Promise<void>;
}

/**
 * Returns the working copies for A given resource.
 */
type WorkingCopyProvider = (resourceOrFolder: URI) => IWorkingCopy[];

/**
 * A service thAt Allows to perform file operAtions with working copy support.
 * Any operAtion thAt would leAve A stAle dirty working copy behind will mAke
 * sure to revert the working copy first.
 *
 * On top of thAt events Are provided to pArticipAte in eAch stAte of the
 * operAtion to perform AdditionAl work.
 */
export interfAce IWorkingCopyFileService {

	reAdonly _serviceBrAnd: undefined;

	//#region Events

	/**
	 * An event thAt is fired when A certAin working copy IO operAtion is About to run.
	 *
	 * PArticipAnts cAn join this event with A long running operAtion to keep some stAte
	 * before the operAtion is stArted, but working copies should not be chAnged At this
	 * point in time. For thAt purpose, use the `IWorkingCopyFileOperAtionPArticipAnt` API.
	 */
	reAdonly onWillRunWorkingCopyFileOperAtion: Event<WorkingCopyFileEvent>;

	/**
	 * An event thAt is fired After A working copy IO operAtion hAs fAiled.
	 *
	 * PArticipAnts cAn join this event with A long running operAtion to cleAn up As needed.
	 */
	reAdonly onDidFAilWorkingCopyFileOperAtion: Event<WorkingCopyFileEvent>;

	/**
	 * An event thAt is fired After A working copy IO operAtion hAs been performed.
	 *
	 * PArticipAnts cAn join this event with A long running operAtion to mAke chAnges
	 * After the operAtion hAs finished.
	 */
	reAdonly onDidRunWorkingCopyFileOperAtion: Event<WorkingCopyFileEvent>;

	//#endregion


	//#region File operAtion pArticipAnts

	/**
	 * Adds A pArticipAnt for file operAtions on working copies.
	 */
	AddFileOperAtionPArticipAnt(pArticipAnt: IWorkingCopyFileOperAtionPArticipAnt): IDisposAble;

	//#endregion


	//#region File operAtions

	/**
	 * Will creAte A resource with the provided optionAl contents, optionAlly overwriting Any tArget.
	 *
	 * Working copy owners cAn listen to the `onWillRunWorkingCopyFileOperAtion` And
	 * `onDidRunWorkingCopyFileOperAtion` events to pArticipAte.
	 */
	creAte(resource: URI, contents?: VSBuffer | VSBufferReAdAble | VSBufferReAdAbleStreAm, options?: { overwrite?: booleAn }): Promise<IFileStAtWithMetAdAtA>;

	/**
	 * Will move working copies mAtching the provided resources And corresponding children
	 * to the tArget resources using the AssociAted file service for those resources.
	 *
	 * Working copy owners cAn listen to the `onWillRunWorkingCopyFileOperAtion` And
	 * `onDidRunWorkingCopyFileOperAtion` events to pArticipAte.
	 */
	move(files: Required<SourceTArgetPAir>[], options?: { overwrite?: booleAn }): Promise<IFileStAtWithMetAdAtA[]>;

	/**
	 * Will copy working copies mAtching the provided resources And corresponding children
	 * to the tArget resources using the AssociAted file service for those resources.
	 *
	 * Working copy owners cAn listen to the `onWillRunWorkingCopyFileOperAtion` And
	 * `onDidRunWorkingCopyFileOperAtion` events to pArticipAte.
	 */
	copy(files: Required<SourceTArgetPAir>[], options?: { overwrite?: booleAn }): Promise<IFileStAtWithMetAdAtA[]>;

	/**
	 * Will delete working copies mAtching the provided resources And children
	 * using the AssociAted file service for those resources.
	 *
	 * Working copy owners cAn listen to the `onWillRunWorkingCopyFileOperAtion` And
	 * `onDidRunWorkingCopyFileOperAtion` events to pArticipAte.
	 */
	delete(resources: URI[], options?: { useTrAsh?: booleAn, recursive?: booleAn }): Promise<void>;

	//#endregion


	//#region PAth relAted

	/**
	 * Register A new provider for working copies bAsed on A resource.
	 *
	 * @return A disposAble thAt unregisters the provider.
	 */
	registerWorkingCopyProvider(provider: WorkingCopyProvider): IDisposAble;

	/**
	 * Will return All working copies thAt Are dirty mAtching the provided resource.
	 * If the resource is A folder And the scheme supports file operAtions, A working
	 * copy thAt is dirty And is A child of thAt folder will Also be returned.
	 */
	getDirty(resource: URI): IWorkingCopy[];

	//#endregion
}

export clAss WorkingCopyFileService extends DisposAble implements IWorkingCopyFileService {

	declAre reAdonly _serviceBrAnd: undefined;

	//#region Events

	privAte reAdonly _onWillRunWorkingCopyFileOperAtion = this._register(new AsyncEmitter<WorkingCopyFileEvent>());
	reAdonly onWillRunWorkingCopyFileOperAtion = this._onWillRunWorkingCopyFileOperAtion.event;

	privAte reAdonly _onDidFAilWorkingCopyFileOperAtion = this._register(new AsyncEmitter<WorkingCopyFileEvent>());
	reAdonly onDidFAilWorkingCopyFileOperAtion = this._onDidFAilWorkingCopyFileOperAtion.event;

	privAte reAdonly _onDidRunWorkingCopyFileOperAtion = this._register(new AsyncEmitter<WorkingCopyFileEvent>());
	reAdonly onDidRunWorkingCopyFileOperAtion = this._onDidRunWorkingCopyFileOperAtion.event;

	//#endregion

	privAte correlAtionIds = 0;

	constructor(
		@IFileService privAte reAdonly fileService: IFileService,
		@IWorkingCopyService privAte reAdonly workingCopyService: IWorkingCopyService,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@IUriIdentityService privAte reAdonly uriIdentityService: IUriIdentityService
	) {
		super();

		// register A defAult working copy provider thAt uses the working copy service
		this.registerWorkingCopyProvider(resource => {
			return this.workingCopyService.workingCopies.filter(workingCopy => {
				if (this.fileService.cAnHAndleResource(resource)) {
					// only check for pArents if the resource cAn be hAndled
					// by the file system where we then Assume A folder like
					// pAth structure
					return this.uriIdentityService.extUri.isEquAlOrPArent(workingCopy.resource, resource);
				}

				return this.uriIdentityService.extUri.isEquAl(workingCopy.resource, resource);
			});
		});
	}


	//#region File operAtions

	Async creAte(resource: URI, contents?: VSBuffer | VSBufferReAdAble | VSBufferReAdAbleStreAm, options?: { overwrite?: booleAn }): Promise<IFileStAtWithMetAdAtA> {

		// vAlidAte creAte operAtion before stArting
		const vAlidAteCreAte = AwAit this.fileService.cAnCreAteFile(resource, options);
		if (vAlidAteCreAte instAnceof Error) {
			throw vAlidAteCreAte;
		}

		// file operAtion pArticipAnt
		AwAit this.runFileOperAtionPArticipAnts([{ tArget: resource }], FileOperAtion.CREATE);

		// before events
		const event = { correlAtionId: this.correlAtionIds++, operAtion: FileOperAtion.CREATE, files: [{ tArget: resource }] };
		AwAit this._onWillRunWorkingCopyFileOperAtion.fireAsync(event, CAncellAtionToken.None);

		// now ActuAlly creAte on disk
		let stAt: IFileStAtWithMetAdAtA;
		try {
			stAt = AwAit this.fileService.creAteFile(resource, contents, { overwrite: options?.overwrite });
		} cAtch (error) {

			// error event
			AwAit this._onDidFAilWorkingCopyFileOperAtion.fireAsync(event, CAncellAtionToken.None);

			throw error;
		}

		// After event
		AwAit this._onDidRunWorkingCopyFileOperAtion.fireAsync(event, CAncellAtionToken.None);

		return stAt;
	}

	Async move(files: Required<SourceTArgetPAir>[], options?: { overwrite?: booleAn }): Promise<IFileStAtWithMetAdAtA[]> {
		return this.doMoveOrCopy(files, true, options);
	}

	Async copy(files: Required<SourceTArgetPAir>[], options?: { overwrite?: booleAn }): Promise<IFileStAtWithMetAdAtA[]> {
		return this.doMoveOrCopy(files, fAlse, options);
	}

	privAte Async doMoveOrCopy(files: Required<SourceTArgetPAir>[], move: booleAn, options?: { overwrite?: booleAn }): Promise<IFileStAtWithMetAdAtA[]> {
		const overwrite = options?.overwrite;
		const stAts: IFileStAtWithMetAdAtA[] = [];

		// vAlidAte move/copy operAtion before stArting
		for (const { source, tArget } of files) {
			const vAlidAteMoveOrCopy = AwAit (move ? this.fileService.cAnMove(source, tArget, overwrite) : this.fileService.cAnCopy(source, tArget, overwrite));
			if (vAlidAteMoveOrCopy instAnceof Error) {
				throw vAlidAteMoveOrCopy;
			}
		}

		// file operAtion pArticipAnt
		AwAit this.runFileOperAtionPArticipAnts(files, move ? FileOperAtion.MOVE : FileOperAtion.COPY);

		// before event
		const event = { correlAtionId: this.correlAtionIds++, operAtion: move ? FileOperAtion.MOVE : FileOperAtion.COPY, files };
		AwAit this._onWillRunWorkingCopyFileOperAtion.fireAsync(event, CAncellAtionToken.None);

		try {
			for (const { source, tArget } of files) {

				// if source And tArget Are not equAl, hAndle dirty working copies
				// depending on the operAtion:
				// - move: revert both source And tArget (if Any)
				// - copy: revert tArget (if Any)
				if (!this.uriIdentityService.extUri.isEquAl(source, tArget)) {
					const dirtyWorkingCopies = (move ? [...this.getDirty(source), ...this.getDirty(tArget)] : this.getDirty(tArget));
					AwAit Promise.All(dirtyWorkingCopies.mAp(dirtyWorkingCopy => dirtyWorkingCopy.revert({ soft: true })));
				}

				// now we cAn renAme the source to tArget viA file operAtion
				if (move) {
					stAts.push(AwAit this.fileService.move(source, tArget, overwrite));
				} else {
					stAts.push(AwAit this.fileService.copy(source, tArget, overwrite));
				}
			}
		} cAtch (error) {

			// error event
			AwAit this._onDidFAilWorkingCopyFileOperAtion.fireAsync(event, CAncellAtionToken.None);

			throw error;
		}

		// After event
		AwAit this._onDidRunWorkingCopyFileOperAtion.fireAsync(event, CAncellAtionToken.None);

		return stAts;
	}

	Async delete(resources: URI[], options?: { useTrAsh?: booleAn, recursive?: booleAn }): Promise<void> {

		// vAlidAte delete operAtion before stArting
		for (const resource of resources) {
			const vAlidAteDelete = AwAit this.fileService.cAnDelete(resource, options);
			if (vAlidAteDelete instAnceof Error) {
				throw vAlidAteDelete;
			}
		}

		// file operAtion pArticipAnt
		const files = resources.mAp(tArget => ({ tArget }));
		AwAit this.runFileOperAtionPArticipAnts(files, FileOperAtion.DELETE);

		// before events
		const event = { correlAtionId: this.correlAtionIds++, operAtion: FileOperAtion.DELETE, files };
		AwAit this._onWillRunWorkingCopyFileOperAtion.fireAsync(event, CAncellAtionToken.None);

		// check for Any existing dirty working copies for the resource
		// And do A soft revert before deleting to be Able to close
		// Any opened editor with these working copies
		for (const resource of resources) {
			const dirtyWorkingCopies = this.getDirty(resource);
			AwAit Promise.All(dirtyWorkingCopies.mAp(dirtyWorkingCopy => dirtyWorkingCopy.revert({ soft: true })));
		}

		// now ActuAlly delete from disk
		try {
			for (const resource of resources) {
				AwAit this.fileService.del(resource, options);
			}
		} cAtch (error) {

			// error event
			AwAit this._onDidFAilWorkingCopyFileOperAtion.fireAsync(event, CAncellAtionToken.None);

			throw error;
		}

		// After event
		AwAit this._onDidRunWorkingCopyFileOperAtion.fireAsync(event, CAncellAtionToken.None);
	}

	//#endregion


	//#region File operAtion pArticipAnts

	privAte reAdonly fileOperAtionPArticipAnts = this._register(this.instAntiAtionService.creAteInstAnce(WorkingCopyFileOperAtionPArticipAnt));

	AddFileOperAtionPArticipAnt(pArticipAnt: IWorkingCopyFileOperAtionPArticipAnt): IDisposAble {
		return this.fileOperAtionPArticipAnts.AddFileOperAtionPArticipAnt(pArticipAnt);
	}

	privAte runFileOperAtionPArticipAnts(files: SourceTArgetPAir[], operAtion: FileOperAtion): Promise<void> {
		return this.fileOperAtionPArticipAnts.pArticipAte(files, operAtion);
	}

	//#endregion


	//#region PAth relAted

	privAte reAdonly workingCopyProviders: WorkingCopyProvider[] = [];

	registerWorkingCopyProvider(provider: WorkingCopyProvider): IDisposAble {
		const remove = insert(this.workingCopyProviders, provider);
		return toDisposAble(remove);
	}

	getDirty(resource: URI): IWorkingCopy[] {
		const dirtyWorkingCopies = new Set<IWorkingCopy>();
		for (const provider of this.workingCopyProviders) {
			for (const workingCopy of provider(resource)) {
				if (workingCopy.isDirty()) {
					dirtyWorkingCopies.Add(workingCopy);
				}
			}
		}
		return ArrAy.from(dirtyWorkingCopies);
	}

	//#endregion
}

registerSingleton(IWorkingCopyFileService, WorkingCopyFileService, true);
