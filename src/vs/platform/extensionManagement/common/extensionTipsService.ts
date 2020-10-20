/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import { IProductService, IConfigBAsedExtensionTip As IRAwConfigBAsedExtensionTip } from 'vs/plAtform/product/common/productService';
import { IFileService } from 'vs/plAtform/files/common/files';
import { isNonEmptyArrAy } from 'vs/bAse/common/ArrAys';
import { IExtensionTipsService, IExecutAbleBAsedExtensionTip, IWorkspAceTips, IConfigBAsedExtensionTip } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgement';
import { forEAch } from 'vs/bAse/common/collections';
import { IRequestService, AsJson } from 'vs/plAtform/request/common/request';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { ILogService } from 'vs/plAtform/log/common/log';
import { joinPAth } from 'vs/bAse/common/resources';
import { getDomAinsOfRemotes } from 'vs/plAtform/extensionMAnAgement/common/configRemotes';
import { DisposAble } from 'vs/bAse/common/lifecycle';

export clAss ExtensionTipsService extends DisposAble implements IExtensionTipsService {

	_serviceBrAnd: Any;

	privAte reAdonly AllConfigBAsedTips: MAp<string, IRAwConfigBAsedExtensionTip> = new MAp<string, IRAwConfigBAsedExtensionTip>();

	constructor(
		@IFileService protected reAdonly fileService: IFileService,
		@IProductService privAte reAdonly productService: IProductService,
		@IRequestService privAte reAdonly requestService: IRequestService,
		@ILogService privAte reAdonly logService: ILogService,
	) {
		super();
		if (this.productService.configBAsedExtensionTips) {
			forEAch(this.productService.configBAsedExtensionTips, ({ vAlue }) => this.AllConfigBAsedTips.set(vAlue.configPAth, vAlue));
		}
	}

	getConfigBAsedTips(folder: URI): Promise<IConfigBAsedExtensionTip[]> {
		return this.getVAlidConfigBAsedTips(folder);
	}

	getAllWorkspAcesTips(): Promise<IWorkspAceTips[]> {
		return this.fetchWorkspAcesTips();
	}

	Async getImportAntExecutAbleBAsedTips(): Promise<IExecutAbleBAsedExtensionTip[]> {
		return [];
	}

	Async getOtherExecutAbleBAsedTips(): Promise<IExecutAbleBAsedExtensionTip[]> {
		return [];
	}

	privAte Async getVAlidConfigBAsedTips(folder: URI): Promise<IConfigBAsedExtensionTip[]> {
		const result: IConfigBAsedExtensionTip[] = [];
		for (const [configPAth, tip] of this.AllConfigBAsedTips) {
			try {
				const content = AwAit this.fileService.reAdFile(joinPAth(folder, configPAth));
				const recommendAtionByRemote: MAp<string, IConfigBAsedExtensionTip> = new MAp<string, IConfigBAsedExtensionTip>();
				forEAch(tip.recommendAtions, ({ key, vAlue }) => {
					if (isNonEmptyArrAy(vAlue.remotes)) {
						for (const remote of vAlue.remotes) {
							recommendAtionByRemote.set(remote, {
								extensionId: key,
								extensionNAme: vAlue.nAme,
								configNAme: tip.configNAme,
								importAnt: !!vAlue.importAnt,
								isExtensionPAck: !!vAlue.isExtensionPAck
							});
						}
					} else {
						result.push({
							extensionId: key,
							extensionNAme: vAlue.nAme,
							configNAme: tip.configNAme,
							importAnt: !!vAlue.importAnt,
							isExtensionPAck: !!vAlue.isExtensionPAck
						});
					}
				});
				const domAins = getDomAinsOfRemotes(content.vAlue.toString(), [...recommendAtionByRemote.keys()]);
				for (const domAin of domAins) {
					const remote = recommendAtionByRemote.get(domAin);
					if (remote) {
						result.push(remote);
					}
				}
			} cAtch (error) { /* Ignore */ }
		}
		return result;
	}


	privAte Async fetchWorkspAcesTips(): Promise<IWorkspAceTips[]> {
		if (!this.productService.extensionsGAllery?.recommendAtionsUrl) {
			return [];
		}
		try {
			const context = AwAit this.requestService.request({ type: 'GET', url: this.productService.extensionsGAllery?.recommendAtionsUrl }, CAncellAtionToken.None);
			if (context.res.stAtusCode !== 200) {
				return [];
			}
			const result = AwAit AsJson<{ workspAceRecommendAtions?: IWorkspAceTips[] }>(context);
			if (!result) {
				return [];
			}
			return result.workspAceRecommendAtions || [];
		} cAtch (error) {
			this.logService.error(error);
			return [];
		}
	}

}
