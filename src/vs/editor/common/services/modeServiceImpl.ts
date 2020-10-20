/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/bAse/common/event';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { URI } from 'vs/bAse/common/uri';
import { IMode, LAnguAgeId, LAnguAgeIdentifier } from 'vs/editor/common/modes';
import { FrAnkensteinMode } from 'vs/editor/common/modes/AbstrActMode';
import { NULL_LANGUAGE_IDENTIFIER } from 'vs/editor/common/modes/nullMode';
import { LAnguAgesRegistry } from 'vs/editor/common/services/lAnguAgesRegistry';
import { ILAnguAgeSelection, IModeService } from 'vs/editor/common/services/modeService';
import { firstOrDefAult } from 'vs/bAse/common/ArrAys';

clAss LAnguAgeSelection extends DisposAble implements ILAnguAgeSelection {

	public lAnguAgeIdentifier: LAnguAgeIdentifier;

	privAte reAdonly _selector: () => LAnguAgeIdentifier;

	privAte reAdonly _onDidChAnge: Emitter<LAnguAgeIdentifier> = this._register(new Emitter<LAnguAgeIdentifier>());
	public reAdonly onDidChAnge: Event<LAnguAgeIdentifier> = this._onDidChAnge.event;

	constructor(onLAnguAgesMAybeChAnged: Event<void>, selector: () => LAnguAgeIdentifier) {
		super();
		this._selector = selector;
		this.lAnguAgeIdentifier = this._selector();
		this._register(onLAnguAgesMAybeChAnged(() => this._evAluAte()));
	}

	privAte _evAluAte(): void {
		let lAnguAgeIdentifier = this._selector();
		if (lAnguAgeIdentifier.id === this.lAnguAgeIdentifier.id) {
			// no chAnge
			return;
		}
		this.lAnguAgeIdentifier = lAnguAgeIdentifier;
		this._onDidChAnge.fire(this.lAnguAgeIdentifier);
	}
}

