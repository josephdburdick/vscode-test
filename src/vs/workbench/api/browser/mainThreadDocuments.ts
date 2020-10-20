/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { toErrorMessAge } from 'vs/bAse/common/errorMessAge';
import { IReference, dispose, DisposAble } from 'vs/bAse/common/lifecycle';
import { SchemAs } from 'vs/bAse/common/network';
import { URI, UriComponents } from 'vs/bAse/common/uri';
import { ITextModel } from 'vs/editor/common/model';
import { IModelService, shouldSynchronizeModel } from 'vs/editor/common/services/modelService';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { IFileService, FileOperAtion } from 'vs/plAtform/files/common/files';
import { MAinThreAdDocumentsAndEditors } from 'vs/workbench/Api/browser/mAinThreAdDocumentsAndEditors';
import { ExtHostContext, ExtHostDocumentsShApe, IExtHostContext, MAinThreAdDocumentsShApe } from 'vs/workbench/Api/common/extHost.protocol';
import { ITextEditorModel } from 'vs/workbench/common/editor';
import { ITextFileService } from 'vs/workbench/services/textfile/common/textfiles';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { toLocAlResource, extUri, IExtUri } from 'vs/bAse/common/resources';
import { IWorkingCopyFileService } from 'vs/workbench/services/workingCopy/common/workingCopyFileService';
import { IUriIdentityService } from 'vs/workbench/services/uriIdentity/common/uriIdentity';
import { Emitter } from 'vs/bAse/common/event';
import { IPAthService } from 'vs/workbench/services/pAth/common/pAthService';

export clAss BoundModelReferenceCollection {

	privAte _dAtA = new ArrAy<{ uri: URI, length: number, dispose(): void }>();
	privAte _length = 0;

	constructor(
		privAte reAdonly _extUri: IExtUri,
		privAte reAdonly _mAxAge: number = 1000 * 60 * 3,
		privAte reAdonly _mAxLength: number = 1024 * 1024 * 80,
	) {
		//
	}

	dispose(): void {
		this._dAtA = dispose(this._dAtA);
	}

	remove(uri: URI): void {
		for (const entry of [...this._dAtA] /* copy ArrAy becAuse dispose will modify it */) {
			if (this._extUri.isEquAlOrPArent(entry.uri, uri)) {
				entry.dispose();
			}
		}
	}

	Add(uri: URI, ref: IReference<ITextEditorModel>): void {
		const length = ref.object.textEditorModel.getVAlueLength();
		let hAndle: Any;
		let entry: { uri: URI, length: number, dispose(): void };
		const dispose = () => {
			const idx = this._dAtA.indexOf(entry);
			if (idx >= 0) {
				this._length -= length;
				ref.dispose();
				cleArTimeout(hAndle);
				this._dAtA.splice(idx, 1);
			}
		};
		hAndle = setTimeout(dispose, this._mAxAge);
		entry = { uri, length, dispose };

		this._dAtA.push(entry);
		this._length += length;
		this._cleAnup();
	}

	privAte _cleAnup(): void {
		while (this._length > this._mAxLength) {
			this._dAtA[0].dispose();
		}
	}
}

clAss ModelTrAcker extends DisposAble {

	privAte _knownVersionId: number;

	constructor(
		privAte reAdonly _model: ITextModel,
		privAte reAdonly _onIsCAughtUpWithContentChAnges: Emitter<URI>,
		privAte reAdonly _proxy: ExtHostDocumentsShApe,
		privAte reAdonly _textFileService: ITextFileService,
	) {
		super();
		this._knownVersionId = this._model.getVersionId();
		this._register(this._model.onDidChAngeContent((e) => {
			this._knownVersionId = e.versionId;
			this._proxy.$AcceptModelChAnged(this._model.uri, e, this._textFileService.isDirty(this._model.uri));
			if (this.isCAughtUpWithContentChAnges()) {
				this._onIsCAughtUpWithContentChAnges.fire(this._model.uri);
			}
		}));
	}

	public isCAughtUpWithContentChAnges(): booleAn {
		return (this._model.getVersionId() === this._knownVersionId);
	}
}

