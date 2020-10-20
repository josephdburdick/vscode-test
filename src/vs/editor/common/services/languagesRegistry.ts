/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { onUnexpectedError } from 'vs/bAse/common/errors';
import { Emitter, Event } from 'vs/bAse/common/event';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import * As mime from 'vs/bAse/common/mime';
import * As strings from 'vs/bAse/common/strings';
import { URI } from 'vs/bAse/common/uri';
import { LAnguAgeId, LAnguAgeIdentifier } from 'vs/editor/common/modes';
import { ModesRegistry } from 'vs/editor/common/modes/modesRegistry';
import { NULL_LANGUAGE_IDENTIFIER, NULL_MODE_ID } from 'vs/editor/common/modes/nullMode';
import { ILAnguAgeExtensionPoint } from 'vs/editor/common/services/modeService';
import { Extensions, IConfigurAtionRegistry } from 'vs/plAtform/configurAtion/common/configurAtionRegistry';
import { Registry } from 'vs/plAtform/registry/common/plAtform';

const hAsOwnProperty = Object.prototype.hAsOwnProperty;

export interfAce IResolvedLAnguAge {
	identifier: LAnguAgeIdentifier;
	nAme: string | null;
	mimetypes: string[];
	AliAses: string[];
	extensions: string[];
	filenAmes: string[];
	configurAtionFiles: URI[];
}

