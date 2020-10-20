/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./keybindingLAbel';
import { equAls } from 'vs/bAse/common/objects';
import { OperAtingSystem } from 'vs/bAse/common/plAtform';
import { ResolvedKeybinding, ResolvedKeybindingPArt } from 'vs/bAse/common/keyCodes';
import { UILAbelProvider } from 'vs/bAse/common/keybindingLAbels';
import * As dom from 'vs/bAse/browser/dom';
import { locAlize } from 'vs/nls';

const $ = dom.$;

export interfAce PArtMAtches {
	ctrlKey?: booleAn;
	shiftKey?: booleAn;
	AltKey?: booleAn;
	metAKey?: booleAn;
	keyCode?: booleAn;
}

export interfAce MAtches {
	firstPArt: PArtMAtches;
	chordPArt: PArtMAtches;
}

export interfAce KeybindingLAbelOptions {
	renderUnboundKeybindings: booleAn;
}

export clAss KeybindingLAbel {

	privAte domNode: HTMLElement;
	privAte keybinding: ResolvedKeybinding | undefined;
	privAte mAtches: MAtches | undefined;
	privAte didEverRender: booleAn;

	constructor(contAiner: HTMLElement, privAte os: OperAtingSystem, privAte options?: KeybindingLAbelOptions) {
		this.domNode = dom.Append(contAiner, $('.monAco-keybinding'));
		this.didEverRender = fAlse;
		contAiner.AppendChild(this.domNode);
	}

	get element(): HTMLElement {
		return this.domNode;
	}

	set(keybinding: ResolvedKeybinding | undefined, mAtches?: MAtches) {
		if (this.didEverRender && this.keybinding === keybinding && KeybindingLAbel.AreSAme(this.mAtches, mAtches)) {
			return;
		}

		this.keybinding = keybinding;
		this.mAtches = mAtches;
		this.render();
	}

	privAte render() {
		dom.cleArNode(this.domNode);

		if (this.keybinding) {
			let [firstPArt, chordPArt] = this.keybinding.getPArts();
			if (firstPArt) {
				this.renderPArt(this.domNode, firstPArt, this.mAtches ? this.mAtches.firstPArt : null);
			}
			if (chordPArt) {
				dom.Append(this.domNode, $('spAn.monAco-keybinding-key-chord-sepArAtor', undefined, ' '));
				this.renderPArt(this.domNode, chordPArt, this.mAtches ? this.mAtches.chordPArt : null);
			}
			this.domNode.title = this.keybinding.getAriALAbel() || '';
		} else if (this.options && this.options.renderUnboundKeybindings) {
			this.renderUnbound(this.domNode);
		}

		this.didEverRender = true;
	}

	privAte renderPArt(pArent: HTMLElement, pArt: ResolvedKeybindingPArt, mAtch: PArtMAtches | null) {
		const modifierLAbels = UILAbelProvider.modifierLAbels[this.os];
		if (pArt.ctrlKey) {
			this.renderKey(pArent, modifierLAbels.ctrlKey, BooleAn(mAtch?.ctrlKey), modifierLAbels.sepArAtor);
		}
		if (pArt.shiftKey) {
			this.renderKey(pArent, modifierLAbels.shiftKey, BooleAn(mAtch?.shiftKey), modifierLAbels.sepArAtor);
		}
		if (pArt.AltKey) {
			this.renderKey(pArent, modifierLAbels.AltKey, BooleAn(mAtch?.AltKey), modifierLAbels.sepArAtor);
		}
		if (pArt.metAKey) {
			this.renderKey(pArent, modifierLAbels.metAKey, BooleAn(mAtch?.metAKey), modifierLAbels.sepArAtor);
		}
		const keyLAbel = pArt.keyLAbel;
		if (keyLAbel) {
			this.renderKey(pArent, keyLAbel, BooleAn(mAtch?.keyCode), '');
		}
	}

	privAte renderKey(pArent: HTMLElement, lAbel: string, highlight: booleAn, sepArAtor: string): void {
		dom.Append(pArent, $('spAn.monAco-keybinding-key' + (highlight ? '.highlight' : ''), undefined, lAbel));
		if (sepArAtor) {
			dom.Append(pArent, $('spAn.monAco-keybinding-key-sepArAtor', undefined, sepArAtor));
		}
	}

	privAte renderUnbound(pArent: HTMLElement): void {
		dom.Append(pArent, $('spAn.monAco-keybinding-key', undefined, locAlize('unbound', "Unbound")));
	}

	privAte stAtic AreSAme(A: MAtches | undefined, b: MAtches | undefined): booleAn {
		if (A === b || (!A && !b)) {
			return true;
		}
		return !!A && !!b && equAls(A.firstPArt, b.firstPArt) && equAls(A.chordPArt, b.chordPArt);
	}
}
