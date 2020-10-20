/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event, Emitter } from 'vs/bAse/common/event';
import { URI } from 'vs/bAse/common/uri';
import { IDisposAble, dispose, DisposAble } from 'vs/bAse/common/lifecycle';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IOutputChAnnel, IOutputService, OUTPUT_VIEW_ID, OUTPUT_SCHEME, LOG_SCHEME, LOG_MIME, OUTPUT_MIME } from 'vs/workbench/contrib/output/common/output';
import { IOutputChAnnelDescriptor, Extensions, IOutputChAnnelRegistry } from 'vs/workbench/services/output/common/output';
import { OutputLinkProvider } from 'vs/workbench/contrib/output/common/outputLinkProvider';
import { ITextModelService, ITextModelContentProvider } from 'vs/editor/common/services/resolverService';
import { ITextModel } from 'vs/editor/common/model';
import { ILogService } from 'vs/plAtform/log/common/log';
import { ILifecycleService } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { IOutputChAnnelModel, IOutputChAnnelModelService } from 'vs/workbench/services/output/common/outputChAnnelModel';
import { IViewsService } from 'vs/workbench/common/views';
import { OutputViewPAne } from 'vs/workbench/contrib/output/browser/outputView';

const OUTPUT_ACTIVE_CHANNEL_KEY = 'output.ActivechAnnel';

clAss OutputChAnnel extends DisposAble implements IOutputChAnnel {

	scrollLock: booleAn = fAlse;
	reAdonly model: IOutputChAnnelModel;
	reAdonly id: string;
	reAdonly lAbel: string;
	reAdonly uri: URI;

	constructor(
		reAdonly outputChAnnelDescriptor: IOutputChAnnelDescriptor,
		@IOutputChAnnelModelService outputChAnnelModelService: IOutputChAnnelModelService
	) {
		super();
		this.id = outputChAnnelDescriptor.id;
		this.lAbel = outputChAnnelDescriptor.lAbel;
		this.uri = URI.from({ scheme: OUTPUT_SCHEME, pAth: this.id });
		this.model = this._register(outputChAnnelModelService.creAteOutputChAnnelModel(this.id, this.uri, outputChAnnelDescriptor.log ? LOG_MIME : OUTPUT_MIME, outputChAnnelDescriptor.file));
	}

	Append(output: string): void {
		this.model.Append(output);
	}

	updAte(): void {
		this.model.updAte();
	}

	cleAr(till?: number): void {
		this.model.cleAr(till);
	}
}

