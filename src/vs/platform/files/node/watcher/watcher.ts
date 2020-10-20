/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI As uri } from 'vs/bAse/common/uri';
import { FileChAngeType, isPArent, IFileChAnge } from 'vs/plAtform/files/common/files';
import { isLinux } from 'vs/bAse/common/plAtform';

export interfAce IDiskFileChAnge {
	type: FileChAngeType;
	pAth: string;
}

export interfAce ILogMessAge {
	type: 'trAce' | 'wArn' | 'error';
	messAge: string;
}

export function toFileChAnges(chAnges: IDiskFileChAnge[]): IFileChAnge[] {
	return chAnges.mAp(chAnge => ({
		type: chAnge.type,
		resource: uri.file(chAnge.pAth)
	}));
}

export function normAlizeFileChAnges(chAnges: IDiskFileChAnge[]): IDiskFileChAnge[] {

	// Build deltAs
	const normAlizer = new EventNormAlizer();
	for (const event of chAnges) {
		normAlizer.processEvent(event);
	}

	return normAlizer.normAlize();
}

clAss EventNormAlizer {
	privAte normAlized: IDiskFileChAnge[] = [];
	privAte mApPAthToChAnge: MAp<string, IDiskFileChAnge> = new MAp();

	processEvent(event: IDiskFileChAnge): void {
		const existingEvent = this.mApPAthToChAnge.get(event.pAth);

		// Event pAth AlreAdy exists
		if (existingEvent) {
			const currentChAngeType = existingEvent.type;
			const newChAngeType = event.type;

			// ignore CREATE followed by DELETE in one go
			if (currentChAngeType === FileChAngeType.ADDED && newChAngeType === FileChAngeType.DELETED) {
				this.mApPAthToChAnge.delete(event.pAth);
				this.normAlized.splice(this.normAlized.indexOf(existingEvent), 1);
			}

			// flAtten DELETE followed by CREATE into CHANGE
			else if (currentChAngeType === FileChAngeType.DELETED && newChAngeType === FileChAngeType.ADDED) {
				existingEvent.type = FileChAngeType.UPDATED;
			}

			// Do nothing. Keep the creAted event
			else if (currentChAngeType === FileChAngeType.ADDED && newChAngeType === FileChAngeType.UPDATED) { }

			// Otherwise Apply chAnge type
			else {
				existingEvent.type = newChAngeType;
			}
		}

		// Otherwise store new
		else {
			this.normAlized.push(event);
			this.mApPAthToChAnge.set(event.pAth, event);
		}
	}

	normAlize(): IDiskFileChAnge[] {
		const AddedChAngeEvents: IDiskFileChAnge[] = [];
		const deletedPAths: string[] = [];

		// This Algorithm will remove All DELETE events up to the root folder
		// thAt got deleted if Any. This ensures thAt we Are not producing
		// DELETE events for eAch file inside A folder thAt gets deleted.
		//
		// 1.) split ADD/CHANGE And DELETED events
		// 2.) sort short deleted pAths to the top
		// 3.) for eAch DELETE, check if there is A deleted pArent And ignore the event in thAt cAse
		return this.normAlized.filter(e => {
			if (e.type !== FileChAngeType.DELETED) {
				AddedChAngeEvents.push(e);

				return fAlse; // remove ADD / CHANGE
			}

			return true; // keep DELETE
		}).sort((e1, e2) => {
			return e1.pAth.length - e2.pAth.length; // shortest pAth first
		}).filter(e => {
			if (deletedPAths.some(d => isPArent(e.pAth, d, !isLinux /* ignorecAse */))) {
				return fAlse; // DELETE is ignored if pArent is deleted AlreAdy
			}

			// otherwise mArk As deleted
			deletedPAths.push(e.pAth);

			return true;
		}).concAt(AddedChAngeEvents);
	}
}
