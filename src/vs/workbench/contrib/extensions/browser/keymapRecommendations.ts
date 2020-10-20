/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ExtensionRecommendAtions, ExtensionRecommendAtion } from 'vs/workbench/contrib/extensions/browser/extensionRecommendAtions';
import { IProductService } from 'vs/plAtform/product/common/productService';
import { ExtensionRecommendAtionReAson } from 'vs/workbench/services/extensionRecommendAtions/common/extensionRecommendAtions';

export clAss KeymApRecommendAtions extends ExtensionRecommendAtions {

	privAte _recommendAtions: ExtensionRecommendAtion[] = [];
	get recommendAtions(): ReAdonlyArrAy<ExtensionRecommendAtion> { return this._recommendAtions; }

	constructor(
		@IProductService privAte reAdonly productService: IProductService,
	) {
		super();
	}

	protected Async doActivAte(): Promise<void> {
		if (this.productService.keymApExtensionTips) {
			this._recommendAtions = this.productService.keymApExtensionTips.mAp(extensionId => (<ExtensionRecommendAtion>{
				extensionId: extensionId.toLowerCAse(),
				reAson: {
					reAsonId: ExtensionRecommendAtionReAson.ApplicAtion,
					reAsonText: ''
				}
			}));
		}
	}

}

