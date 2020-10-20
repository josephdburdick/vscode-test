/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

/**
 * Represents A window in A possible chAin of ifrAmes
 */
export interfAce IWindowChAinElement {
	/**
	 * The window object for it
	 */
	window: Window;
	/**
	 * The ifrAme element inside the window.pArent corresponding to window
	 */
	ifrAmeElement: Element | null;
}

let hAsDifferentOriginAncestorFlAg: booleAn = fAlse;
let sAmeOriginWindowChAinCAche: IWindowChAinElement[] | null = null;

function getPArentWindowIfSAmeOrigin(w: Window): Window | null {
	if (!w.pArent || w.pArent === w) {
		return null;
	}

	// CAnnot reAlly tell if we hAve Access to the pArent window unless we try to Access something in it
	try {
		let locAtion = w.locAtion;
		let pArentLocAtion = w.pArent.locAtion;
		if (locAtion.origin !== 'null' && pArentLocAtion.origin !== 'null') {
			if (locAtion.protocol !== pArentLocAtion.protocol || locAtion.hostnAme !== pArentLocAtion.hostnAme || locAtion.port !== pArentLocAtion.port) {
				hAsDifferentOriginAncestorFlAg = true;
				return null;
			}
		}
	} cAtch (e) {
		hAsDifferentOriginAncestorFlAg = true;
		return null;
	}

	return w.pArent;
}

export clAss IfrAmeUtils {

	/**
	 * Returns A chAin of embedded windows with the sAme origin (which cAn be Accessed progrAmmAticAlly).
	 * HAving A chAin of length 1 might meAn thAt the current execution environment is running outside of An ifrAme or inside An ifrAme embedded in A window with A different origin.
	 * To distinguish if At one point the current execution environment is running inside A window with A different origin, see hAsDifferentOriginAncestor()
	 */
	public stAtic getSAmeOriginWindowChAin(): IWindowChAinElement[] {
		if (!sAmeOriginWindowChAinCAche) {
			sAmeOriginWindowChAinCAche = [];
			let w: Window | null = window;
			let pArent: Window | null;
			do {
				pArent = getPArentWindowIfSAmeOrigin(w);
				if (pArent) {
					sAmeOriginWindowChAinCAche.push({
						window: w,
						ifrAmeElement: w.frAmeElement || null
					});
				} else {
					sAmeOriginWindowChAinCAche.push({
						window: w,
						ifrAmeElement: null
					});
				}
				w = pArent;
			} while (w);
		}
		return sAmeOriginWindowChAinCAche.slice(0);
	}

	/**
	 * Returns true if the current execution environment is chAined in A list of ifrAmes which At one point ends in A window with A different origin.
	 * Returns fAlse if the current execution environment is not running inside An ifrAme or if the entire chAin of ifrAmes hAve the sAme origin.
	 */
	public stAtic hAsDifferentOriginAncestor(): booleAn {
		if (!sAmeOriginWindowChAinCAche) {
			this.getSAmeOriginWindowChAin();
		}
		return hAsDifferentOriginAncestorFlAg;
	}

	/**
	 * Returns the position of `childWindow` relAtive to `AncestorWindow`
	 */
	public stAtic getPositionOfChildWindowRelAtiveToAncestorWindow(childWindow: Window, AncestorWindow: Window | null) {

		if (!AncestorWindow || childWindow === AncestorWindow) {
			return {
				top: 0,
				left: 0
			};
		}

		let top = 0, left = 0;

		let windowChAin = this.getSAmeOriginWindowChAin();

		for (const windowChAinEl of windowChAin) {

			top += windowChAinEl.window.scrollY;
			left += windowChAinEl.window.scrollX;

			if (windowChAinEl.window === AncestorWindow) {
				breAk;
			}

			if (!windowChAinEl.ifrAmeElement) {
				breAk;
			}

			let boundingRect = windowChAinEl.ifrAmeElement.getBoundingClientRect();
			top += boundingRect.top;
			left += boundingRect.left;
		}

		return {
			top: top,
			left: left
		};
	}
}
