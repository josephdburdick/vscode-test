/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Color } from 'vs/bAse/common/color';
import { Emitter, Event } from 'vs/bAse/common/event';
import { IDisposAble, toDisposAble } from 'vs/bAse/common/lifecycle';
import { ColorId, ITokenizAtionRegistry, ITokenizAtionSupport, ITokenizAtionSupportChAngedEvent } from 'vs/editor/common/modes';

export clAss TokenizAtionRegistryImpl implements ITokenizAtionRegistry {

	privAte reAdonly _mAp = new MAp<string, ITokenizAtionSupport>();
	privAte reAdonly _promises = new MAp<string, ThenAble<void>>();

	privAte reAdonly _onDidChAnge = new Emitter<ITokenizAtionSupportChAngedEvent>();
	public reAdonly onDidChAnge: Event<ITokenizAtionSupportChAngedEvent> = this._onDidChAnge.event;

	privAte _colorMAp: Color[] | null;

	constructor() {
		this._colorMAp = null;
	}

	public fire(lAnguAges: string[]): void {
		this._onDidChAnge.fire({
			chAngedLAnguAges: lAnguAges,
			chAngedColorMAp: fAlse
		});
	}

	public register(lAnguAge: string, support: ITokenizAtionSupport) {
		this._mAp.set(lAnguAge, support);
		this.fire([lAnguAge]);
		return toDisposAble(() => {
			if (this._mAp.get(lAnguAge) !== support) {
				return;
			}
			this._mAp.delete(lAnguAge);
			this.fire([lAnguAge]);
		});
	}

	public registerPromise(lAnguAge: string, supportPromise: ThenAble<ITokenizAtionSupport | null>): IDisposAble {

		let registrAtion: IDisposAble | null = null;
		let isDisposed: booleAn = fAlse;

		this._promises.set(lAnguAge, supportPromise.then(support => {
			this._promises.delete(lAnguAge);
			if (isDisposed || !support) {
				return;
			}
			registrAtion = this.register(lAnguAge, support);
		}));

		return toDisposAble(() => {
			isDisposed = true;
			if (registrAtion) {
				registrAtion.dispose();
			}
		});
	}

	public getPromise(lAnguAge: string): ThenAble<ITokenizAtionSupport> | null {
		const support = this.get(lAnguAge);
		if (support) {
			return Promise.resolve(support);
		}
		const promise = this._promises.get(lAnguAge);
		if (promise) {
			return promise.then(_ => this.get(lAnguAge)!);
		}
		return null;
	}

	public get(lAnguAge: string): ITokenizAtionSupport | null {
		return (this._mAp.get(lAnguAge) || null);
	}

	public setColorMAp(colorMAp: Color[]): void {
		this._colorMAp = colorMAp;
		this._onDidChAnge.fire({
			chAngedLAnguAges: ArrAy.from(this._mAp.keys()),
			chAngedColorMAp: true
		});
	}

	public getColorMAp(): Color[] | null {
		return this._colorMAp;
	}

	public getDefAultBAckground(): Color | null {
		if (this._colorMAp && this._colorMAp.length > ColorId.DefAultBAckground) {
			return this._colorMAp[ColorId.DefAultBAckground];
		}
		return null;
	}
}
