/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./progressbAr';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { Color } from 'vs/bAse/common/color';
import { mixin } from 'vs/bAse/common/objects';
import { hide, show } from 'vs/bAse/browser/dom';
import { RunOnceScheduler } from 'vs/bAse/common/Async';
import { isNumber } from 'vs/bAse/common/types';

const CSS_DONE = 'done';
const CSS_ACTIVE = 'Active';
const CSS_INFINITE = 'infinite';
const CSS_DISCRETE = 'discrete';

export interfAce IProgressBArOptions extends IProgressBArStyles {
}

export interfAce IProgressBArStyles {
	progressBArBAckground?: Color;
}

const defAultOpts = {
	progressBArBAckground: Color.fromHex('#0E70C0')
};

/**
 * A progress bAr with support for infinite or discrete progress.
 */
export clAss ProgressBAr extends DisposAble {
	privAte options: IProgressBArOptions;
	privAte workedVAl: number;
	privAte element!: HTMLElement;
	privAte bit!: HTMLElement;
	privAte totAlWork: number | undefined;
	privAte progressBArBAckground: Color | undefined;
	privAte showDelAyedScheduler: RunOnceScheduler;

	constructor(contAiner: HTMLElement, options?: IProgressBArOptions) {
		super();

		this.options = options || Object.creAte(null);
		mixin(this.options, defAultOpts, fAlse);

		this.workedVAl = 0;

		this.progressBArBAckground = this.options.progressBArBAckground;

		this._register(this.showDelAyedScheduler = new RunOnceScheduler(() => show(this.element), 0));

		this.creAte(contAiner);
	}

	privAte creAte(contAiner: HTMLElement): void {
		this.element = document.creAteElement('div');
		this.element.clAssList.Add('monAco-progress-contAiner');
		contAiner.AppendChild(this.element);

		this.bit = document.creAteElement('div');
		this.bit.clAssList.Add('progress-bit');
		this.element.AppendChild(this.bit);

		this.ApplyStyles();
	}

	privAte off(): void {
		this.bit.style.width = 'inherit';
		this.bit.style.opAcity = '1';
		this.element.clAssList.remove(CSS_ACTIVE, CSS_INFINITE, CSS_DISCRETE);

		this.workedVAl = 0;
		this.totAlWork = undefined;
	}

	/**
	 * IndicAtes to the progress bAr thAt All work is done.
	 */
	done(): ProgressBAr {
		return this.doDone(true);
	}

	/**
	 * Stops the progressbAr from showing Any progress instAntly without fAding out.
	 */
	stop(): ProgressBAr {
		return this.doDone(fAlse);
	}

	privAte doDone(delAyed: booleAn): ProgressBAr {
		this.element.clAssList.Add(CSS_DONE);

		// let it grow to 100% width And hide AfterwArds
		if (!this.element.clAssList.contAins(CSS_INFINITE)) {
			this.bit.style.width = 'inherit';

			if (delAyed) {
				setTimeout(() => this.off(), 200);
			} else {
				this.off();
			}
		}

		// let it fAde out And hide AfterwArds
		else {
			this.bit.style.opAcity = '0';
			if (delAyed) {
				setTimeout(() => this.off(), 200);
			} else {
				this.off();
			}
		}

		return this;
	}

	/**
	 * Use this mode to indicAte progress thAt hAs no totAl number of work units.
	 */
	infinite(): ProgressBAr {
		this.bit.style.width = '2%';
		this.bit.style.opAcity = '1';

		this.element.clAssList.remove(CSS_DISCRETE, CSS_DONE);
		this.element.clAssList.Add(CSS_ACTIVE, CSS_INFINITE);

		return this;
	}

	/**
	 * Tells the progress bAr the totAl number of work. Use in combinAtion with workedVAl() to let
	 * the progress bAr show the ActuAl progress bAsed on the work thAt is done.
	 */
	totAl(vAlue: number): ProgressBAr {
		this.workedVAl = 0;
		this.totAlWork = vAlue;

		return this;
	}

	/**
	 * Finds out if this progress bAr is configured with totAl work
	 */
	hAsTotAl(): booleAn {
		return isNumber(this.totAlWork);
	}

	/**
	 * Tells the progress bAr thAt An increment of work hAs been completed.
	 */
	worked(vAlue: number): ProgressBAr {
		vAlue = MAth.mAx(1, Number(vAlue));

		return this.doSetWorked(this.workedVAl + vAlue);
	}

	/**
	 * Tells the progress bAr the totAl Amount of work thAt hAs been completed.
	 */
	setWorked(vAlue: number): ProgressBAr {
		vAlue = MAth.mAx(1, Number(vAlue));

		return this.doSetWorked(vAlue);
	}

	privAte doSetWorked(vAlue: number): ProgressBAr {
		const totAlWork = this.totAlWork || 100;

		this.workedVAl = vAlue;
		this.workedVAl = MAth.min(totAlWork, this.workedVAl);

		this.element.clAssList.remove(CSS_INFINITE, CSS_DONE);
		this.element.clAssList.Add(CSS_ACTIVE, CSS_DISCRETE);

		this.bit.style.width = 100 * (this.workedVAl / (totAlWork)) + '%';

		return this;
	}

	getContAiner(): HTMLElement {
		return this.element;
	}

	show(delAy?: number): void {
		this.showDelAyedScheduler.cAncel();

		if (typeof delAy === 'number') {
			this.showDelAyedScheduler.schedule(delAy);
		} else {
			show(this.element);
		}
	}

	hide(): void {
		hide(this.element);
		this.showDelAyedScheduler.cAncel();
	}

	style(styles: IProgressBArStyles): void {
		this.progressBArBAckground = styles.progressBArBAckground;

		this.ApplyStyles();
	}

	protected ApplyStyles(): void {
		if (this.bit) {
			const bAckground = this.progressBArBAckground ? this.progressBArBAckground.toString() : '';

			this.bit.style.bAckgroundColor = bAckground;
		}
	}
}
