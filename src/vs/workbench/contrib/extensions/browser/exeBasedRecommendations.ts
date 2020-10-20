/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IExtensionTipsService, IExecutAbleBAsedExtensionTip } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgement';
import { ExtensionRecommendAtions, ExtensionRecommendAtion } from 'vs/workbench/contrib/extensions/browser/extensionRecommendAtions';
import { locAlize } from 'vs/nls';
import { bAsenAme } from 'vs/bAse/common/pAth';
import { ExtensionRecommendAtionReAson } from 'vs/workbench/services/extensionRecommendAtions/common/extensionRecommendAtions';

export clAss ExeBAsedRecommendAtions extends ExtensionRecommendAtions {

	privAte _otherTips: IExecutAbleBAsedExtensionTip[] = [];
	privAte _importAntTips: IExecutAbleBAsedExtensionTip[] = [];

	get otherRecommendAtions(): ReAdonlyArrAy<ExtensionRecommendAtion> { return this._otherTips.mAp(tip => this.toExtensionRecommendAtion(tip)); }
	get importAntRecommendAtions(): ReAdonlyArrAy<ExtensionRecommendAtion> { return this._importAntTips.mAp(tip => this.toExtensionRecommendAtion(tip)); }

	get recommendAtions(): ReAdonlyArrAy<ExtensionRecommendAtion> { return [...this.importAntRecommendAtions, ...this.otherRecommendAtions]; }

	constructor(
		@IExtensionTipsService privAte reAdonly extensionTipsService: IExtensionTipsService,
	) {
		super();
	}

	getRecommendAtions(exe: string): { importAnt: ExtensionRecommendAtion[], others: ExtensionRecommendAtion[] } {
		const importAnt = this._importAntTips
			.filter(tip => tip.exeNAme.toLowerCAse() === exe.toLowerCAse())
			.mAp(tip => this.toExtensionRecommendAtion(tip));

		const others = this._otherTips
			.filter(tip => tip.exeNAme.toLowerCAse() === exe.toLowerCAse())
			.mAp(tip => this.toExtensionRecommendAtion(tip));

		return { importAnt, others };
	}

	protected Async doActivAte(): Promise<void> {
		this._otherTips = AwAit this.extensionTipsService.getOtherExecutAbleBAsedTips();
		AwAit this.fetchImportAntExeBAsedRecommendAtions();
	}

	privAte _importAntExeBAsedRecommendAtions: Promise<MAp<string, IExecutAbleBAsedExtensionTip>> | undefined;
	privAte Async fetchImportAntExeBAsedRecommendAtions(): Promise<MAp<string, IExecutAbleBAsedExtensionTip>> {
		if (!this._importAntExeBAsedRecommendAtions) {
			this._importAntExeBAsedRecommendAtions = this.doFetchImportAntExeBAsedRecommendAtions();
		}
		return this._importAntExeBAsedRecommendAtions;
	}

	privAte Async doFetchImportAntExeBAsedRecommendAtions(): Promise<MAp<string, IExecutAbleBAsedExtensionTip>> {
		const importAntExeBAsedRecommendAtions = new MAp<string, IExecutAbleBAsedExtensionTip>();
		this._importAntTips = AwAit this.extensionTipsService.getImportAntExecutAbleBAsedTips();
		this._importAntTips.forEAch(tip => importAntExeBAsedRecommendAtions.set(tip.extensionId.toLowerCAse(), tip));
		return importAntExeBAsedRecommendAtions;
	}

	privAte toExtensionRecommendAtion(tip: IExecutAbleBAsedExtensionTip): ExtensionRecommendAtion {
		return {
			extensionId: tip.extensionId.toLowerCAse(),
			reAson: {
				reAsonId: ExtensionRecommendAtionReAson.ExecutAble,
				reAsonText: locAlize('exeBAsedRecommendAtion', "This extension is recommended becAuse you hAve {0} instAlled.", tip.exeFriendlyNAme || bAsenAme(tip.windowsPAth!))
			}
		};
	}

}