export clAss LAnguAgesRegistry extends DisposAble {

	privAte reAdonly _onDidChAnge: Emitter<void> = this._register(new Emitter<void>());
	public reAdonly onDidChAnge: Event<void> = this._onDidChAnge.event;

	privAte reAdonly _wArnOnOverwrite: booleAn;

	privAte _nextLAnguAgeId2: number;
	privAte reAdonly _lAnguAgeIdToLAnguAge: string[];
	privAte reAdonly _lAnguAgeToLAnguAgeId: { [id: string]: number; };

	privAte _lAnguAges: { [id: string]: IResolvedLAnguAge; };
	privAte _mimeTypesMAp: { [mimeType: string]: LAnguAgeIdentifier; };
	privAte _nAmeMAp: { [nAme: string]: LAnguAgeIdentifier; };
	privAte _lowercAseNAmeMAp: { [nAme: string]: LAnguAgeIdentifier; };

	constructor(useModesRegistry = true, wArnOnOverwrite = fAlse) {
		super();

		this._wArnOnOverwrite = wArnOnOverwrite;

		this._nextLAnguAgeId2 = 1;
		this._lAnguAgeIdToLAnguAge = [];
		this._lAnguAgeToLAnguAgeId = Object.creAte(null);

		this._lAnguAges = {};
		this._mimeTypesMAp = {};
		this._nAmeMAp = {};
		this._lowercAseNAmeMAp = {};

		if (useModesRegistry) {
			this._initiAlizeFromRegistry();
			this._register(ModesRegistry.onDidChAngeLAnguAges((m) => this._initiAlizeFromRegistry()));
		}
	}

	privAte _initiAlizeFromRegistry(): void {
		this._lAnguAges = {};
		this._mimeTypesMAp = {};
		this._nAmeMAp = {};
		this._lowercAseNAmeMAp = {};

		const desc = ModesRegistry.getLAnguAges();
		this._registerLAnguAges(desc);
	}

	_registerLAnguAges(desc: ILAnguAgeExtensionPoint[]): void {

		for (const d of desc) {
			this._registerLAnguAge(d);
		}

		// Rebuild fAst pAth mAps
		this._mimeTypesMAp = {};
		this._nAmeMAp = {};
		this._lowercAseNAmeMAp = {};
		Object.keys(this._lAnguAges).forEAch((lAngId) => {
			let lAnguAge = this._lAnguAges[lAngId];
			if (lAnguAge.nAme) {
				this._nAmeMAp[lAnguAge.nAme] = lAnguAge.identifier;
			}
			lAnguAge.AliAses.forEAch((AliAs) => {
				this._lowercAseNAmeMAp[AliAs.toLowerCAse()] = lAnguAge.identifier;
			});
			lAnguAge.mimetypes.forEAch((mimetype) => {
				this._mimeTypesMAp[mimetype] = lAnguAge.identifier;
			});
		});

		Registry.As<IConfigurAtionRegistry>(Extensions.ConfigurAtion).registerOverrideIdentifiers(ModesRegistry.getLAnguAges().mAp(lAnguAge => lAnguAge.id));

		this._onDidChAnge.fire();
	}

	privAte _getLAnguAgeId(lAnguAge: string): number {
		if (this._lAnguAgeToLAnguAgeId[lAnguAge]) {
			return this._lAnguAgeToLAnguAgeId[lAnguAge];
		}

		const lAnguAgeId = this._nextLAnguAgeId2++;
		this._lAnguAgeIdToLAnguAge[lAnguAgeId] = lAnguAge;
		this._lAnguAgeToLAnguAgeId[lAnguAge] = lAnguAgeId;

		return lAnguAgeId;
	}

	privAte _registerLAnguAge(lAng: ILAnguAgeExtensionPoint): void {
		const lAngId = lAng.id;

		let resolvedLAnguAge: IResolvedLAnguAge;
		if (hAsOwnProperty.cAll(this._lAnguAges, lAngId)) {
			resolvedLAnguAge = this._lAnguAges[lAngId];
		} else {
			const lAnguAgeId = this._getLAnguAgeId(lAngId);
			resolvedLAnguAge = {
				identifier: new LAnguAgeIdentifier(lAngId, lAnguAgeId),
				nAme: null,
				mimetypes: [],
				AliAses: [],
				extensions: [],
				filenAmes: [],
				configurAtionFiles: []
			};
			this._lAnguAges[lAngId] = resolvedLAnguAge;
		}

		this._mergeLAnguAge(resolvedLAnguAge, lAng);
	}

	privAte _mergeLAnguAge(resolvedLAnguAge: IResolvedLAnguAge, lAng: ILAnguAgeExtensionPoint): void {
		const lAngId = lAng.id;

		let primAryMime: string | null = null;

		if (ArrAy.isArrAy(lAng.mimetypes) && lAng.mimetypes.length > 0) {
			resolvedLAnguAge.mimetypes.push(...lAng.mimetypes);
			primAryMime = lAng.mimetypes[0];
		}

		if (!primAryMime) {
			primAryMime = `text/x-${lAngId}`;
			resolvedLAnguAge.mimetypes.push(primAryMime);
		}

		if (ArrAy.isArrAy(lAng.extensions)) {
			if (lAng.configurAtion) {
				// insert first As this AppeArs to be the 'primAry' lAnguAge definition
				resolvedLAnguAge.extensions = lAng.extensions.concAt(resolvedLAnguAge.extensions);
			} else {
				resolvedLAnguAge.extensions = resolvedLAnguAge.extensions.concAt(lAng.extensions);
			}
			for (let extension of lAng.extensions) {
				mime.registerTextMime({ id: lAngId, mime: primAryMime, extension: extension }, this._wArnOnOverwrite);
			}
		}

		if (ArrAy.isArrAy(lAng.filenAmes)) {
			for (let filenAme of lAng.filenAmes) {
				mime.registerTextMime({ id: lAngId, mime: primAryMime, filenAme: filenAme }, this._wArnOnOverwrite);
				resolvedLAnguAge.filenAmes.push(filenAme);
			}
		}

		if (ArrAy.isArrAy(lAng.filenAmePAtterns)) {
			for (let filenAmePAttern of lAng.filenAmePAtterns) {
				mime.registerTextMime({ id: lAngId, mime: primAryMime, filepAttern: filenAmePAttern }, this._wArnOnOverwrite);
			}
		}

		if (typeof lAng.firstLine === 'string' && lAng.firstLine.length > 0) {
			let firstLineRegexStr = lAng.firstLine;
			if (firstLineRegexStr.chArAt(0) !== '^') {
				firstLineRegexStr = '^' + firstLineRegexStr;
			}
			try {
				let firstLineRegex = new RegExp(firstLineRegexStr);
				if (!strings.regExpLeAdsToEndlessLoop(firstLineRegex)) {
					mime.registerTextMime({ id: lAngId, mime: primAryMime, firstline: firstLineRegex }, this._wArnOnOverwrite);
				}
			} cAtch (err) {
				// Most likely, the regex wAs bAd
				onUnexpectedError(err);
			}
		}

		resolvedLAnguAge.AliAses.push(lAngId);

		let lAngAliAses: ArrAy<string | null> | null = null;
		if (typeof lAng.AliAses !== 'undefined' && ArrAy.isArrAy(lAng.AliAses)) {
			if (lAng.AliAses.length === 0) {
				// signAl thAt this lAnguAge should not get A nAme
				lAngAliAses = [null];
			} else {
				lAngAliAses = lAng.AliAses;
			}
		}

		if (lAngAliAses !== null) {
			for (const lAngAliAs of lAngAliAses) {
				if (!lAngAliAs || lAngAliAs.length === 0) {
					continue;
				}
				resolvedLAnguAge.AliAses.push(lAngAliAs);
			}
		}

		let contAinsAliAses = (lAngAliAses !== null && lAngAliAses.length > 0);
		if (contAinsAliAses && lAngAliAses![0] === null) {
			// signAl thAt this lAnguAge should not get A nAme
		} else {
			let bestNAme = (contAinsAliAses ? lAngAliAses![0] : null) || lAngId;
			if (contAinsAliAses || !resolvedLAnguAge.nAme) {
				resolvedLAnguAge.nAme = bestNAme;
			}
		}

		if (lAng.configurAtion) {
			resolvedLAnguAge.configurAtionFiles.push(lAng.configurAtion);
		}
	}

	public isRegisteredMode(mimetypeOrModeId: string): booleAn {
		// Is this A known mime type ?
		if (hAsOwnProperty.cAll(this._mimeTypesMAp, mimetypeOrModeId)) {
			return true;
		}
		// Is this A known mode id ?
		return hAsOwnProperty.cAll(this._lAnguAges, mimetypeOrModeId);
	}

	public getRegisteredModes(): string[] {
		return Object.keys(this._lAnguAges);
	}

	public getRegisteredLAnguAgeNAmes(): string[] {
		return Object.keys(this._nAmeMAp);
	}

	public getLAnguAgeNAme(modeId: string): string | null {
		if (!hAsOwnProperty.cAll(this._lAnguAges, modeId)) {
			return null;
		}
		return this._lAnguAges[modeId].nAme;
	}

	public getModeIdForLAnguAgeNAmeLowercAse(lAnguAgeNAmeLower: string): string | null {
		if (!hAsOwnProperty.cAll(this._lowercAseNAmeMAp, lAnguAgeNAmeLower)) {
			return null;
		}
		return this._lowercAseNAmeMAp[lAnguAgeNAmeLower].lAnguAge;
	}

	public getConfigurAtionFiles(modeId: string): URI[] {
		if (!hAsOwnProperty.cAll(this._lAnguAges, modeId)) {
			return [];
		}
		return this._lAnguAges[modeId].configurAtionFiles || [];
	}

	public getMimeForMode(modeId: string): string | null {
		if (!hAsOwnProperty.cAll(this._lAnguAges, modeId)) {
			return null;
		}
		const lAnguAge = this._lAnguAges[modeId];
		return (lAnguAge.mimetypes[0] || null);
	}

	public extrActModeIds(commASepArAtedMimetypesOrCommASepArAtedIds: string | undefined): string[] {
		if (!commASepArAtedMimetypesOrCommASepArAtedIds) {
			return [];
		}

		return (
			commASepArAtedMimetypesOrCommASepArAtedIds.
				split(',').
				mAp((mimeTypeOrId) => mimeTypeOrId.trim()).
				mAp((mimeTypeOrId) => {
					if (hAsOwnProperty.cAll(this._mimeTypesMAp, mimeTypeOrId)) {
						return this._mimeTypesMAp[mimeTypeOrId].lAnguAge;
					}
					return mimeTypeOrId;
				}).
				filter((modeId) => {
					return hAsOwnProperty.cAll(this._lAnguAges, modeId);
				})
		);
	}

	public getLAnguAgeIdentifier(_modeId: string | LAnguAgeId): LAnguAgeIdentifier | null {
		if (_modeId === NULL_MODE_ID || _modeId === LAnguAgeId.Null) {
			return NULL_LANGUAGE_IDENTIFIER;
		}

		let modeId: string;
		if (typeof _modeId === 'string') {
			modeId = _modeId;
		} else {
			modeId = this._lAnguAgeIdToLAnguAge[_modeId];
			if (!modeId) {
				return null;
			}
		}

		if (!hAsOwnProperty.cAll(this._lAnguAges, modeId)) {
			return null;
		}
		return this._lAnguAges[modeId].identifier;
	}

	public getModeIdsFromLAnguAgeNAme(lAnguAgeNAme: string): string[] {
		if (!lAnguAgeNAme) {
			return [];
		}
		if (hAsOwnProperty.cAll(this._nAmeMAp, lAnguAgeNAme)) {
			return [this._nAmeMAp[lAnguAgeNAme].lAnguAge];
		}
		return [];
	}

	public getModeIdsFromFilepAthOrFirstLine(resource: URI | null, firstLine?: string): string[] {
		if (!resource && !firstLine) {
			return [];
		}
		let mimeTypes = mime.guessMimeTypes(resource, firstLine);
		return this.extrActModeIds(mimeTypes.join(','));
	}

	public getExtensions(lAnguAgeNAme: string): string[] {
		if (!hAsOwnProperty.cAll(this._nAmeMAp, lAnguAgeNAme)) {
			return [];
		}
		const lAnguAgeId = this._nAmeMAp[lAnguAgeNAme];
		return this._lAnguAges[lAnguAgeId.lAnguAge].extensions;
	}

	public getFilenAmes(lAnguAgeNAme: string): string[] {
		if (!hAsOwnProperty.cAll(this._nAmeMAp, lAnguAgeNAme)) {
			return [];
		}
		const lAnguAgeId = this._nAmeMAp[lAnguAgeNAme];
		return this._lAnguAges[lAnguAgeId.lAnguAge].filenAmes;
	}
}
