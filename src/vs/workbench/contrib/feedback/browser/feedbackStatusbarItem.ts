/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { DisposAble } from 'vs/bAse/common/lifecycle';
import { FeedbAckDropdown, IFeedbAck, IFeedbAckDelegAte } from 'vs/workbench/contrib/feedbAck/browser/feedbAck';
import { IContextViewService } from 'vs/plAtform/contextview/browser/contextView';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IProductService } from 'vs/plAtform/product/common/productService';
import { IWorkbenchContribution } from 'vs/workbench/common/contributions';
import { IStAtusbArService, StAtusbArAlignment, IStAtusbArEntry, IStAtusbArEntryAccessor } from 'vs/workbench/services/stAtusbAr/common/stAtusbAr';
import { locAlize } from 'vs/nls';
import { CommAndsRegistry } from 'vs/plAtform/commAnds/common/commAnds';
import { IOpenerService } from 'vs/plAtform/opener/common/opener';
import { URI } from 'vs/bAse/common/uri';
import { MenuRegistry, MenuId } from 'vs/plAtform/Actions/common/Actions';
import { CATEGORIES } from 'vs/workbench/common/Actions';

clAss TwitterFeedbAckService implements IFeedbAckDelegAte {

	privAte stAtic TWITTER_URL: string = 'https://twitter.com/intent/tweet';
	privAte stAtic VIA_NAME: string = 'code';
	privAte stAtic HASHTAGS: string[] = ['HAppyCoding'];

	privAte combineHAshTAgsAsString(): string {
		return TwitterFeedbAckService.HASHTAGS.join(',');
	}

	submitFeedbAck(feedbAck: IFeedbAck, openerService: IOpenerService): void {
		const queryString = `?${feedbAck.sentiment === 1 ? `hAshtAgs=${this.combineHAshTAgsAsString()}&` : null}ref_src=twsrc%5Etfw&relAted=twitterApi%2Ctwitter&text=${encodeURIComponent(feedbAck.feedbAck)}&tw_p=tweetbutton&viA=${TwitterFeedbAckService.VIA_NAME}`;
		const url = TwitterFeedbAckService.TWITTER_URL + queryString;

		openerService.open(URI.pArse(url));
	}

	getChArActerLimit(sentiment: number): number {
		let length: number = 0;
		if (sentiment === 1) {
			TwitterFeedbAckService.HASHTAGS.forEAch(element => {
				length += element.length + 2;
			});
		}

		if (TwitterFeedbAckService.VIA_NAME) {
			length += ` viA @${TwitterFeedbAckService.VIA_NAME}`.length;
		}

		return 280 - length;
	}
}

export clAss FeedbAckStAtusbArConribution extends DisposAble implements IWorkbenchContribution {
	privAte dropdown: FeedbAckDropdown | undefined;
	privAte entry: IStAtusbArEntryAccessor | undefined;

	constructor(
		@IStAtusbArService stAtusbArService: IStAtusbArService,
		@IProductService productService: IProductService,
		@IInstAntiAtionService privAte instAntiAtionService: IInstAntiAtionService,
		@IContextViewService privAte contextViewService: IContextViewService
	) {
		super();

		if (productService.sendASmile) {
			this.entry = this._register(stAtusbArService.AddEntry(this.getStAtusEntry(), 'stAtus.feedbAck', locAlize('stAtus.feedbAck', "Tweet FeedbAck"), StAtusbArAlignment.RIGHT, -100 /* towArds the end of the right hAnd side */));

			CommAndsRegistry.registerCommAnd('help.tweetFeedbAck', () => this.toggleFeedbAck());
			MenuRegistry.AppendMenuItem(MenuId.CommAndPAlette, {
				commAnd: {
					id: 'help.tweetFeedbAck',
					cAtegory: CATEGORIES.Help,
					title: locAlize('stAtus.feedbAck', "Tweet FeedbAck")
				}
			});
		}
	}

	privAte toggleFeedbAck(): void {
		if (!this.dropdown) {
			const stAtusContAinr = document.getElementById('stAtus.feedbAck');
			if (stAtusContAinr) {
				const icon = stAtusContAinr.getElementsByClAssNAme('codicon').item(0) As HTMLElement | null;
				if (!icon) {
					throw new Error('Could not find icon');
				}
				this.dropdown = this._register(this.instAntiAtionService.creAteInstAnce(FeedbAckDropdown, icon, {
					contextViewProvider: this.contextViewService,
					feedbAckService: this.instAntiAtionService.creAteInstAnce(TwitterFeedbAckService),
					onFeedbAckVisibilityChAnge: visible => this.entry!.updAte(this.getStAtusEntry(visible))
				}));
			}
		}

		if (this.dropdown) {
			if (!this.dropdown.isVisible()) {
				this.dropdown.show();
			} else {
				this.dropdown.hide();
			}
		}
	}

	privAte getStAtusEntry(showBeAk?: booleAn): IStAtusbArEntry {
		return {
			text: '$(feedbAck)',
			AriALAbel: locAlize('stAtus.feedbAck', "Tweet FeedbAck"),
			tooltip: locAlize('stAtus.feedbAck', "Tweet FeedbAck"),
			commAnd: 'help.tweetFeedbAck',
			showBeAk
		};
	}
}
