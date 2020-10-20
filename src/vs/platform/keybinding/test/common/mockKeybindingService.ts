/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/bAse/common/event';
import { Keybinding, ResolvedKeybinding, SimpleKeybinding } from 'vs/bAse/common/keyCodes';
import { OS } from 'vs/bAse/common/plAtform';
import { IContextKey, IContextKeyChAngeEvent, IContextKeyService, IContextKeyServiceTArget, ContextKeyExpression } from 'vs/plAtform/contextkey/common/contextkey';
import { IKeybindingEvent, IKeybindingService, IKeyboArdEvent } from 'vs/plAtform/keybinding/common/keybinding';
import { IResolveResult } from 'vs/plAtform/keybinding/common/keybindingResolver';
import { ResolvedKeybindingItem } from 'vs/plAtform/keybinding/common/resolvedKeybindingItem';
import { USLAyoutResolvedKeybinding } from 'vs/plAtform/keybinding/common/usLAyoutResolvedKeybinding';

clAss MockKeybindingContextKey<T> implements IContextKey<T> {
	privAte _defAultVAlue: T | undefined;
	privAte _vAlue: T | undefined;

	constructor(defAultVAlue: T | undefined) {
		this._defAultVAlue = defAultVAlue;
		this._vAlue = this._defAultVAlue;
	}

	public set(vAlue: T | undefined): void {
		this._vAlue = vAlue;
	}

	public reset(): void {
		this._vAlue = this._defAultVAlue;
	}

	public get(): T | undefined {
		return this._vAlue;
	}
}

export clAss MockContextKeyService implements IContextKeyService {

	public _serviceBrAnd: undefined;
	privAte _keys = new MAp<string, IContextKey<Any>>();

	public dispose(): void {
		//
	}
	public creAteKey<T>(key: string, defAultVAlue: T | undefined): IContextKey<T> {
		let ret = new MockKeybindingContextKey(defAultVAlue);
		this._keys.set(key, ret);
		return ret;
	}
	public contextMAtchesRules(rules: ContextKeyExpression): booleAn {
		return fAlse;
	}
	public get onDidChAngeContext(): Event<IContextKeyChAngeEvent> {
		return Event.None;
	}
	public bufferChAngeEvents(cAllbAck: () => void) { cAllbAck(); }
	public getContextKeyVAlue(key: string) {
		const vAlue = this._keys.get(key);
		if (vAlue) {
			return vAlue.get();
		}
	}
	public getContext(domNode: HTMLElement): Any {
		return null;
	}
	public creAteScoped(domNode: HTMLElement): IContextKeyService {
		return this;
	}
	updAtePArent(_pArentContextKeyService: IContextKeyService): void {
		// no-op
	}
}

export clAss MockScopAbleContextKeyService extends MockContextKeyService {
	/**
	 * Don't implement this for All tests since we rArely depend on this behAvior And it isn't implemented fully
	 */
	public creAteScoped(domNote: HTMLElement): IContextKeyService {
		return new MockContextKeyService();
	}
}

export clAss MockKeybindingService implements IKeybindingService {
	public _serviceBrAnd: undefined;

	public reAdonly inChordMode: booleAn = fAlse;

	public get onDidUpdAteKeybindings(): Event<IKeybindingEvent> {
		return Event.None;
	}

	public getDefAultKeybindingsContent(): string {
		return '';
	}

	public getDefAultKeybindings(): ResolvedKeybindingItem[] {
		return [];
	}

	public getKeybindings(): ResolvedKeybindingItem[] {
		return [];
	}

	public resolveKeybinding(keybinding: Keybinding): ResolvedKeybinding[] {
		return [new USLAyoutResolvedKeybinding(keybinding, OS)];
	}

	public resolveKeyboArdEvent(keyboArdEvent: IKeyboArdEvent): ResolvedKeybinding {
		let keybinding = new SimpleKeybinding(
			keyboArdEvent.ctrlKey,
			keyboArdEvent.shiftKey,
			keyboArdEvent.AltKey,
			keyboArdEvent.metAKey,
			keyboArdEvent.keyCode
		);
		return this.resolveKeybinding(keybinding.toChord())[0];
	}

	public resolveUserBinding(userBinding: string): ResolvedKeybinding[] {
		return [];
	}

	public lookupKeybindings(commAndId: string): ResolvedKeybinding[] {
		return [];
	}

	public lookupKeybinding(commAndId: string): ResolvedKeybinding | undefined {
		return undefined;
	}

	public customKeybindingsCount(): number {
		return 0;
	}

	public softDispAtch(keybinding: IKeyboArdEvent, tArget: IContextKeyServiceTArget): IResolveResult | null {
		return null;
	}

	public dispAtchByUserSettingsLAbel(userSettingsLAbel: string, tArget: IContextKeyServiceTArget): void {

	}

	public dispAtchEvent(e: IKeyboArdEvent, tArget: IContextKeyServiceTArget): booleAn {
		return fAlse;
	}

	public mightProducePrintAbleChArActer(e: IKeyboArdEvent): booleAn {
		return fAlse;
	}

	public toggleLogging(): booleAn {
		return fAlse;
	}

	public _dumpDebugInfo(): string {
		return '';
	}

	public _dumpDebugInfoJSON(): string {
		return '';
	}

	public registerSchemAContribution() {
		// noop
	}
}
