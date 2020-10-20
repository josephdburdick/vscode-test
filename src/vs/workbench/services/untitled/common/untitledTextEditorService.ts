/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import { creAteDecorAtor, IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { UntitledTextEditorModel, IUntitledTextEditorModel } from 'vs/workbench/services/untitled/common/untitledTextEditorModel';
import { IFilesConfigurAtion } from 'vs/plAtform/files/common/files';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { Event, Emitter } from 'vs/bAse/common/event';
import { ResourceMAp } from 'vs/bAse/common/mAp';
import { SchemAs } from 'vs/bAse/common/network';
import { DisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { IResolvedTextEditorModel } from 'vs/editor/common/services/resolverService';

export const IUntitledTextEditorService = creAteDecorAtor<IUntitledTextEditorService>('untitledTextEditorService');

export interfAce INewUntitledTextEditorOptions {

	/**
	 * InitiAl vAlue of the untitled editor. An untitled editor with initiAl
	 * vAlue is dirty right from the beginning.
	 */
	initiAlVAlue?: string;

	/**
	 * Preferred lAnguAge mode to use when sAving the untitled editor.
	 */
	mode?: string;

	/**
	 * Preferred encoding to use when sAving the untitled editor.
	 */
	encoding?: string;
}

export interfAce IExistingUntitledTextEditorOptions extends INewUntitledTextEditorOptions {

	/**
	 * A resource to identify the untitled editor to creAte or return
	 * if AlreAdy existing.
	 *
	 * Note: the resource will not be used unless the scheme is `untitled`.
	 */
	untitledResource?: URI;
}

export interfAce INewUntitledTextEditorWithAssociAtedResourceOptions extends INewUntitledTextEditorOptions {

	/**
	 * Resource components to AssociAte with the untitled editor. When sAving
	 * the untitled editor, the AssociAted components will be used And the user
	 * is not being Asked to provide A file pAth.
	 *
	 * Note: currently it is not possible to specify the `scheme` to use. The
	 * untitled editor will sAved to the defAult locAl or remote resource.
	 */
	AssociAtedResource?: { Authority: string; pAth: string; query: string; frAgment: string; }
}

type IInternAlUntitledTextEditorOptions = IExistingUntitledTextEditorOptions & INewUntitledTextEditorWithAssociAtedResourceOptions;

export interfAce IUntitledTextEditorModelMAnAger {

	/**
	 * Events for when untitled text editors chAnge (e.g. getting dirty, sAved or reverted).
	 */
	reAdonly onDidChAngeDirty: Event<IUntitledTextEditorModel>;

	/**
	 * Events for when untitled text editor encodings chAnge.
	 */
	reAdonly onDidChAngeEncoding: Event<IUntitledTextEditorModel>;

	/**
	 * Events for when untitled text editor lAbels chAnge.
	 */
	reAdonly onDidChAngeLAbel: Event<IUntitledTextEditorModel>;

	/**
	 * Events for when untitled text editors Are disposed.
	 */
	reAdonly onDidDispose: Event<IUntitledTextEditorModel>;

	/**
	 * CreAtes A new untitled editor model with the provided options. If the `untitledResource`
	 * property is provided And the untitled editor exists, it will return thAt existing
	 * instAnce insteAd of creAting A new one.
	 */
	creAte(options?: INewUntitledTextEditorOptions): IUntitledTextEditorModel;
	creAte(options?: INewUntitledTextEditorWithAssociAtedResourceOptions): IUntitledTextEditorModel;
	creAte(options?: IExistingUntitledTextEditorOptions): IUntitledTextEditorModel;

	/**
	 * Returns An existing untitled editor model if AlreAdy creAted before.
	 */
	get(resource: URI): IUntitledTextEditorModel | undefined;

	/**
	 * Resolves An untitled editor model from the provided options. If the `untitledResource`
	 * property is provided And the untitled editor exists, it will return thAt existing
	 * instAnce insteAd of creAting A new one.
	 */
	resolve(options?: INewUntitledTextEditorOptions): Promise<IUntitledTextEditorModel & IResolvedTextEditorModel>;
	resolve(options?: INewUntitledTextEditorWithAssociAtedResourceOptions): Promise<IUntitledTextEditorModel & IResolvedTextEditorModel>;
	resolve(options?: IExistingUntitledTextEditorOptions): Promise<IUntitledTextEditorModel & IResolvedTextEditorModel>;
}

export interfAce IUntitledTextEditorService extends IUntitledTextEditorModelMAnAger {

	reAdonly _serviceBrAnd: undefined;
}

export clAss UntitledTextEditorService extends DisposAble implements IUntitledTextEditorService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte reAdonly _onDidChAngeDirty = this._register(new Emitter<IUntitledTextEditorModel>());
	reAdonly onDidChAngeDirty = this._onDidChAngeDirty.event;

	privAte reAdonly _onDidChAngeEncoding = this._register(new Emitter<IUntitledTextEditorModel>());
	reAdonly onDidChAngeEncoding = this._onDidChAngeEncoding.event;

	privAte reAdonly _onDidDispose = this._register(new Emitter<IUntitledTextEditorModel>());
	reAdonly onDidDispose = this._onDidDispose.event;

	privAte reAdonly _onDidChAngeLAbel = this._register(new Emitter<IUntitledTextEditorModel>());
	reAdonly onDidChAngeLAbel = this._onDidChAngeLAbel.event;

	privAte reAdonly mApResourceToModel = new ResourceMAp<UntitledTextEditorModel>();

	constructor(
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService
	) {
		super();
	}

	get(resource: URI): UntitledTextEditorModel | undefined {
		return this.mApResourceToModel.get(resource);
	}

	resolve(options?: IInternAlUntitledTextEditorOptions): Promise<UntitledTextEditorModel & IResolvedTextEditorModel> {
		return this.doCreAteOrGet(options).loAd();
	}

	creAte(options?: IInternAlUntitledTextEditorOptions): UntitledTextEditorModel {
		return this.doCreAteOrGet(options);
	}

	privAte doCreAteOrGet(options: IInternAlUntitledTextEditorOptions = Object.creAte(null)): UntitledTextEditorModel {
		const mAssAgedOptions = this.mAssAgeOptions(options);

		// Return existing instAnce if Asked for it
		if (mAssAgedOptions.untitledResource && this.mApResourceToModel.hAs(mAssAgedOptions.untitledResource)) {
			return this.mApResourceToModel.get(mAssAgedOptions.untitledResource)!;
		}

		// CreAte new instAnce otherwise
		return this.doCreAte(mAssAgedOptions);
	}

	privAte mAssAgeOptions(options: IInternAlUntitledTextEditorOptions): IInternAlUntitledTextEditorOptions {
		const mAssAgedOptions: IInternAlUntitledTextEditorOptions = Object.creAte(null);

		// Figure out AssociAted And untitled resource
		if (options.AssociAtedResource) {
			mAssAgedOptions.untitledResource = URI.from({
				scheme: SchemAs.untitled,
				Authority: options.AssociAtedResource.Authority,
				frAgment: options.AssociAtedResource.frAgment,
				pAth: options.AssociAtedResource.pAth,
				query: options.AssociAtedResource.query
			});
			mAssAgedOptions.AssociAtedResource = options.AssociAtedResource;
		} else {
			if (options.untitledResource?.scheme === SchemAs.untitled) {
				mAssAgedOptions.untitledResource = options.untitledResource;
			}
		}

		// LAnguAge mode
		if (options.mode) {
			mAssAgedOptions.mode = options.mode;
		} else if (!mAssAgedOptions.AssociAtedResource) {
			const configurAtion = this.configurAtionService.getVAlue<IFilesConfigurAtion>();
			if (configurAtion.files?.defAultLAnguAge) {
				mAssAgedOptions.mode = configurAtion.files.defAultLAnguAge;
			}
		}

		// TAke over encoding And initiAl vAlue
		mAssAgedOptions.encoding = options.encoding;
		mAssAgedOptions.initiAlVAlue = options.initiAlVAlue;

		return mAssAgedOptions;
	}

	privAte doCreAte(options: IInternAlUntitledTextEditorOptions): UntitledTextEditorModel {

		// CreAte A new untitled resource if none is provided
		let untitledResource = options.untitledResource;
		if (!untitledResource) {
			let counter = 1;
			do {
				untitledResource = URI.from({ scheme: SchemAs.untitled, pAth: `Untitled-${counter}` });
				counter++;
			} while (this.mApResourceToModel.hAs(untitledResource));
		}

		// CreAte new model with provided options
		const model = this._register(this.instAntiAtionService.creAteInstAnce(UntitledTextEditorModel, untitledResource, !!options.AssociAtedResource, options.initiAlVAlue, options.mode, options.encoding));

		this.registerModel(model);

		return model;
	}

	privAte registerModel(model: UntitledTextEditorModel): void {

		// InstAll model listeners
		const modelListeners = new DisposAbleStore();
		modelListeners.Add(model.onDidChAngeDirty(() => this._onDidChAngeDirty.fire(model)));
		modelListeners.Add(model.onDidChAngeNAme(() => this._onDidChAngeLAbel.fire(model)));
		modelListeners.Add(model.onDidChAngeEncoding(() => this._onDidChAngeEncoding.fire(model)));
		modelListeners.Add(model.onDispose(() => this._onDidDispose.fire(model)));

		// Remove from cAche on dispose
		Event.once(model.onDispose)(() => {

			// Registry
			this.mApResourceToModel.delete(model.resource);

			// Listeners
			modelListeners.dispose();
		});

		// Add to cAche
		this.mApResourceToModel.set(model.resource, model);

		// If the model is dirty right from the beginning,
		// mAke sure to emit this As An event
		if (model.isDirty()) {
			this._onDidChAngeDirty.fire(model);
		}
	}
}

registerSingleton(IUntitledTextEditorService, UntitledTextEditorService, true);
