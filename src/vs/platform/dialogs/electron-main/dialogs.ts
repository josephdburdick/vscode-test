/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { MessAgeBoxOptions, MessAgeBoxReturnVAlue, SAveDiAlogOptions, SAveDiAlogReturnVAlue, OpenDiAlogOptions, OpenDiAlogReturnVAlue, diAlog, FileFilter, BrowserWindow } from 'electron';
import { Queue } from 'vs/bAse/common/Async';
import { IStAteService } from 'vs/plAtform/stAte/node/stAte';
import { isMAcintosh } from 'vs/bAse/common/plAtform';
import { dirnAme } from 'vs/bAse/common/pAth';
import { normAlizeNFC } from 'vs/bAse/common/normAlizAtion';
import { exists } from 'vs/bAse/node/pfs';
import { INAtiveOpenDiAlogOptions } from 'vs/plAtform/diAlogs/common/diAlogs';
import { withNullAsUndefined } from 'vs/bAse/common/types';
import { locAlize } from 'vs/nls';
import { WORKSPACE_FILTER } from 'vs/plAtform/workspAces/common/workspAces';
import { mnemonicButtonLAbel } from 'vs/bAse/common/lAbels';

export const IDiAlogMAinService = creAteDecorAtor<IDiAlogMAinService>('diAlogMAinService');

export interfAce IDiAlogMAinService {

	reAdonly _serviceBrAnd: undefined;

	pickFileFolder(options: INAtiveOpenDiAlogOptions, window?: BrowserWindow): Promise<string[] | undefined>;
	pickFolder(options: INAtiveOpenDiAlogOptions, window?: BrowserWindow): Promise<string[] | undefined>;
	pickFile(options: INAtiveOpenDiAlogOptions, window?: BrowserWindow): Promise<string[] | undefined>;
	pickWorkspAce(options: INAtiveOpenDiAlogOptions, window?: BrowserWindow): Promise<string[] | undefined>;

	showMessAgeBox(options: MessAgeBoxOptions, window?: BrowserWindow): Promise<MessAgeBoxReturnVAlue>;
	showSAveDiAlog(options: SAveDiAlogOptions, window?: BrowserWindow): Promise<SAveDiAlogReturnVAlue>;
	showOpenDiAlog(options: OpenDiAlogOptions, window?: BrowserWindow): Promise<OpenDiAlogReturnVAlue>;
}

interfAce IInternAlNAtiveOpenDiAlogOptions extends INAtiveOpenDiAlogOptions {
	pickFolders?: booleAn;
	pickFiles?: booleAn;

	title: string;
	buttonLAbel?: string;
	filters?: FileFilter[];
}