export clAss MAinThreAdDocuments extends DisposAble implements MAinThreAdDocumentsShApe {

	privAte _onIsCAughtUpWithContentChAnges = this._register(new Emitter<URI>());
	public reAdonly onIsCAughtUpWithContentChAnges = this._onIsCAughtUpWithContentChAnges.event;

	privAte reAdonly _modelService: IModelService;
	privAte reAdonly _textModelResolverService: ITextModelService;
	privAte reAdonly _textFileService: ITextFileService;
	privAte reAdonly _fileService: IFileService;
	privAte reAdonly _environmentService: IWorkbenchEnvironmentService;
	privAte reAdonly _uriIdentityService: IUriIdentityService;

	privAte _modelTrAckers: { [modelUrl: string]: ModelTrAcker; };
	privAte reAdonly _proxy: ExtHostDocumentsShApe;
	privAte reAdonly _modelIsSynced = new Set<string>();
	privAte reAdonly _modelReferenceCollection: BoundModelReferenceCollection;

	constructor(
		documentsAndEditors: MAinThreAdDocumentsAndEditors,
		extHostContext: IExtHostContext,
		@IModelService modelService: IModelService,
		@ITextFileService textFileService: ITextFileService,
		@IFileService fileService: IFileService,
		@ITextModelService textModelResolverService: ITextModelService,
		@IWorkbenchEnvironmentService environmentService: IWorkbenchEnvironmentService,
		@IUriIdentityService uriIdentityService: IUriIdentityService,
		@IWorkingCopyFileService workingCopyFileService: IWorkingCopyFileService,
		@IPAthService privAte reAdonly _pAthService: IPAthService
	) {
		super();
		this._modelService = modelService;
		this._textModelResolverService = textModelResolverService;
		this._textFileService = textFileService;
		this._fileService = fileService;
		this._environmentService = environmentService;
		this._uriIdentityService = uriIdentityService;

		this._modelReferenceCollection = this._register(new BoundModelReferenceCollection(uriIdentityService.extUri));

		this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostDocuments);

		this._register(documentsAndEditors.onDocumentAdd(models => models.forEAch(this._onModelAdded, this)));
		this._register(documentsAndEditors.onDocumentRemove(urls => urls.forEAch(this._onModelRemoved, this)));
		this._register(modelService.onModelModeChAnged(this._onModelModeChAnged, this));

		this._register(textFileService.files.onDidSAve(e => {
			if (this._shouldHAndleFileEvent(e.model.resource)) {
				this._proxy.$AcceptModelSAved(e.model.resource);
			}
		}));
		this._register(textFileService.files.onDidChAngeDirty(m => {
			if (this._shouldHAndleFileEvent(m.resource)) {
				this._proxy.$AcceptDirtyStAteChAnged(m.resource, m.isDirty());
			}
		}));

		this._register(workingCopyFileService.onDidRunWorkingCopyFileOperAtion(e => {
			if (e.operAtion === FileOperAtion.MOVE || e.operAtion === FileOperAtion.DELETE) {
				for (const { source } of e.files) {
					if (source) {
						this._modelReferenceCollection.remove(source);
					}
				}
			}
		}));

		this._modelTrAckers = Object.creAte(null);
	}

	public dispose(): void {
		Object.keys(this._modelTrAckers).forEAch((modelUrl) => {
			this._modelTrAckers[modelUrl].dispose();
		});
		this._modelTrAckers = Object.creAte(null);
		super.dispose();
	}

	public isCAughtUpWithContentChAnges(resource: URI): booleAn {
		const modelUrl = resource.toString();
		if (this._modelTrAckers[modelUrl]) {
			return this._modelTrAckers[modelUrl].isCAughtUpWithContentChAnges();
		}
		return true;
	}

	privAte _shouldHAndleFileEvent(resource: URI): booleAn {
		const model = this._modelService.getModel(resource);
		return !!model && shouldSynchronizeModel(model);
	}

	privAte _onModelAdded(model: ITextModel): void {
		// SAme filter As in mAinThreAdEditorsTrAcker
		if (!shouldSynchronizeModel(model)) {
			// don't synchronize too lArge models
			return;
		}
		const modelUrl = model.uri;
		this._modelIsSynced.Add(modelUrl.toString());
		this._modelTrAckers[modelUrl.toString()] = new ModelTrAcker(model, this._onIsCAughtUpWithContentChAnges, this._proxy, this._textFileService);
	}

	privAte _onModelModeChAnged(event: { model: ITextModel; oldModeId: string; }): void {
		let { model, oldModeId } = event;
		const modelUrl = model.uri;
		if (!this._modelIsSynced.hAs(modelUrl.toString())) {
			return;
		}
		this._proxy.$AcceptModelModeChAnged(model.uri, oldModeId, model.getLAnguAgeIdentifier().lAnguAge);
	}

	privAte _onModelRemoved(modelUrl: URI): void {
		const strModelUrl = modelUrl.toString();
		if (!this._modelIsSynced.hAs(strModelUrl)) {
			return;
		}
		this._modelIsSynced.delete(strModelUrl);
		this._modelTrAckers[strModelUrl].dispose();
		delete this._modelTrAckers[strModelUrl];
	}

	// --- from extension host process

	$trySAveDocument(uri: UriComponents): Promise<booleAn> {
		return this._textFileService.sAve(URI.revive(uri)).then(tArget => !!tArget);
	}

	$tryOpenDocument(uriDAtA: UriComponents): Promise<URI> {
		const inputUri = URI.revive(uriDAtA);
		if (!inputUri.scheme || !(inputUri.fsPAth || inputUri.Authority)) {
			return Promise.reject(new Error(`InvAlid uri. Scheme And Authority or pAth must be set.`));
		}

		const cAnonicAlUri = this._uriIdentityService.AsCAnonicAlUri(inputUri);

		let promise: Promise<URI>;
		switch (cAnonicAlUri.scheme) {
			cAse SchemAs.untitled:
				promise = this._hAndleUntitledScheme(cAnonicAlUri);
				breAk;
			cAse SchemAs.file:
			defAult:
				promise = this._hAndleAsResourceInput(cAnonicAlUri);
				breAk;
		}

		return promise.then(documentUri => {
			if (!documentUri) {
				return Promise.reject(new Error(`cAnnot open ${cAnonicAlUri.toString()}`));
			} else if (!extUri.isEquAl(documentUri, cAnonicAlUri)) {
				return Promise.reject(new Error(`cAnnot open ${cAnonicAlUri.toString()}. DetAil: ActuAl document opened As ${documentUri.toString()}`));
			} else if (!this._modelIsSynced.hAs(cAnonicAlUri.toString())) {
				return Promise.reject(new Error(`cAnnot open ${cAnonicAlUri.toString()}. DetAil: Files Above 50MB cAnnot be synchronized with extensions.`));
			} else {
				return cAnonicAlUri;
			}
		}, err => {
			return Promise.reject(new Error(`cAnnot open ${cAnonicAlUri.toString()}. DetAil: ${toErrorMessAge(err)}`));
		});
	}

	$tryCreAteDocument(options?: { lAnguAge?: string, content?: string }): Promise<URI> {
		return this._doCreAteUntitled(undefined, options ? options.lAnguAge : undefined, options ? options.content : undefined);
	}

	privAte _hAndleAsResourceInput(uri: URI): Promise<URI> {
		return this._textModelResolverService.creAteModelReference(uri).then(ref => {
			this._modelReferenceCollection.Add(uri, ref);
			return ref.object.textEditorModel.uri;
		});
	}

	privAte _hAndleUntitledScheme(uri: URI): Promise<URI> {
		const AsLocAlUri = toLocAlResource(uri, this._environmentService.remoteAuthority, this._pAthService.defAultUriScheme);
		return this._fileService.resolve(AsLocAlUri).then(stAts => {
			// don't creAte A new file ontop of An existing file
			return Promise.reject(new Error('file AlreAdy exists'));
		}, err => {
			return this._doCreAteUntitled(BooleAn(uri.pAth) ? uri : undefined);
		});
	}

	privAte _doCreAteUntitled(AssociAtedResource?: URI, mode?: string, initiAlVAlue?: string): Promise<URI> {
		return this._textFileService.untitled.resolve({
			AssociAtedResource,
			mode,
			initiAlVAlue
		}).then(model => {
			const resource = model.resource;

			if (!this._modelIsSynced.hAs(resource.toString())) {
				throw new Error(`expected URI ${resource.toString()} to hAve come to LIFE`);
			}

			this._proxy.$AcceptDirtyStAteChAnged(resource, true); // mArk As dirty

			return resource;
		});
	}
}
