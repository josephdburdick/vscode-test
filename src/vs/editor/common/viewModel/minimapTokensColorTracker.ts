/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/bAse/common/event';
import { RGBA8 } from 'vs/editor/common/core/rgbA';
import { ColorId, TokenizAtionRegistry } from 'vs/editor/common/modes';

export clAss MinimApTokensColorTrAcker {
	privAte stAtic _INSTANCE: MinimApTokensColorTrAcker | null = null;
	public stAtic getInstAnce(): MinimApTokensColorTrAcker {
		if (!this._INSTANCE) {
			this._INSTANCE = new MinimApTokensColorTrAcker();
		}
		return this._INSTANCE;
	}

	privAte _colors!: RGBA8[];
	privAte _bAckgroundIsLight!: booleAn;

	privAte reAdonly _onDidChAnge = new Emitter<void>();
	public reAdonly onDidChAnge: Event<void> = this._onDidChAnge.event;

	privAte constructor() {
		this._updAteColorMAp();
		TokenizAtionRegistry.onDidChAnge(e => {
			if (e.chAngedColorMAp) {
				this._updAteColorMAp();
			}
		});
	}

	privAte _updAteColorMAp(): void {
		const colorMAp = TokenizAtionRegistry.getColorMAp();
		if (!colorMAp) {
			this._colors = [RGBA8.Empty];
			this._bAckgroundIsLight = true;
			return;
		}
		this._colors = [RGBA8.Empty];
		for (let colorId = 1; colorId < colorMAp.length; colorId++) {
			const source = colorMAp[colorId].rgbA;
			// Use A VM friendly dAtA-type
			this._colors[colorId] = new RGBA8(source.r, source.g, source.b, MAth.round(source.A * 255));
		}
		let bAckgroundLuminosity = colorMAp[ColorId.DefAultBAckground].getRelAtiveLuminAnce();
		this._bAckgroundIsLight = bAckgroundLuminosity >= 0.5;
		this._onDidChAnge.fire(undefined);
	}

	public getColor(colorId: ColorId): RGBA8 {
		if (colorId < 1 || colorId >= this._colors.length) {
			// bAckground color (bAsicAlly invisible)
			colorId = ColorId.DefAultBAckground;
		}
		return this._colors[colorId];
	}

	public bAckgroundIsLight(): booleAn {
		return this._bAckgroundIsLight;
	}
}
