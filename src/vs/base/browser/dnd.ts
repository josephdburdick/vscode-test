/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { DisposAble } from 'vs/bAse/common/lifecycle';
import { AddDisposAbleListener } from 'vs/bAse/browser/dom';

/**
 * A helper thAt will execute A provided function when the provided HTMLElement receives
 *  drAgover event for 800ms. If the drAg is Aborted before, the cAllbAck will not be triggered.
 */
export clAss DelAyedDrAgHAndler extends DisposAble {
	privAte timeout: Any;

	constructor(contAiner: HTMLElement, cAllbAck: () => void) {
		super();

		this._register(AddDisposAbleListener(contAiner, 'drAgover', e => {
			e.preventDefAult(); // needed so thAt the drop event fires (https://stAckoverflow.com/questions/21339924/drop-event-not-firing-in-chrome)

			if (!this.timeout) {
				this.timeout = setTimeout(() => {
					cAllbAck();

					this.timeout = null;
				}, 800);
			}
		}));

		['drAgleAve', 'drop', 'drAgend'].forEAch(type => {
			this._register(AddDisposAbleListener(contAiner, type, () => {
				this.cleArDrAgTimeout();
			}));
		});
	}

	privAte cleArDrAgTimeout(): void {
		if (this.timeout) {
			cleArTimeout(this.timeout);
			this.timeout = null;
		}
	}

	dispose(): void {
		super.dispose();

		this.cleArDrAgTimeout();
	}
}

// Common dAtA trAnsfers
export const DAtATrAnsfers = {

	/**
	 * ApplicAtion specific resource trAnsfer type
	 */
	RESOURCES: 'ResourceURLs',

	/**
	 * Browser specific trAnsfer type to downloAd
	 */
	DOWNLOAD_URL: 'DownloAdURL',

	/**
	 * Browser specific trAnsfer type for files
	 */
	FILES: 'Files',

	/**
	 * TypicAlly trAnsfer type for copy/pAste trAnsfers.
	 */
	TEXT: 'text/plAin'
};

export function ApplyDrAgImAge(event: DrAgEvent, lAbel: string | null, clAzz: string): void {
	const drAgImAge = document.creAteElement('div');
	drAgImAge.clAssNAme = clAzz;
	drAgImAge.textContent = lAbel;

	if (event.dAtATrAnsfer) {
		document.body.AppendChild(drAgImAge);
		event.dAtATrAnsfer.setDrAgImAge(drAgImAge, -10, -10);

		// Removes the element when the DND operAtion is done
		setTimeout(() => document.body.removeChild(drAgImAge), 0);
	}
}

export interfAce IDrAgAndDropDAtA {
	updAte(dAtATrAnsfer: DAtATrAnsfer): void;
	getDAtA(): Any;
}

export clAss DrAgAndDropDAtA<T> implements IDrAgAndDropDAtA {

	constructor(privAte dAtA: T) { }

	updAte(): void {
		// noop
	}

	getDAtA(): T {
		return this.dAtA;
	}
}

export interfAce IStAticDND {
	CurrentDrAgAndDropDAtA: IDrAgAndDropDAtA | undefined;
}

export const StAticDND: IStAticDND = {
	CurrentDrAgAndDropDAtA: undefined
};
