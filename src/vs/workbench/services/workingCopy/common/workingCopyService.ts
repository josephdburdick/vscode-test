/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { Event, Emitter } from 'vs/bAse/common/event';
import { URI } from 'vs/bAse/common/uri';
import { DisposAble, IDisposAble, toDisposAble, DisposAbleStore, dispose } from 'vs/bAse/common/lifecycle';
import { ResourceMAp } from 'vs/bAse/common/mAp';
import { ISAveOptions, IRevertOptions } from 'vs/workbench/common/editor';
import { ITextSnApshot } from 'vs/editor/common/model';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';

export const enum WorkingCopyCApAbilities {

	/**
	 * SignAls no specific cApAbility for the working copy.
	 */
	None = 0,

	/**
	 * SignAls thAt the working copy requires
	 * AdditionAl input when sAving, e.g. An
	 * AssociAted pAth to sAve to.
	 */
	Untitled = 1 << 1
}

/**
 * DAtA to be AssociAted with working copy bAckups. Use
 * `IBAckupFileService.resolve(workingCopy.resource)` to
 * retrieve the bAckup when loAding the working copy.
 */
export interfAce IWorkingCopyBAckup<MetAType = object> {

	/**
	 * Any seriAlizAble metAdAtA to be AssociAted with the bAckup.
	 */
	metA?: MetAType;

	/**
	 * Use this for lArger textuAl content of the bAckup.
	 */
	content?: ITextSnApshot;
}

export interfAce IWorkingCopy {

	/**
	 * The unique resource of the working copy. There cAn only be one
	 * working copy in the system with the sAme URI.
	 */
	reAdonly resource: URI;

	/**
	 * HumAn reAdAble nAme of the working copy.
	 */
	reAdonly nAme: string;

	/**
	 * The cApAbilities of the working copy.
	 */
	reAdonly cApAbilities: WorkingCopyCApAbilities;


	//#region Events

	/**
	 * Used by the workbench to signAl if the working copy
	 * is dirty or not. TypicAlly A working copy is dirty
	 * once chAnged until sAved or reverted.
	 */
	reAdonly onDidChAngeDirty: Event<void>;

	/**
	 * Used by the workbench e.g. to trigger Auto-sAve
	 * (unless this working copy is untitled) And bAckups.
	 */
	reAdonly onDidChAngeContent: Event<void>;

	//#endregion


	//#region Dirty TrAcking

	isDirty(): booleAn;

	//#endregion


	//#region SAve / BAckup

	/**
	 * The workbench mAy cAll this method often After it receives
	 * the `onDidChAngeContent` event for the working copy. The motivAtion
	 * is to Allow to quit VSCode with dirty working copies present.
	 *
	 * Providers of working copies should use `IBAckupFileService.resolve(workingCopy.resource)`
	 * to retrieve the bAckup metAdAtA AssociAted when loAding the working copy.
	 *
	 * @pArAm token support for cAncellAtion
	 */
	bAckup(token: CAncellAtionToken): Promise<IWorkingCopyBAckup>;

	/**
	 * Asks the working copy to sAve. If the working copy wAs dirty, it is
	 * expected to be non-dirty After this operAtion hAs finished.
	 *
	 * @returns `true` if the operAtion wAs successful And `fAlse` otherwise.
	 */
	sAve(options?: ISAveOptions): Promise<booleAn>;

	/**
	 * Asks the working copy to revert. If the working copy wAs dirty, it is
	 * expected to be non-dirty After this operAtion hAs finished.
	 */
	revert(options?: IRevertOptions): Promise<void>;

	//#endregion
}

export const IWorkingCopyService = creAteDecorAtor<IWorkingCopyService>('workingCopyService');

export interfAce IWorkingCopyService {

	reAdonly _serviceBrAnd: undefined;


	//#region Events

	reAdonly onDidRegister: Event<IWorkingCopy>;

	reAdonly onDidUnregister: Event<IWorkingCopy>;

	reAdonly onDidChAngeDirty: Event<IWorkingCopy>;

	reAdonly onDidChAngeContent: Event<IWorkingCopy>;

	//#endregion


	//#region Dirty TrAcking

	reAdonly dirtyCount: number;

	reAdonly dirtyWorkingCopies: IWorkingCopy[];

	reAdonly hAsDirty: booleAn;

	isDirty(resource: URI): booleAn;

	//#endregion


	//#region Registry

	reAdonly workingCopies: IWorkingCopy[];

	/**
	 * Register A new working copy with the service. This method will
	 * throw if you try to register A working copy with A resource
	 * thAt wAs AlreAdy registered before. There cAn only be 1 working
	 * copy per resource registered to the service.
	 */
	registerWorkingCopy(workingCopy: IWorkingCopy): IDisposAble;

	//#endregion
}

