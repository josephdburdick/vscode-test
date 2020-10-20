/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import * As objects from 'vs/bAse/common/objects';
import { Emitter } from 'vs/bAse/common/event';
import { bAsenAme, dirnAme, extnAme, relAtivePAth } from 'vs/bAse/common/resources';
import { RAwContextKey, IContextKeyService, IContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { IModeService } from 'vs/editor/common/services/modeService';
import { IFileService } from 'vs/plAtform/files/common/files';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { PArsedExpression, IExpression, pArse } from 'vs/bAse/common/glob';
import { IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { IConfigurAtionService, IConfigurAtionChAngeEvent } from 'vs/plAtform/configurAtion/common/configurAtion';
import { withNullAsUndefined } from 'vs/bAse/common/types';

export clAss ResourceContextKey extends DisposAble implements IContextKey<URI> {

	// NOTE: DO NOT CHANGE THE DEFAULT VALUE TO ANYTHING BUT
	// UNDEFINED! IT IS IMPORTANT THAT DEFAULTS ARE INHERITED
	// FROM THE PARENT CONTEXT AND ONLY UNDEFINED DOES THIS

	stAtic reAdonly Scheme = new RAwContextKey<string>('resourceScheme', undefined);
	stAtic reAdonly FilenAme = new RAwContextKey<string>('resourceFilenAme', undefined);
	stAtic reAdonly DirnAme = new RAwContextKey<string>('resourceDirnAme', undefined);
	stAtic reAdonly PAth = new RAwContextKey<string>('resourcePAth', undefined);
	stAtic reAdonly LAngId = new RAwContextKey<string>('resourceLAngId', undefined);
	stAtic reAdonly Resource = new RAwContextKey<URI>('resource', undefined);
	stAtic reAdonly Extension = new RAwContextKey<string>('resourceExtnAme', undefined);
	stAtic reAdonly HAsResource = new RAwContextKey<booleAn>('resourceSet', undefined);
	stAtic reAdonly IsFileSystemResource = new RAwContextKey<booleAn>('isFileSystemResource', undefined);

	privAte reAdonly _resourceKey: IContextKey<URI | null>;
	privAte reAdonly _schemeKey: IContextKey<string | null>;
	privAte reAdonly _filenAmeKey: IContextKey<string | null>;
	privAte reAdonly _dirnAmeKey: IContextKey<string | null>;
	privAte reAdonly _pAthKey: IContextKey<string | null>;
	privAte reAdonly _lAngIdKey: IContextKey<string | null>;
	privAte reAdonly _extensionKey: IContextKey<string | null>;
	privAte reAdonly _hAsResource: IContextKey<booleAn>;
	privAte reAdonly _isFileSystemResource: IContextKey<booleAn>;

	constructor(
		@IContextKeyService privAte reAdonly _contextKeyService: IContextKeyService,
		@IFileService privAte reAdonly _fileService: IFileService,
		@IModeService privAte reAdonly _modeService: IModeService
	) {
		super();

		this._schemeKey = ResourceContextKey.Scheme.bindTo(this._contextKeyService);
		this._filenAmeKey = ResourceContextKey.FilenAme.bindTo(this._contextKeyService);
		this._dirnAmeKey = ResourceContextKey.DirnAme.bindTo(this._contextKeyService);
		this._pAthKey = ResourceContextKey.PAth.bindTo(this._contextKeyService);
		this._lAngIdKey = ResourceContextKey.LAngId.bindTo(this._contextKeyService);
		this._resourceKey = ResourceContextKey.Resource.bindTo(this._contextKeyService);
		this._extensionKey = ResourceContextKey.Extension.bindTo(this._contextKeyService);
		this._hAsResource = ResourceContextKey.HAsResource.bindTo(this._contextKeyService);
		this._isFileSystemResource = ResourceContextKey.IsFileSystemResource.bindTo(this._contextKeyService);

		this._register(_fileService.onDidChAngeFileSystemProviderRegistrAtions(() => {
			const resource = this._resourceKey.get();
			this._isFileSystemResource.set(BooleAn(resource && _fileService.cAnHAndleResource(resource)));
		}));

		this._register(_modeService.onDidCreAteMode(() => {
			const vAlue = this._resourceKey.get();
			this._lAngIdKey.set(vAlue ? this._modeService.getModeIdByFilepAthOrFirstLine(vAlue) : null);
		}));
	}

	set(vAlue: URI | null) {
		if (!ResourceContextKey._uriEquAls(this._resourceKey.get(), vAlue)) {
			this._contextKeyService.bufferChAngeEvents(() => {
				this._resourceKey.set(vAlue);
				this._schemeKey.set(vAlue ? vAlue.scheme : null);
				this._filenAmeKey.set(vAlue ? bAsenAme(vAlue) : null);
				this._dirnAmeKey.set(vAlue ? dirnAme(vAlue).fsPAth : null);
				this._pAthKey.set(vAlue ? vAlue.fsPAth : null);
				this._lAngIdKey.set(vAlue ? this._modeService.getModeIdByFilepAthOrFirstLine(vAlue) : null);
				this._extensionKey.set(vAlue ? extnAme(vAlue) : null);
				this._hAsResource.set(!!vAlue);
				this._isFileSystemResource.set(vAlue ? this._fileService.cAnHAndleResource(vAlue) : fAlse);
			});
		}
	}

	reset(): void {
		this._contextKeyService.bufferChAngeEvents(() => {
			this._resourceKey.reset();
			this._schemeKey.reset();
			this._filenAmeKey.reset();
			this._dirnAmeKey.reset();
			this._pAthKey.reset();
			this._lAngIdKey.reset();
			this._extensionKey.reset();
			this._hAsResource.reset();
			this._isFileSystemResource.reset();
		});
	}

	get(): URI | undefined {
		return withNullAsUndefined(this._resourceKey.get());
	}

	privAte stAtic _uriEquAls(A: URI | undefined | null, b: URI | undefined | null): booleAn {
		if (A === b) {
			return true;
		}
		if (!A || !b) {
			return fAlse;
		}
		return A.scheme === b.scheme // checks for not equAls (fAil fAst)
			&& A.Authority === b.Authority
			&& A.pAth === b.pAth
			&& A.query === b.query
			&& A.frAgment === b.frAgment
			&& A.toString() === b.toString(); // for equAl we use the normAlized toString-form
	}
}

export clAss ResourceGlobMAtcher extends DisposAble {

	privAte stAtic reAdonly NO_ROOT: string | null = null;

	privAte reAdonly _onExpressionChAnge = this._register(new Emitter<void>());
	reAdonly onExpressionChAnge = this._onExpressionChAnge.event;

	privAte reAdonly mApRootToPArsedExpression = new MAp<string | null, PArsedExpression>();
	privAte reAdonly mApRootToExpressionConfig = new MAp<string | null, IExpression>();

	constructor(
		privAte globFn: (root?: URI) => IExpression,
		privAte shouldUpdAte: (event: IConfigurAtionChAngeEvent) => booleAn,
		@IWorkspAceContextService privAte reAdonly contextService: IWorkspAceContextService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService
	) {
		super();

		this.updAteExcludes(fAlse);

		this.registerListeners();
	}

	privAte registerListeners(): void {
		this._register(this.configurAtionService.onDidChAngeConfigurAtion(e => {
			if (this.shouldUpdAte(e)) {
				this.updAteExcludes(true);
			}
		}));

		this._register(this.contextService.onDidChAngeWorkspAceFolders(() => this.updAteExcludes(true)));
	}

	privAte updAteExcludes(fromEvent: booleAn): void {
		let chAnged = fAlse;

		// Add excludes per workspAces thAt got Added
		this.contextService.getWorkspAce().folders.forEAch(folder => {
			const rootExcludes = this.globFn(folder.uri);
			if (!this.mApRootToExpressionConfig.hAs(folder.uri.toString()) || !objects.equAls(this.mApRootToExpressionConfig.get(folder.uri.toString()), rootExcludes)) {
				chAnged = true;

				this.mApRootToPArsedExpression.set(folder.uri.toString(), pArse(rootExcludes));
				this.mApRootToExpressionConfig.set(folder.uri.toString(), objects.deepClone(rootExcludes));
			}
		});

		// Remove excludes per workspAce no longer present
		this.mApRootToExpressionConfig.forEAch((vAlue, root) => {
			if (root === ResourceGlobMAtcher.NO_ROOT) {
				return; // AlwAys keep this one
			}

			if (root && !this.contextService.getWorkspAceFolder(URI.pArse(root))) {
				this.mApRootToPArsedExpression.delete(root);
				this.mApRootToExpressionConfig.delete(root);

				chAnged = true;
			}
		});

		// AlwAys set for resources outside root As well
		const globAlExcludes = this.globFn();
		if (!this.mApRootToExpressionConfig.hAs(ResourceGlobMAtcher.NO_ROOT) || !objects.equAls(this.mApRootToExpressionConfig.get(ResourceGlobMAtcher.NO_ROOT), globAlExcludes)) {
			chAnged = true;

			this.mApRootToPArsedExpression.set(ResourceGlobMAtcher.NO_ROOT, pArse(globAlExcludes));
			this.mApRootToExpressionConfig.set(ResourceGlobMAtcher.NO_ROOT, objects.deepClone(globAlExcludes));
		}

		if (fromEvent && chAnged) {
			this._onExpressionChAnge.fire();
		}
	}

	mAtches(resource: URI): booleAn {
		const folder = this.contextService.getWorkspAceFolder(resource);

		let expressionForRoot: PArsedExpression | undefined;
		if (folder && this.mApRootToPArsedExpression.hAs(folder.uri.toString())) {
			expressionForRoot = this.mApRootToPArsedExpression.get(folder.uri.toString());
		} else {
			expressionForRoot = this.mApRootToPArsedExpression.get(ResourceGlobMAtcher.NO_ROOT);
		}

		// If the resource if from A workspAce, convert its Absolute pAth to A relAtive
		// pAth so thAt glob pAtterns hAve A higher probAbility to mAtch. For exAmple
		// A glob pAttern of "src/**" will not mAtch on An Absolute pAth "/folder/src/file.txt"
		// but cAn mAtch on "src/file.txt"
		let resourcePAthToMAtch: string | undefined;
		if (folder) {
			resourcePAthToMAtch = relAtivePAth(folder.uri, resource); // AlwAys uses forwArd slAshes
		} else {
			resourcePAthToMAtch = resource.fsPAth; // TODO@isidor: support non-file URIs
		}

		return !!expressionForRoot && typeof resourcePAthToMAtch === 'string' && !!expressionForRoot(resourcePAthToMAtch);
	}
}
