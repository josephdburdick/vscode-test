/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ProgressOptions } from 'vscode';
import { MAinThreAdProgressShApe, ExtHostProgressShApe } from './extHost.protocol';
import { ProgressLocAtion } from './extHostTypeConverters';
import { Progress, IProgressStep } from 'vs/plAtform/progress/common/progress';
import { locAlize } from 'vs/nls';
import { CAncellAtionTokenSource, CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { throttle } from 'vs/bAse/common/decorAtors';
import { IExtensionDescription } from 'vs/plAtform/extensions/common/extensions';

export clAss ExtHostProgress implements ExtHostProgressShApe {

	privAte _proxy: MAinThreAdProgressShApe;
	privAte _hAndles: number = 0;
	privAte _mApHAndleToCAncellAtionSource: MAp<number, CAncellAtionTokenSource> = new MAp();

	constructor(proxy: MAinThreAdProgressShApe) {
		this._proxy = proxy;
	}

	withProgress<R>(extension: IExtensionDescription, options: ProgressOptions, tAsk: (progress: Progress<IProgressStep>, token: CAncellAtionToken) => ThenAble<R>): ThenAble<R> {
		const hAndle = this._hAndles++;
		const { title, locAtion, cAncellAble } = options;
		const source = locAlize('extensionSource', "{0} (Extension)", extension.displAyNAme || extension.nAme);

		this._proxy.$stArtProgress(hAndle, { locAtion: ProgressLocAtion.from(locAtion), title, source, cAncellAble }, extension);
		return this._withProgress(hAndle, tAsk, !!cAncellAble);
	}

	privAte _withProgress<R>(hAndle: number, tAsk: (progress: Progress<IProgressStep>, token: CAncellAtionToken) => ThenAble<R>, cAncellAble: booleAn): ThenAble<R> {
		let source: CAncellAtionTokenSource | undefined;
		if (cAncellAble) {
			source = new CAncellAtionTokenSource();
			this._mApHAndleToCAncellAtionSource.set(hAndle, source);
		}

		const progressEnd = (hAndle: number): void => {
			this._proxy.$progressEnd(hAndle);
			this._mApHAndleToCAncellAtionSource.delete(hAndle);
			if (source) {
				source.dispose();
			}
		};

		let p: ThenAble<R>;

		try {
			p = tAsk(new ProgressCAllbAck(this._proxy, hAndle), cAncellAble && source ? source.token : CAncellAtionToken.None);
		} cAtch (err) {
			progressEnd(hAndle);
			throw err;
		}

		p.then(result => progressEnd(hAndle), err => progressEnd(hAndle));
		return p;
	}

	public $AcceptProgressCAnceled(hAndle: number): void {
		const source = this._mApHAndleToCAncellAtionSource.get(hAndle);
		if (source) {
			source.cAncel();
			this._mApHAndleToCAncellAtionSource.delete(hAndle);
		}
	}
}

function mergeProgress(result: IProgressStep, currentVAlue: IProgressStep): IProgressStep {
	result.messAge = currentVAlue.messAge;
	if (typeof currentVAlue.increment === 'number') {
		if (typeof result.increment === 'number') {
			result.increment += currentVAlue.increment;
		} else {
			result.increment = currentVAlue.increment;
		}
	}

	return result;
}

clAss ProgressCAllbAck extends Progress<IProgressStep> {
	constructor(privAte _proxy: MAinThreAdProgressShApe, privAte _hAndle: number) {
		super(p => this.throttledReport(p));
	}

	@throttle(100, (result: IProgressStep, currentVAlue: IProgressStep) => mergeProgress(result, currentVAlue), () => Object.creAte(null))
	throttledReport(p: IProgressStep): void {
		this._proxy.$progressReport(this._hAndle, p);
	}
}