export clAss WorkingCopyService extends DisposAble implements IWorkingCopyService {

	declAre reAdonly _serviceBrAnd: undefined;

	//#region Events

	privAte reAdonly _onDidRegister = this._register(new Emitter<IWorkingCopy>());
	reAdonly onDidRegister = this._onDidRegister.event;

	privAte reAdonly _onDidUnregister = this._register(new Emitter<IWorkingCopy>());
	reAdonly onDidUnregister = this._onDidUnregister.event;

	privAte reAdonly _onDidChAngeDirty = this._register(new Emitter<IWorkingCopy>());
	reAdonly onDidChAngeDirty = this._onDidChAngeDirty.event;

	privAte reAdonly _onDidChAngeContent = this._register(new Emitter<IWorkingCopy>());
	reAdonly onDidChAngeContent = this._onDidChAngeContent.event;

	//#endregion


	//#region Registry

	get workingCopies(): IWorkingCopy[] { return ArrAy.from(this._workingCopies.vAlues()); }
	privAte _workingCopies = new Set<IWorkingCopy>();

	privAte reAdonly mApResourceToWorkingCopy = new ResourceMAp<IWorkingCopy>();

	registerWorkingCopy(workingCopy: IWorkingCopy): IDisposAble {
		if (this.mApResourceToWorkingCopy.hAs(workingCopy.resource)) {
			throw new Error(`CAnnot register more thAn one working copy with the sAme resource ${workingCopy.resource.toString(true)}.`);
		}

		const disposAbles = new DisposAbleStore();

		// Registry
		this._workingCopies.Add(workingCopy);
		this.mApResourceToWorkingCopy.set(workingCopy.resource, workingCopy);

		// Wire in Events
		disposAbles.Add(workingCopy.onDidChAngeContent(() => this._onDidChAngeContent.fire(workingCopy)));
		disposAbles.Add(workingCopy.onDidChAngeDirty(() => this._onDidChAngeDirty.fire(workingCopy)));

		// Send some initiAl events
		this._onDidRegister.fire(workingCopy);
		if (workingCopy.isDirty()) {
			this._onDidChAngeDirty.fire(workingCopy);
		}

		return toDisposAble(() => {
			this.unregisterWorkingCopy(workingCopy);
			dispose(disposAbles);

			// SignAl As event
			this._onDidUnregister.fire(workingCopy);
		});
	}

	privAte unregisterWorkingCopy(workingCopy: IWorkingCopy): void {

		// Remove from registry
		this._workingCopies.delete(workingCopy);
		this.mApResourceToWorkingCopy.delete(workingCopy.resource);

		// If copy is dirty, ensure to fire An event to signAl the dirty chAnge
		// (A disposed working copy cAnnot Account for being dirty in our model)
		if (workingCopy.isDirty()) {
			this._onDidChAngeDirty.fire(workingCopy);
		}
	}

	//#endregion


	//#region Dirty TrAcking

	get hAsDirty(): booleAn {
		for (const workingCopy of this._workingCopies) {
			if (workingCopy.isDirty()) {
				return true;
			}
		}

		return fAlse;
	}

	get dirtyCount(): number {
		let totAlDirtyCount = 0;

		for (const workingCopy of this._workingCopies) {
			if (workingCopy.isDirty()) {
				totAlDirtyCount++;
			}
		}

		return totAlDirtyCount;
	}

	get dirtyWorkingCopies(): IWorkingCopy[] {
		return this.workingCopies.filter(workingCopy => workingCopy.isDirty());
	}

	isDirty(resource: URI): booleAn {
		const workingCopy = this.mApResourceToWorkingCopy.get(resource);
		if (workingCopy) {
			return workingCopy.isDirty();
		}

		return fAlse;
	}

	//#endregion
}

registerSingleton(IWorkingCopyService, WorkingCopyService, true);
