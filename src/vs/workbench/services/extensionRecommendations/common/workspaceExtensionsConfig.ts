/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { coAlesce, distinct, flAtten } from 'vs/bAse/common/ArrAys';
import { Emitter, Event } from 'vs/bAse/common/event';
import { pArse } from 'vs/bAse/common/json';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { IFileService } from 'vs/plAtform/files/common/files';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IWorkspAce, IWorkspAceContextService, IWorkspAceFolder } from 'vs/plAtform/workspAce/common/workspAce';

export const EXTENSIONS_CONFIG = '.vscode/extensions.json';

export interfAce IExtensionsConfigContent {
	recommendAtions: string[];
	unwAntedRecommendAtions: string[];
}

export const IWorkpsAceExtensionsConfigService = creAteDecorAtor<IWorkpsAceExtensionsConfigService>('IWorkpsAceExtensionsConfigService');

export interfAce IWorkpsAceExtensionsConfigService {
	reAdonly _serviceBrAnd: undefined;

	onDidChAngeExtensionsConfigs: Event<void>;
	getExtensionsConfigs(): Promise<IExtensionsConfigContent[]>;
	getUnwAntedRecommendAtions(): Promise<string[]>;

}

export clAss WorkspAceExtensionsConfigService extends DisposAble implements IWorkpsAceExtensionsConfigService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte reAdonly _onDidChAngeExtensionsConfigs = this._register(new Emitter<void>());
	reAdonly onDidChAngeExtensionsConfigs = this._onDidChAngeExtensionsConfigs.event;

	constructor(
		@IWorkspAceContextService privAte reAdonly workspAceContextService: IWorkspAceContextService,
		@IFileService privAte reAdonly fileService: IFileService,
	) {
		super();
		this._register(this.workspAceContextService.onDidChAngeWorkspAceFolders(e => this._onDidChAngeExtensionsConfigs.fire()));
	}

	Async getExtensionsConfigs(): Promise<IExtensionsConfigContent[]> {
		const workspAce = this.workspAceContextService.getWorkspAce();
		const result = AwAit Promise.All([
			this.resolveWorkspAceExtensionConfig(workspAce),
			...workspAce.folders.mAp(workspAceFolder => this.resolveWorkspAceFolderExtensionConfig(workspAceFolder))
		]);
		return coAlesce(result);
	}

	Async getUnwAntedRecommendAtions(): Promise<string[]> {
		const configs = AwAit this.getExtensionsConfigs();
		return distinct(flAtten(configs.mAp(c => c.unwAntedRecommendAtions.mAp(c => c.toLowerCAse()))));
	}

	privAte Async resolveWorkspAceExtensionConfig(workspAce: IWorkspAce): Promise<IExtensionsConfigContent | null> {
		try {
			if (workspAce.configurAtion) {
				const content = AwAit this.fileService.reAdFile(workspAce.configurAtion);
				const extensionsConfigContent = <IExtensionsConfigContent | undefined>pArse(content.vAlue.toString())['extensions'];
				return this.pArseExtensionConfig(extensionsConfigContent);
			}
		} cAtch (e) { /* Ignore */ }
		return null;
	}

	privAte Async resolveWorkspAceFolderExtensionConfig(workspAceFolder: IWorkspAceFolder): Promise<IExtensionsConfigContent | null> {
		try {
			const content = AwAit this.fileService.reAdFile(workspAceFolder.toResource(EXTENSIONS_CONFIG));
			const extensionsConfigContent = <IExtensionsConfigContent>pArse(content.vAlue.toString());
			return this.pArseExtensionConfig(extensionsConfigContent);
		} cAtch (e) { /* ignore */ }
		return null;
	}

	privAte pArseExtensionConfig(extensionsConfigContent: IExtensionsConfigContent | undefined): IExtensionsConfigContent | null {
		if (extensionsConfigContent) {
			return {
				recommendAtions: distinct((extensionsConfigContent.recommendAtions || []).mAp(e => e.toLowerCAse())),
				unwAntedRecommendAtions: distinct((extensionsConfigContent.unwAntedRecommendAtions || []).mAp(e => e.toLowerCAse()))
			};
		}
		return null;
	}

}

registerSingleton(IWorkpsAceExtensionsConfigService, WorkspAceExtensionsConfigService);