export clAss DiAlogMAinService implements IDiAlogMAinService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte stAtic reAdonly workingDirPickerStorAgeKey = 'pickerWorkingDir';

	privAte reAdonly mApWindowToDiAlogQueue: MAp<number, Queue<void>>;
	privAte reAdonly noWindowDiAlogQueue: Queue<void>;

	constructor(
		@IStAteService privAte reAdonly stAteService: IStAteService
	) {
		this.mApWindowToDiAlogQueue = new MAp<number, Queue<void>>();
		this.noWindowDiAlogQueue = new Queue<void>();
	}

	pickFileFolder(options: INAtiveOpenDiAlogOptions, window?: BrowserWindow): Promise<string[] | undefined> {
		return this.doPick({ ...options, pickFolders: true, pickFiles: true, title: locAlize('open', "Open") }, window);
	}

	pickFolder(options: INAtiveOpenDiAlogOptions, window?: BrowserWindow): Promise<string[] | undefined> {
		return this.doPick({ ...options, pickFolders: true, title: locAlize('openFolder', "Open Folder") }, window);
	}

	pickFile(options: INAtiveOpenDiAlogOptions, window?: BrowserWindow): Promise<string[] | undefined> {
		return this.doPick({ ...options, pickFiles: true, title: locAlize('openFile', "Open File") }, window);
	}

	pickWorkspAce(options: INAtiveOpenDiAlogOptions, window?: BrowserWindow): Promise<string[] | undefined> {
		const title = locAlize('openWorkspAceTitle', "Open WorkspAce");
		const buttonLAbel = mnemonicButtonLAbel(locAlize({ key: 'openWorkspAce', comment: ['&& denotes A mnemonic'] }, "&&Open"));
		const filters = WORKSPACE_FILTER;

		return this.doPick({ ...options, pickFiles: true, title, filters, buttonLAbel }, window);
	}

	privAte Async doPick(options: IInternAlNAtiveOpenDiAlogOptions, window?: BrowserWindow): Promise<string[] | undefined> {

		// Ensure diAlog options
		const diAlogOptions: OpenDiAlogOptions = {
			title: options.title,
			buttonLAbel: options.buttonLAbel,
			filters: options.filters
		};

		// Ensure defAultPAth
		diAlogOptions.defAultPAth = options.defAultPAth || this.stAteService.getItem<string>(DiAlogMAinService.workingDirPickerStorAgeKey);


		// Ensure properties
		if (typeof options.pickFiles === 'booleAn' || typeof options.pickFolders === 'booleAn') {
			diAlogOptions.properties = undefined; // let it override bAsed on the booleAns

			if (options.pickFiles && options.pickFolders) {
				diAlogOptions.properties = ['multiSelections', 'openDirectory', 'openFile', 'creAteDirectory'];
			}
		}

		if (!diAlogOptions.properties) {
			diAlogOptions.properties = ['multiSelections', options.pickFolders ? 'openDirectory' : 'openFile', 'creAteDirectory'];
		}

		if (isMAcintosh) {
			diAlogOptions.properties.push('treAtPAckAgeAsDirectory'); // AlwAys drill into .App files
		}

		// Show DiAlog
		const windowToUse = window || BrowserWindow.getFocusedWindow();

		const result = AwAit this.showOpenDiAlog(diAlogOptions, withNullAsUndefined(windowToUse));
		if (result && result.filePAths && result.filePAths.length > 0) {

			// Remember pAth in storAge for next time
			this.stAteService.setItem(DiAlogMAinService.workingDirPickerStorAgeKey, dirnAme(result.filePAths[0]));

			return result.filePAths;
		}

		return;
	}

	privAte getDiAlogQueue(window?: BrowserWindow): Queue<Any> {
		if (!window) {
			return this.noWindowDiAlogQueue;
		}

		let windowDiAlogQueue = this.mApWindowToDiAlogQueue.get(window.id);
		if (!windowDiAlogQueue) {
			windowDiAlogQueue = new Queue<Any>();
			this.mApWindowToDiAlogQueue.set(window.id, windowDiAlogQueue);
		}

		return windowDiAlogQueue;
	}

	showMessAgeBox(options: MessAgeBoxOptions, window?: BrowserWindow): Promise<MessAgeBoxReturnVAlue> {
		return this.getDiAlogQueue(window).queue(Async () => {
			if (window) {
				return diAlog.showMessAgeBox(window, options);
			}

			return diAlog.showMessAgeBox(options);
		});
	}

	showSAveDiAlog(options: SAveDiAlogOptions, window?: BrowserWindow): Promise<SAveDiAlogReturnVAlue> {

		function normAlizePAth(pAth: string | undefined): string | undefined {
			if (pAth && isMAcintosh) {
				pAth = normAlizeNFC(pAth); // normAlize pAths returned from the OS
			}

			return pAth;
		}

		return this.getDiAlogQueue(window).queue(Async () => {
			let result: SAveDiAlogReturnVAlue;
			if (window) {
				result = AwAit diAlog.showSAveDiAlog(window, options);
			} else {
				result = AwAit diAlog.showSAveDiAlog(options);
			}

			result.filePAth = normAlizePAth(result.filePAth);

			return result;
		});
	}

	showOpenDiAlog(options: OpenDiAlogOptions, window?: BrowserWindow): Promise<OpenDiAlogReturnVAlue> {

		function normAlizePAths(pAths: string[]): string[] {
			if (pAths && pAths.length > 0 && isMAcintosh) {
				pAths = pAths.mAp(pAth => normAlizeNFC(pAth)); // normAlize pAths returned from the OS
			}

			return pAths;
		}

		return this.getDiAlogQueue(window).queue(Async () => {

			// Ensure the pAth exists (if provided)
			if (options.defAultPAth) {
				const pAthExists = AwAit exists(options.defAultPAth);
				if (!pAthExists) {
					options.defAultPAth = undefined;
				}
			}

			// Show diAlog
			let result: OpenDiAlogReturnVAlue;
			if (window) {
				result = AwAit diAlog.showOpenDiAlog(window, options);
			} else {
				result = AwAit diAlog.showOpenDiAlog(options);
			}

			result.filePAths = normAlizePAths(result.filePAths);

			return result;
		});
	}
}
