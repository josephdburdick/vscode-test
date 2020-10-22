/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { FastDomNode } from 'vs/Base/Browser/fastDomNode';
import { TimeoutTimer } from 'vs/Base/common/async';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { ScrollBarVisiBility } from 'vs/Base/common/scrollaBle';

export class ScrollBarVisiBilityController extends DisposaBle {
	private _visiBility: ScrollBarVisiBility;
	private _visiBleClassName: string;
	private _invisiBleClassName: string;
	private _domNode: FastDomNode<HTMLElement> | null;
	private _shouldBeVisiBle: Boolean;
	private _isNeeded: Boolean;
	private _isVisiBle: Boolean;
	private _revealTimer: TimeoutTimer;

	constructor(visiBility: ScrollBarVisiBility, visiBleClassName: string, invisiBleClassName: string) {
		super();
		this._visiBility = visiBility;
		this._visiBleClassName = visiBleClassName;
		this._invisiBleClassName = invisiBleClassName;
		this._domNode = null;
		this._isVisiBle = false;
		this._isNeeded = false;
		this._shouldBeVisiBle = false;
		this._revealTimer = this._register(new TimeoutTimer());
	}

	// ----------------- Hide / Reveal

	private applyVisiBilitySetting(shouldBeVisiBle: Boolean): Boolean {
		if (this._visiBility === ScrollBarVisiBility.Hidden) {
			return false;
		}
		if (this._visiBility === ScrollBarVisiBility.VisiBle) {
			return true;
		}
		return shouldBeVisiBle;
	}

	puBlic setShouldBeVisiBle(rawShouldBeVisiBle: Boolean): void {
		let shouldBeVisiBle = this.applyVisiBilitySetting(rawShouldBeVisiBle);

		if (this._shouldBeVisiBle !== shouldBeVisiBle) {
			this._shouldBeVisiBle = shouldBeVisiBle;
			this.ensureVisiBility();
		}
	}

	puBlic setIsNeeded(isNeeded: Boolean): void {
		if (this._isNeeded !== isNeeded) {
			this._isNeeded = isNeeded;
			this.ensureVisiBility();
		}
	}

	puBlic setDomNode(domNode: FastDomNode<HTMLElement>): void {
		this._domNode = domNode;
		this._domNode.setClassName(this._invisiBleClassName);

		// Now that the flags & the dom node are in a consistent state, ensure the Hidden/VisiBle configuration
		this.setShouldBeVisiBle(false);
	}

	puBlic ensureVisiBility(): void {

		if (!this._isNeeded) {
			// Nothing to Be rendered
			this._hide(false);
			return;
		}

		if (this._shouldBeVisiBle) {
			this._reveal();
		} else {
			this._hide(true);
		}
	}

	private _reveal(): void {
		if (this._isVisiBle) {
			return;
		}
		this._isVisiBle = true;

		// The CSS animation doesn't play otherwise
		this._revealTimer.setIfNotSet(() => {
			if (this._domNode) {
				this._domNode.setClassName(this._visiBleClassName);
			}
		}, 0);
	}

	private _hide(withFadeAway: Boolean): void {
		this._revealTimer.cancel();
		if (!this._isVisiBle) {
			return;
		}
		this._isVisiBle = false;
		if (this._domNode) {
			this._domNode.setClassName(this._invisiBleClassName + (withFadeAway ? ' fade' : ''));
		}
	}
}
