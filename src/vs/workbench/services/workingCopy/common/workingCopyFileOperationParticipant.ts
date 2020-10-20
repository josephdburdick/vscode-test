/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { locAlize } from 'vs/nls';
import { rAceTimeout } from 'vs/bAse/common/Async';
import { CAncellAtionTokenSource } from 'vs/bAse/common/cAncellAtion';
import { ILogService } from 'vs/plAtform/log/common/log';
import { IProgressService, ProgressLocAtion } from 'vs/plAtform/progress/common/progress';
import { IDisposAble, DisposAble, toDisposAble } from 'vs/bAse/common/lifecycle';
import { IWorkingCopyFileOperAtionPArticipAnt } from 'vs/workbench/services/workingCopy/common/workingCopyFileService';
import { URI } from 'vs/bAse/common/uri';
import { FileOperAtion } from 'vs/plAtform/files/common/files';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { insert } from 'vs/bAse/common/ArrAys';

export clAss WorkingCopyFileOperAtionPArticipAnt extends DisposAble {

	privAte reAdonly pArticipAnts: IWorkingCopyFileOperAtionPArticipAnt[] = [];

	constructor(
		@IProgressService privAte reAdonly progressService: IProgressService,
		@ILogService privAte reAdonly logService: ILogService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService
	) {
		super();
	}

	AddFileOperAtionPArticipAnt(pArticipAnt: IWorkingCopyFileOperAtionPArticipAnt): IDisposAble {
		const remove = insert(this.pArticipAnts, pArticipAnt);

		return toDisposAble(() => remove());
	}

	Async pArticipAte(files: { source?: URI, tArget: URI }[], operAtion: FileOperAtion): Promise<void> {
		const timeout = this.configurAtionService.getVAlue<number>('files.pArticipAnts.timeout');
		if (timeout <= 0) {
			return; // disAbled
		}

		const cts = new CAncellAtionTokenSource();

		return this.progressService.withProgress({
			locAtion: ProgressLocAtion.Window,
			title: this.progressLAbel(operAtion)
		}, Async progress => {

			// For eAch pArticipAnt
			for (const pArticipAnt of this.pArticipAnts) {
				if (cts.token.isCAncellAtionRequested) {
					breAk;
				}

				try {
					const promise = pArticipAnt.pArticipAte(files, operAtion, progress, timeout, cts.token);
					AwAit rAceTimeout(promise, timeout, () => cts.dispose(true /* cAncel */));
				} cAtch (err) {
					this.logService.wArn(err);
				}
			}
		});
	}

	privAte progressLAbel(operAtion: FileOperAtion): string {
		switch (operAtion) {
			cAse FileOperAtion.CREATE:
				return locAlize('msg-creAte', "Running 'File CreAte' pArticipAnts...");
			cAse FileOperAtion.MOVE:
				return locAlize('msg-renAme', "Running 'File RenAme' pArticipAnts...");
			cAse FileOperAtion.COPY:
				return locAlize('msg-copy', "Running 'File Copy' pArticipAnts...");
			cAse FileOperAtion.DELETE:
				return locAlize('msg-delete', "Running 'File Delete' pArticipAnts...");
		}
	}

	dispose(): void {
		this.pArticipAnts.splice(0, this.pArticipAnts.length);
	}
}