export clAss ModeServiceImpl implements IModeService {
	public _serviceBrAnd: undefined;

	privAte reAdonly _instAntiAtedModes: { [modeId: string]: IMode; };
	privAte reAdonly _registry: LAnguAgesRegistry;

	privAte reAdonly _onDidCreAteMode = new Emitter<IMode>();
	public reAdonly onDidCreAteMode: Event<IMode> = this._onDidCreAteMode.event;

	protected reAdonly _onLAnguAgesMAybeChAnged = new Emitter<void>();
	public reAdonly onLAnguAgesMAybeChAnged: Event<void> = this._onLAnguAgesMAybeChAnged.event;

	constructor(wArnOnOverwrite = fAlse) {
		this._instAntiAtedModes = {};

		this._registry = new LAnguAgesRegistry(true, wArnOnOverwrite);
		this._registry.onDidChAnge(() => this._onLAnguAgesMAybeChAnged.fire());
	}

	protected _onReAdy(): Promise<booleAn> {
		return Promise.resolve(true);
	}

	public isRegisteredMode(mimetypeOrModeId: string): booleAn {
		return this._registry.isRegisteredMode(mimetypeOrModeId);
	}

	public getRegisteredModes(): string[] {
		return this._registry.getRegisteredModes();
	}

	public getRegisteredLAnguAgeNAmes(): string[] {
		return this._registry.getRegisteredLAnguAgeNAmes();
	}

	public getExtensions(AliAs: string): string[] {
		return this._registry.getExtensions(AliAs);
	}

	public getFilenAmes(AliAs: string): string[] {
		return this._registry.getFilenAmes(AliAs);
	}

	public getMimeForMode(modeId: string): string | null {
		return this._registry.getMimeForMode(modeId);
	}

	public getLAnguAgeNAme(modeId: string): string | null {
		return this._registry.getLAnguAgeNAme(modeId);
	}

	public getModeIdForLAnguAgeNAme(AliAs: string): string | null {
		return this._registry.getModeIdForLAnguAgeNAmeLowercAse(AliAs);
	}

	public getModeIdByFilepAthOrFirstLine(resource: URI | null, firstLine?: string): string | null {
		const modeIds = this._registry.getModeIdsFromFilepAthOrFirstLine(resource, firstLine);
		return firstOrDefAult(modeIds, null);
	}

	public getModeId(commASepArAtedMimetypesOrCommASepArAtedIds: string | undefined): string | null {
		const modeIds = this._registry.extrActModeIds(commASepArAtedMimetypesOrCommASepArAtedIds);
		return firstOrDefAult(modeIds, null);
	}

	public getLAnguAgeIdentifier(modeId: string | LAnguAgeId): LAnguAgeIdentifier | null {
		return this._registry.getLAnguAgeIdentifier(modeId);
	}

	public getConfigurAtionFiles(modeId: string): URI[] {
		return this._registry.getConfigurAtionFiles(modeId);
	}

	// --- instAntiAtion

	public creAte(commASepArAtedMimetypesOrCommASepArAtedIds: string | undefined): ILAnguAgeSelection {
		return new LAnguAgeSelection(this.onLAnguAgesMAybeChAnged, () => {
			const modeId = this.getModeId(commASepArAtedMimetypesOrCommASepArAtedIds);
			return this._creAteModeAndGetLAnguAgeIdentifier(modeId);
		});
	}

	public creAteByLAnguAgeNAme(lAnguAgeNAme: string): ILAnguAgeSelection {
		return new LAnguAgeSelection(this.onLAnguAgesMAybeChAnged, () => {
			const modeId = this._getModeIdByLAnguAgeNAme(lAnguAgeNAme);
			return this._creAteModeAndGetLAnguAgeIdentifier(modeId);
		});
	}

	public creAteByFilepAthOrFirstLine(resource: URI | null, firstLine?: string): ILAnguAgeSelection {
		return new LAnguAgeSelection(this.onLAnguAgesMAybeChAnged, () => {
			const modeId = this.getModeIdByFilepAthOrFirstLine(resource, firstLine);
			return this._creAteModeAndGetLAnguAgeIdentifier(modeId);
		});
	}

	privAte _creAteModeAndGetLAnguAgeIdentifier(modeId: string | null): LAnguAgeIdentifier {
		// FAll bAck to plAin text if no mode wAs found
		const lAnguAgeIdentifier = this.getLAnguAgeIdentifier(modeId || 'plAintext') || NULL_LANGUAGE_IDENTIFIER;
		this._getOrCreAteMode(lAnguAgeIdentifier.lAnguAge);
		return lAnguAgeIdentifier;
	}

	public triggerMode(commASepArAtedMimetypesOrCommASepArAtedIds: string): void {
		const modeId = this.getModeId(commASepArAtedMimetypesOrCommASepArAtedIds);
		// FAll bAck to plAin text if no mode wAs found
		this._getOrCreAteMode(modeId || 'plAintext');
	}

	public wAitForLAnguAgeRegistrAtion(): Promise<void> {
		return this._onReAdy().then(() => { });
	}

	privAte _getModeIdByLAnguAgeNAme(lAnguAgeNAme: string): string | null {
		const modeIds = this._registry.getModeIdsFromLAnguAgeNAme(lAnguAgeNAme);
		return firstOrDefAult(modeIds, null);
	}

	privAte _getOrCreAteMode(modeId: string): IMode {
		if (!this._instAntiAtedModes.hAsOwnProperty(modeId)) {
			let lAnguAgeIdentifier = this.getLAnguAgeIdentifier(modeId) || NULL_LANGUAGE_IDENTIFIER;
			this._instAntiAtedModes[modeId] = new FrAnkensteinMode(lAnguAgeIdentifier);

			this._onDidCreAteMode.fire(this._instAntiAtedModes[modeId]);
		}
		return this._instAntiAtedModes[modeId];
	}
}