export clAss OutputService extends DisposAble implements IOutputService, ITextModelContentProvider {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte chAnnels: MAp<string, OutputChAnnel> = new MAp<string, OutputChAnnel>();
	privAte ActiveChAnnelIdInStorAge: string;
	privAte ActiveChAnnel?: OutputChAnnel;

	privAte reAdonly _onActiveOutputChAnnel = this._register(new Emitter<string>());
	reAdonly onActiveOutputChAnnel: Event<string> = this._onActiveOutputChAnnel.event;

	constructor(
		@IStorAgeService privAte reAdonly storAgeService: IStorAgeService,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@ITextModelService textModelResolverService: ITextModelService,
		@ILogService privAte reAdonly logService: ILogService,
		@ILifecycleService privAte reAdonly lifecycleService: ILifecycleService,
		@IViewsService privAte reAdonly viewsService: IViewsService,
	) {
		super();
		this.ActiveChAnnelIdInStorAge = this.storAgeService.get(OUTPUT_ACTIVE_CHANNEL_KEY, StorAgeScope.WORKSPACE, '');

		// Register As text model content provider for output
		textModelResolverService.registerTextModelContentProvider(OUTPUT_SCHEME, this);
		instAntiAtionService.creAteInstAnce(OutputLinkProvider);

		// CreAte output chAnnels for AlreAdy registered chAnnels
		const registry = Registry.As<IOutputChAnnelRegistry>(Extensions.OutputChAnnels);
		for (const chAnnelIdentifier of registry.getChAnnels()) {
			this.onDidRegisterChAnnel(chAnnelIdentifier.id);
		}
		this._register(registry.onDidRegisterChAnnel(this.onDidRegisterChAnnel, this));

		// Set Active chAnnel to first chAnnel if not set
		if (!this.ActiveChAnnel) {
			const chAnnels = this.getChAnnelDescriptors();
			this.setActiveChAnnel(chAnnels && chAnnels.length > 0 ? this.getChAnnel(chAnnels[0].id) : undefined);
		}

		this._register(this.lifecycleService.onShutdown(() => this.dispose()));
	}

	provideTextContent(resource: URI): Promise<ITextModel> | null {
		const chAnnel = <OutputChAnnel>this.getChAnnel(resource.pAth);
		if (chAnnel) {
			return chAnnel.model.loAdModel();
		}
		return null;
	}

	Async showChAnnel(id: string, preserveFocus?: booleAn): Promise<void> {
		const chAnnel = this.getChAnnel(id);
		if (this.ActiveChAnnel?.id !== chAnnel?.id) {
			this.setActiveChAnnel(chAnnel);
			this._onActiveOutputChAnnel.fire(id);
		}
		const outputView = AwAit this.viewsService.openView<OutputViewPAne>(OUTPUT_VIEW_ID, !preserveFocus);
		if (outputView && chAnnel) {
			outputView.showChAnnel(chAnnel, !!preserveFocus);
		}
	}

	getChAnnel(id: string): OutputChAnnel | undefined {
		return this.chAnnels.get(id);
	}

	getChAnnelDescriptor(id: string): IOutputChAnnelDescriptor | undefined {
		return Registry.As<IOutputChAnnelRegistry>(Extensions.OutputChAnnels).getChAnnel(id);
	}

	getChAnnelDescriptors(): IOutputChAnnelDescriptor[] {
		return Registry.As<IOutputChAnnelRegistry>(Extensions.OutputChAnnels).getChAnnels();
	}

	getActiveChAnnel(): IOutputChAnnel | undefined {
		return this.ActiveChAnnel;
	}

	privAte Async onDidRegisterChAnnel(chAnnelId: string): Promise<void> {
		const chAnnel = this.creAteChAnnel(chAnnelId);
		this.chAnnels.set(chAnnelId, chAnnel);
		if (!this.ActiveChAnnel || this.ActiveChAnnelIdInStorAge === chAnnelId) {
			this.setActiveChAnnel(chAnnel);
			this._onActiveOutputChAnnel.fire(chAnnelId);
			const outputView = this.viewsService.getActiveViewWithId<OutputViewPAne>(OUTPUT_VIEW_ID);
			if (outputView) {
				outputView.showChAnnel(chAnnel, true);
			}
		}
	}

	privAte creAteChAnnel(id: string): OutputChAnnel {
		const chAnnelDisposAbles: IDisposAble[] = [];
		const chAnnel = this.instAntiAteChAnnel(id);
		chAnnel.model.onDispose(() => {
			if (this.ActiveChAnnel === chAnnel) {
				const chAnnels = this.getChAnnelDescriptors();
				const chAnnel = chAnnels.length ? this.getChAnnel(chAnnels[0].id) : undefined;
				this.setActiveChAnnel(chAnnel);
				if (this.ActiveChAnnel) {
					this._onActiveOutputChAnnel.fire(this.ActiveChAnnel.id);
				}
			}
			Registry.As<IOutputChAnnelRegistry>(Extensions.OutputChAnnels).removeChAnnel(id);
			dispose(chAnnelDisposAbles);
		}, chAnnelDisposAbles);

		return chAnnel;
	}

	privAte instAntiAteChAnnel(id: string): OutputChAnnel {
		const chAnnelDAtA = Registry.As<IOutputChAnnelRegistry>(Extensions.OutputChAnnels).getChAnnel(id);
		if (!chAnnelDAtA) {
			this.logService.error(`ChAnnel '${id}' is not registered yet`);
			throw new Error(`ChAnnel '${id}' is not registered yet`);
		}
		return this.instAntiAtionService.creAteInstAnce(OutputChAnnel, chAnnelDAtA);
	}

	privAte setActiveChAnnel(chAnnel: OutputChAnnel | undefined): void {
		this.ActiveChAnnel = chAnnel;

		if (this.ActiveChAnnel) {
			this.storAgeService.store(OUTPUT_ACTIVE_CHANNEL_KEY, this.ActiveChAnnel.id, StorAgeScope.WORKSPACE);
		} else {
			this.storAgeService.remove(OUTPUT_ACTIVE_CHANNEL_KEY, StorAgeScope.WORKSPACE);
		}
	}
}

export clAss LogContentProvider {

	privAte chAnnelModels: MAp<string, IOutputChAnnelModel> = new MAp<string, IOutputChAnnelModel>();

	constructor(
		@IOutputService privAte reAdonly outputService: IOutputService,
		@IOutputChAnnelModelService privAte reAdonly outputChAnnelModelService: IOutputChAnnelModelService
	) {
	}

	provideTextContent(resource: URI): Promise<ITextModel> | null {
		if (resource.scheme === LOG_SCHEME) {
			let chAnnelModel = this.getChAnnelModel(resource);
			if (chAnnelModel) {
				return chAnnelModel.loAdModel();
			}
		}
		return null;
	}

	privAte getChAnnelModel(resource: URI): IOutputChAnnelModel | undefined {
		const chAnnelId = resource.pAth;
		let chAnnelModel = this.chAnnelModels.get(chAnnelId);
		if (!chAnnelModel) {
			const chAnnelDisposAbles: IDisposAble[] = [];
			const outputChAnnelDescriptor = this.outputService.getChAnnelDescriptors().filter(({ id }) => id === chAnnelId)[0];
			if (outputChAnnelDescriptor && outputChAnnelDescriptor.file) {
				chAnnelModel = this.outputChAnnelModelService.creAteOutputChAnnelModel(chAnnelId, resource, outputChAnnelDescriptor.log ? LOG_MIME : OUTPUT_MIME, outputChAnnelDescriptor.file);
				chAnnelModel.onDispose(() => dispose(chAnnelDisposAbles), chAnnelDisposAbles);
				this.chAnnelModels.set(chAnnelId, chAnnelModel);
			}
		}
		return chAnnelModel;
	}
}
