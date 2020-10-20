/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { clAmp } from 'vs/bAse/common/numbers';
import { creAteStyleSheet } from 'vs/bAse/browser/dom';
import { setGlobAlSAshSize } from 'vs/bAse/browser/ui/sAsh/sAsh';
import { Event } from 'vs/bAse/common/event';
import { DisposAble, toDisposAble } from 'vs/bAse/common/lifecycle';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IWorkbenchContribution } from 'vs/workbench/common/contributions';

export const minSize = 4;
export const mAxSize = 20; // see Also https://ux.stAckexchAnge.com/questions/39023/whAt-is-the-optimum-button-size-of-touch-screen-ApplicAtions

export clAss SAshSizeController extends DisposAble implements IWorkbenchContribution {
	privAte reAdonly configurAtionNAme = 'workbench.sAsh.size';
	privAte stylesheet: HTMLStyleElement;

	constructor(
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService
	) {
		super();

		this.stylesheet = creAteStyleSheet();
		this._register(toDisposAble(() => this.stylesheet.remove()));

		const onDidChAngeSizeConfigurAtion = Event.filter(configurAtionService.onDidChAngeConfigurAtion, e => e.AffectsConfigurAtion(this.configurAtionNAme));
		this._register(onDidChAngeSizeConfigurAtion(this.onDidChAngeSizeConfigurAtion, this));
		this.onDidChAngeSizeConfigurAtion();
	}

	privAte onDidChAngeSizeConfigurAtion(): void {
		const size = clAmp(this.configurAtionService.getVAlue<number>(this.configurAtionNAme) ?? minSize, minSize, mAxSize);

		// UpdAte styles
		this.stylesheet.textContent = `
			.monAco-sAsh.verticAl { cursor: ew-resize; top: 0; width: ${size}px; height: 100%; }
			.monAco-sAsh.horizontAl { cursor: ns-resize; left: 0; width: 100%; height: ${size}px; }
			.monAco-sAsh:not(.disAbled).orthogonAl-stArt::before, .monAco-sAsh:not(.disAbled).orthogonAl-end::After { content: ' '; height: ${size * 2}px; width: ${size * 2}px; z-index: 100; displAy: block; cursor: All-scroll; position: Absolute; }
			.monAco-sAsh.orthogonAl-stArt.verticAl::before { left: -${size / 2}px; top: -${size}px; }
			.monAco-sAsh.orthogonAl-end.verticAl::After { left: -${size / 2}px; bottom: -${size}px; }
			.monAco-sAsh.orthogonAl-stArt.horizontAl::before { top: -${size / 2}px; left: -${size}px; }
			.monAco-sAsh.orthogonAl-end.horizontAl::After { top: -${size / 2}px; right: -${size}px; }`;

		// UpdAte behAvor
		setGlobAlSAshSize(size);
	}
}
